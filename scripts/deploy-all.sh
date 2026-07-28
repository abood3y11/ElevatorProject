#!/usr/bin/env bash
# =============================================================================
# ELMS one-shot deploy — commit + push (backend + AdminPortal), then on the VPS:
# DB backup -> git pull -> docker build -> alembic migrate -> restart -> verify.
#
# Run from Git Bash on Windows (or any bash):
#   bash scripts/deploy-all.sh ["commit message"] [flags]
#
# Flags:
#   --backend-only     deploy only the backend (api + worker)
#   --frontend-only    deploy only the AdminPortal (web)
#   --no-backup        skip the VPS database backup
#   --no-commit        push already-made commits, don't `git add`/commit
#   -y | --yes         don't ask for confirmation (for CI / double-click)
#
# Reads the real procedure from docs/VPS_OPERATIONS_GUIDE.md (kept in sync here).
# =============================================================================
set -euo pipefail

# ---------- config ----------
VPS="root@92.113.31.218"
VPS_ROOT="/opt/elms"
BACKEND_REPO="$VPS_ROOT/server-ELMS"
CLIENT_REPO="$VPS_ROOT/client-ELMS"
BRANCH="main"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOCAL_BACKEND="$ROOT/backend"
LOCAL_ADMIN="$ROOT/AdminPortal"

# ---------- args ----------
MSG=""
DO_BACKEND=1
DO_FRONTEND=1
DO_BACKUP=1
DO_COMMIT=1
ASSUME_YES=0
for a in "$@"; do
  case "$a" in
    --backend-only)  DO_FRONTEND=0 ;;
    --frontend-only) DO_BACKEND=0 ;;
    --no-backup)     DO_BACKUP=0 ;;
    --no-commit)     DO_COMMIT=0 ;;
    -y|--yes)        ASSUME_YES=1 ;;
    --*|-*)          echo "Unknown flag: $a" >&2; exit 2 ;;
    *)               MSG="$a" ;;
  esac
done
[ -z "$MSG" ] && MSG="deploy: $(date '+%Y-%m-%d %H:%M')"

# ---------- pretty ----------
g(){ printf '\033[1;32m%s\033[0m\n' "$*"; }
y(){ printf '\033[1;33m%s\033[0m\n' "$*"; }
r(){ printf '\033[1;31m%s\033[0m\n' "$*"; }
step(){ printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
die(){ r "ERROR: $*"; exit 1; }

# Pause on ANY exit (success OR error) so the window never closes before you can
# read what happened — e.g. a failed SSH or a rejected push. The .ps1 wrapper
# sets ELMS_NO_PAUSE and does its own pause, so we skip here in that case.
_pause_on_exit(){
  local rc=$?
  if [ "${ELMS_NO_PAUSE:-0}" != "1" ] && [ -t 0 ]; then
    printf '\n\033[1;36mPress Enter to close...\033[0m'
    read -r _ </dev/tty || true
  fi
  return "$rc"
}
trap _pause_on_exit EXIT

# ---------- preflight ----------
command -v git >/dev/null || die "git not found"
command -v ssh >/dev/null || die "ssh not found"
command -v curl >/dev/null || die "curl not found"

step "ELMS deploy"
echo "  target : $VPS  ($VPS_ROOT)"
echo "  scope  : $([ $DO_BACKEND -eq 1 ] && echo -n 'backend ' )$([ $DO_FRONTEND -eq 1 ] && echo -n 'AdminPortal')"
echo "  branch : $BRANCH"
echo "  commit : $([ $DO_COMMIT -eq 1 ] && echo "\"$MSG\"" || echo 'skip (push existing)')"
echo "  backup : $([ $DO_BACKUP -eq 1 ] && echo yes || echo no)"
if [ "$ASSUME_YES" -ne 1 ]; then
  printf '\033[1;33mProceed with PRODUCTION deploy? [y/N] \033[0m'
  read -r ans || true
  case "$ans" in y|Y|yes|YES) ;; *) die "aborted" ;; esac
fi

