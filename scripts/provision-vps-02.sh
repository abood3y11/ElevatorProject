#!/usr/bin/env bash
# =============================================================================
# provision-vps-02.sh — stand up the ELMS TEST server (vps_opt_02) from scratch
# =============================================================================
# Mirrors the production layout (/opt/elms with server-ELMS + client-ELMS +
# docker-compose.yml) so anything learned on one box transfers to the other,
# but it is deliberately NOT production:
#
#   * its own generated database password and JWT secret — production secrets
#     are never copied here,
#   * NO WhatsApp credentials, so the test box can never message a real
#     customer (the single most expensive mistake a staging clone can make),
#   * ALLOW_DEMO_SEED=true, which the config layer refuses in a
#     production-like ENVIRONMENT — hence ENVIRONMENT=development.
#
# Idempotent: every step checks before it writes, so re-running is safe.
#
# Usage (on the server, as root):
#   bash provision-vps-02.sh all
#   bash provision-vps-02.sh <step>     # bootstrap|keys|clone|configure|up|migrate|seed|verify
#
# Full rules and rationale: docs/VPS_OPT_02.md
set -euo pipefail

ELMS_ROOT="${ELMS_ROOT:-/opt/elms}"
SERVER_REPO="${SERVER_REPO:-git@github.com:abood3y11/server-ELMS.git}"
CLIENT_REPO_HOST="${CLIENT_REPO_HOST:-github-elms-client}"
CLIENT_REPO="${CLIENT_REPO:-git@${CLIENT_REPO_HOST}:abood3y11/ELMS.git}"
PUBLIC_HOST="${PUBLIC_HOST:-$(hostname -I 2>/dev/null | awk '{print $1}')}"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-8080}"
# Bind address for the published ports. Production binds 127.0.0.1 and fronts
# everything with nginx+TLS; a test box normally needs to be reachable from a
# browser, so this defaults to all interfaces. Lock it down with a firewall —
# see docs/VPS_OPT_02.md §Security.
BIND_ADDR="${BIND_ADDR:-0.0.0.0}"

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mXX  %s\033[0m\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------------------
step_bootstrap() {
  log "Bootstrap: packages + docker"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq curl git ca-certificates ufw jq >/dev/null

  if ! command -v docker >/dev/null 2>&1; then
    log "Installing Docker"
    curl -fsSL https://get.docker.com | sh
  fi
  docker compose version >/dev/null 2>&1 || die "docker compose plugin missing"

  # 2GB swap — the production box froze under an OOM without one (see
  # docs/VPS_OPERATIONS_GUIDE.md); a build on a small VPS is the usual trigger.
  if ! swapon --show | grep -q .; then
    log "Adding 2GB swap"
    fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi

  mkdir -p "$ELMS_ROOT" "$ELMS_ROOT/backups"
  log "Bootstrap done. docker=$(docker --version | awk '{print $3}' | tr -d ,)"
}

# ---------------------------------------------------------------------------
step_keys() {
  log "GitHub deploy keys"
  # A GitHub deploy key may only be attached to ONE repository, so the two repos
  # need two keys plus an ssh host alias — the same trick production uses.
  mkdir -p /root/.ssh && chmod 700 /root/.ssh
  [ -f /root/.ssh/id_ed25519_elms_server ] || \
    ssh-keygen -t ed25519 -N '' -C 'elms-vps02-server' -f /root/.ssh/id_ed25519_elms_server >/dev/null
  [ -f /root/.ssh/id_ed25519_elms_client ] || \
    ssh-keygen -t ed25519 -N '' -C 'elms-vps02-client' -f /root/.ssh/id_ed25519_elms_client >/dev/null

  if ! grep -q "Host ${CLIENT_REPO_HOST}" /root/.ssh/config 2>/dev/null; then
    cat >> /root/.ssh/config <<EOF

Host github.com
  User git
  IdentityFile /root/.ssh/id_ed25519_elms_server
  IdentitiesOnly yes

Host ${CLIENT_REPO_HOST}
  HostName github.com
  User git
  IdentityFile /root/.ssh/id_ed25519_elms_client
  IdentitiesOnly yes
EOF
    chmod 600 /root/.ssh/config
  fi
  ssh-keyscan -t ed25519 github.com >> /root/.ssh/known_hosts 2>/dev/null
  sort -u /root/.ssh/known_hosts -o /root/.ssh/known_hosts

  cat <<EOF

Add these as DEPLOY KEYS on GitHub (read-only is enough):

  server-ELMS  ->  https://github.com/abood3y11/server-ELMS/settings/keys/new
$(cat /root/.ssh/id_ed25519_elms_server.pub)

  ELMS (AdminPortal)  ->  https://github.com/abood3y11/ELMS/settings/keys/new
$(cat /root/.ssh/id_ed25519_elms_client.pub)

Then re-run:  bash $0 clone
EOF
}

# ---------------------------------------------------------------------------
step_clone() {
  log "Cloning repositories"
  cd "$ELMS_ROOT"
  if [ -d server-ELMS/.git ]; then
    git -C server-ELMS pull --ff-only
  else
    git clone "$SERVER_REPO" server-ELMS || die "server-ELMS clone failed — add the deploy key (bash $0 keys)"
  fi
  if [ -d client-ELMS/.git ]; then
    # The client repo has historically had no upstream tracking branch, so name
    # the remote and branch explicitly rather than relying on `git pull`.
    git -C client-ELMS pull origin main
  else
    git clone "$CLIENT_REPO" client-ELMS || die "client-ELMS clone failed — add the deploy key (bash $0 keys)"
  fi
  log "server-ELMS @ $(git -C server-ELMS log --oneline -1)"
  log "client-ELMS @ $(git -C client-ELMS log --oneline -1)"
}

# ---------------------------------------------------------------------------
step_configure() {
  log "Writing configuration"
  cd "$ELMS_ROOT"

  if [ ! -f .db_password ]; then
    openssl rand -hex 24 > .db_password
    chmod 600 .db_password
  fi
  DB_PASSWORD="$(cat .db_password)"

  if [ ! -f server-ELMS/.env ]; then
    JWT="$(openssl rand -hex 32)"
    cat > server-ELMS/.env <<EOF
# ELMS TEST server (vps_opt_02) — generated by provision-vps-02.sh
# NEVER copy production credentials into this file. See docs/VPS_OPT_02.md.

# 'development' on purpose: ALLOW_DEMO_SEED is rejected by config.validate_security
# in a production-like ENVIRONMENT (production|prod|staging|release).
ENVIRONMENT=development
DEBUG=False
ALLOW_DEMO_SEED=true

DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@db:5432/elms_db
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=elms_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${DB_PASSWORD}

JWT_SECRET_KEY=${JWT}
SECRET_KEY=${JWT}

REDIS_ENABLED=true
REDIS_URL=redis://redis:6379/0

CORS_ORIGINS=http://${PUBLIC_HOST}:${WEB_PORT},http://localhost:5173

# --- Integrations deliberately EMPTY -------------------------------------
# A test box with production WhatsApp credentials would message REAL customers.
# Leaving these unset disables sending; attachments fall back to local storage.
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
EOF
    chmod 600 server-ELMS/.env
    log "Wrote server-ELMS/.env (fresh secrets, no integrations)"
  else
    warn "server-ELMS/.env already exists — left untouched"
  fi

  if [ ! -f client-ELMS/.env ]; then
    cat > client-ELMS/.env <<EOF
VITE_API_BASE_URL=http://${PUBLIC_HOST}:${API_PORT}/api/v1
VITE_SERVER_API_BASE_URL=http://${PUBLIC_HOST}:${API_PORT}/api/v1
VITE_DEV_MODE=false
EOF
    log "Wrote client-ELMS/.env -> API at http://${PUBLIC_HOST}:${API_PORT}"
  else
    warn "client-ELMS/.env already exists — left untouched"
  fi

  if [ ! -f docker-compose.yml ]; then
    cat > docker-compose.yml <<EOF
services:
  db:
    image: postgres:17
    container_name: elms-db
    environment:
      POSTGRES_DB: elms_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - elms_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d elms_db"]
      interval: 5s
      timeout: 5s
      retries: 20
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: elms-redis
    command: redis-server --appendonly yes
    volumes:
      - elms_redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 20
    restart: unless-stopped

  api:
    build: ./server-ELMS
    container_name: elms-backend
    env_file:
      - ./server-ELMS/.env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "${BIND_ADDR}:${API_PORT}:8000"
    restart: unless-stopped

  worker:
    build: ./server-ELMS
    container_name: elms-worker
    env_file:
      - ./server-ELMS/.env
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: python -m app._shared.workers.redis_worker
    restart: unless-stopped

  web:
    build: ./client-ELMS
    container_name: elms-frontend
    depends_on:
      - api
    ports:
      - "${BIND_ADDR}:${WEB_PORT}:80"
    restart: unless-stopped

volumes:
  elms_pgdata:
  elms_redisdata:
EOF
    log "Wrote docker-compose.yml"
  else
    warn "docker-compose.yml already exists — left untouched"
  fi
}

# ---------------------------------------------------------------------------
step_up() {
  log "Building and starting"
  cd "$ELMS_ROOT"
  docker compose build
  docker compose up -d
  docker compose ps
}

# ---------------------------------------------------------------------------
step_migrate() {
  log "Applying migrations"
  cd "$ELMS_ROOT"
  for _ in $(seq 1 30); do
    docker compose exec -T db pg_isready -U postgres -d elms_db >/dev/null 2>&1 && break
    sleep 2
  done

  # `run --rm`, never `exec`: the api container crash-loops until the schema
  # exists (it queries contracts on startup), so there is nothing to exec into.
  local current
  current="$(docker compose run --rm api alembic current 2>/dev/null | tail -1 | awk '{print $1}')"

  if [ -z "$current" ]; then
    # FRESH DATABASE. The initial migration materialises the COMPLETE CURRENT
    # schema via Base.metadata.create_all — it is not a historical snapshot. So
    # replaying the chain on top of it fails ("relation ... already exists");
    # the rest of the history has to be stamped, not run.
    log "Fresh database — creating the schema, then stamping the history"
    docker compose run --rm api alembic upgrade 00000000_initial
    docker compose run --rm api alembic stamp head
    # create_all can only build models that were imported. Belt-and-braces: run
    # it again with the whole app loaded so nothing is silently missing.
    docker compose run --rm api python -c "
import app.main
from app._shared.db.base import Base
from app._shared.db.session import engine
Base.metadata.create_all(bind=engine)
print('schema reconciled')"
  else
    docker compose run --rm api alembic upgrade head
  fi

  log "current: $(docker compose run --rm api alembic current 2>/dev/null | tail -1)"
  log "heads  : $(docker compose run --rm api alembic heads 2>/dev/null | tail -1)"
}

# ---------------------------------------------------------------------------
step_seed() {
  log "Seeding mock data"
  cd "$ELMS_ROOT"
  # Order matters: base entities first, then the funnel/finance layers that
  # reference them. Every script is idempotent, so re-running only tops up.
  # seed_database MUST run first: it creates the admin user and the typed
  # technician teams that seed_demo_data refuses to proceed without.
  # seed_demo_flow is intentionally absent — it guards itself against any
  # non-localhost database and must not be run on a VPS.
  docker compose exec -T api python -m app.scripts.seed_database        || warn "seed_database failed"
  docker compose exec -T api python -m app.scripts.seed_technician_data || warn "seed_technician_data failed"
  docker compose exec -T api python -m app.scripts.seed_demo_data       || warn "seed_demo_data failed"
  docker compose exec -T api python -m app.scripts.seed_finance_demo    || warn "seed_finance_demo failed"
  log "Row counts:"
  docker compose exec -T db psql -U postgres -d elms_db -c "
    select relname as table, n_live_tup as rows
    from pg_stat_user_tables where n_live_tup > 0
    order by n_live_tup desc limit 25;"
}

# ---------------------------------------------------------------------------
step_verify() {
  log "Verifying"
  cd "$ELMS_ROOT"
  docker compose ps --format '{{.Name}}\t{{.Status}}'
  echo
  curl -fsS "http://127.0.0.1:${API_PORT}/api/v1/health" && echo
  curl -o /dev/null -s -w "web  -> %{http_code}\n" "http://127.0.0.1:${WEB_PORT}"
  echo
  echo "API : http://${PUBLIC_HOST}:${API_PORT}/api/v1/health"
  echo "Admin: http://${PUBLIC_HOST}:${WEB_PORT}"
}

# ---------------------------------------------------------------------------
case "${1:-all}" in
  bootstrap) step_bootstrap ;;
  keys)      step_keys ;;
  clone)     step_clone ;;
  configure) step_configure ;;
  up)        step_up ;;
  migrate)   step_migrate ;;
  seed)      step_seed ;;
  verify)    step_verify ;;
  all)
    step_bootstrap
    step_keys
    if step_clone; then
      step_configure && step_up && step_migrate && step_seed && step_verify
    else
      die "Add the deploy keys printed above, then run: bash $0 clone && bash $0 configure && bash $0 up && bash $0 migrate && bash $0 seed && bash $0 verify"
    fi
    ;;
  *) die "unknown step '$1' (bootstrap|keys|clone|configure|up|migrate|seed|verify|all)" ;;
esac