# ---------- 1. local commit + push ----------
commit_and_push(){
  local dir="$1" name="$2"
  [ -d "$dir/.git" ] || die "$name repo not found at $dir"
  step "$name — commit & push"
  cd "$dir"
  local cur; cur="$(git rev-parse --abbrev-ref HEAD)"
  [ "$cur" = "$BRANCH" ] || y "  note: $name is on '$cur' (VPS pulls '$BRANCH')"
  if [ "$DO_COMMIT" -eq 1 ]; then
    git add -A
    if git diff --cached --quiet; then
      y "  nothing to commit"
    else
      git commit -m "$MSG"
      g "  committed"
    fi
  fi
  git push origin "$cur"
  g "  pushed $name -> origin/$cur"
}
step "STEP 1/3 — Push code"
[ "$DO_BACKEND" -eq 1 ]  && commit_and_push "$LOCAL_BACKEND" "backend"
[ "$DO_FRONTEND" -eq 1 ] && commit_and_push "$LOCAL_ADMIN"   "AdminPortal"

# ---------- 2. remote deploy ----------
step "STEP 2/3 — Deploy on VPS"
# A 1s pause before each remote step so you can follow the output as it streams.
RS="set -e; cd $VPS_ROOT;"
if [ "$DO_BACKUP" -eq 1 ]; then
  RS="$RS echo; echo '== [1] db backup =='; sleep 1; mkdir -p backups; docker exec elms-db pg_dump -U postgres elms_db > backups/elms_db_\$(date +%Y%m%d_%H%M%S).sql || echo 'backup failed (continuing)';"
fi
[ "$DO_BACKEND" -eq 1 ]  && RS="$RS echo; echo '== [2] pull backend =='; sleep 1; cd $BACKEND_REPO && git pull --ff-only origin $BRANCH;"
# The VPS client repo accumulates CRLF line-ending noise (Windows archive/edits)
# that blocks --ff-only, so stash it first (recoverable) — matches the manual fix.
[ "$DO_FRONTEND" -eq 1 ] && RS="$RS echo; echo '== [3] pull client =='; sleep 1; cd $CLIENT_REPO && { git stash push -u -m \"predeploy noise (auto)\" >/dev/null 2>&1 || true; }; git pull --ff-only origin $BRANCH;"
RS="$RS echo; echo '== [4] build =='; sleep 1; cd $VPS_ROOT; docker compose build"
[ "$DO_BACKEND" -eq 1 ]  && RS="$RS api worker"
[ "$DO_FRONTEND" -eq 1 ] && RS="$RS web"
RS="$RS;"
[ "$DO_BACKEND" -eq 1 ]  && RS="$RS echo; echo '== [5] migrate =='; sleep 1; docker compose run --rm api alembic upgrade head;"
RS="$RS echo; echo '== [6] restart =='; sleep 1; docker compose up -d redis"
[ "$DO_BACKEND" -eq 1 ]  && RS="$RS api worker"
[ "$DO_FRONTEND" -eq 1 ] && RS="$RS web"
# The API runs a contract catch-up scan on boot, which regularly takes longer
# than a flat sleep — a fixed 8s wait reported "api health FAILED" on a deploy
# that was completely fine. Poll instead, up to ~90s, and only call it failed
# when it never came up.
RS="$RS; echo; echo '== [7] status =='; docker compose ps; echo; echo '== [8] internal health =='; for i in \$(seq 1 30); do if curl -fsS http://127.0.0.1:8000/api/v1/health; then echo; echo \"(healthy after \${i} attempt(s))\"; break; fi; if [ \$i -eq 30 ]; then echo 'api did not become healthy within ~90s'; docker compose logs api --tail=40; exit 1; fi; sleep 3; done;"

# -tt keeps the remote output streaming live to your terminal.
ssh -tt "$VPS" "$RS" || die "remote deploy failed — check the output above (nothing restarted if the build/migrate step failed)"

# ---------- 3. verify public ----------
step "STEP 3/3 — Verify public endpoints"
if curl -fsS https://api.hensline.com/api/v1/health >/dev/null; then g "  api.hensline.com  OK"; else r "  api health FAILED"; fi
code="$(curl -o /dev/null -s -w '%{http_code}' -I https://admin.hensline.com/ || echo 000)"
if [ "$code" = "200" ] || [ "$code" = "301" ] || [ "$code" = "302" ]; then g "  admin.hensline.com  OK ($code)"; else r "  admin check returned $code"; fi

step "Done"
g "Deploy complete."
# (the EXIT trap keeps the window open)
