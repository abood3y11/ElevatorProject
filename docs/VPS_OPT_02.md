# VPS OPT 02 — the ELMS test server

Operating rules for the **second** server: a full ELMS stack running mock data,
used to try changes before they touch customers.

| | Production | **This box (vps_opt_02)** |
| --- | --- | --- |
| Host | `92.113.31.218` | `31.220.111.147` |
| Path | `/opt/elms` | `/opt/elms` (same layout on purpose) |
| Domains | `api.hensline.com` · `admin.hensline.com` | none — plain IP + port |
| TLS | nginx + Let's Encrypt | **none** |
| Data | real customers | **generated mock data only** |
| WhatsApp | live Meta credentials | **none — cannot send** |
| S3 | live bucket | **none — local storage** |
| `ENVIRONMENT` | `production` | `development` |
| `ALLOW_DEMO_SEED` | `false` | `true` |

Companion docs: [`VPS_OPERATIONS_GUIDE.md`](VPS_OPERATIONS_GUIDE.md) (production),
[`CODEX_WORKFLOW_PLAYBOOK.md`](CODEX_WORKFLOW_PLAYBOOK.md).

---

## 1. Hard rules

1. **No production secrets, ever.** Never copy production's `.env`, WhatsApp
   token, AWS keys, or database password onto this box. A test server holding a
   live WhatsApp token will message **real customers** the first time a job or a
   test click fires a template. The provisioning script leaves those variables
   empty, which disables sending — keep them empty.
2. **No production data.** Seed with the scripts in §5. If you ever need
   realistic volume, restore a dump **only after** scrubbing phone numbers and
   customer names — a test box has no TLS and open ports.
3. **Credentials never live in the repo.** Not in this file, not in any `.md`,
   not in a commit. Keep the root password in a password manager and prefer SSH
   keys. Anything pasted into chat, a screenshot, or a log is burned — rotate it
   from the provider dashboard (same rule as production).
4. **`ENVIRONMENT=development` is deliberate.** `config.validate_security()`
   refuses `ALLOW_DEMO_SEED=true` when `ENVIRONMENT` is
   `production|prod|staging|release`, and demo seeding creates privileged
   accounts. Set strong secrets anyway — the script does.
5. **Production is never deployed *from* here.** This box pulls the same
   branches; it does not push, and it is not a build artifact source.

---

## 2. Access

SSH key only. To authorise a new machine, append its public key to
`/root/.ssh/authorized_keys` (via the provider console, or `ssh-copy-id` from a
machine that already has password access):

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@31.220.111.147
ssh root@31.220.111.147
```

After the key works, disable password login:

```bash
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh
```

---

## 3. First-time provisioning

Everything is in [`scripts/provision-vps-02.sh`](../scripts/provision-vps-02.sh) —
idempotent, so re-running any step is safe.

```bash
scp scripts/provision-vps-02.sh root@31.220.111.147:/root/
ssh root@31.220.111.147 'bash /root/provision-vps-02.sh all'
```

Steps, in order:

| Step | What it does |
| --- | --- |
| `bootstrap` | apt packages, Docker, **2GB swap** (production once OOM-froze without one), `/opt/elms` |
| `keys` | generates two GitHub deploy keys and prints them |
| `clone` | clones `server-ELMS` + `client-ELMS` |
| `configure` | writes `.env` files and `docker-compose.yml` with **freshly generated** secrets |
| `up` | `docker compose build && up -d` |
| `migrate` | `alembic upgrade head` |
| `seed` | mock data (§5) |
| `verify` | container status + health + row counts |

**The one manual pause:** GitHub deploy keys. A deploy key can only be attached
to one repository, so the box needs two of them plus the `github-elms-client`
ssh host alias — the same arrangement production uses. `keys` prints both public
keys and the exact URLs to paste them into; then re-run from `clone`.

---

## 4. Day-to-day

Same shape as production, and the same trap: **the code and the schema deploy
separately.**

```bash
ssh root@31.220.111.147
cd /opt/elms/server-ELMS && git pull --ff-only
cd /opt/elms/client-ELMS && git pull origin main      # no upstream branch set
cd /opt/elms && docker compose build && docker compose up -d
```

Then **always**:

```bash
docker compose exec -T api alembic current   # compare with:
docker compose exec -T api alembic heads
docker compose exec -T api alembic upgrade head
```

> A `git pull` brings **every** commit on the branch, not just the one you were
> expecting. On 2026-08-02 that shipped two unrelated features to production
> whose migrations had never run: `column installation_projects.schema_version
> does not exist` 500'd *every work-order detail page*. The health endpoint
> still returned `healthy`, because it touches none of those tables. Checking
> `alembic current` against `heads` is the only reliable signal.

Logs and status:

```bash
cd /opt/elms
docker compose ps
docker compose logs api --tail=100
docker compose logs api --since 10m | grep -iE 'error|traceback|does not exist'
```

---

## 4a. Bringing up a FRESH database

This is the part that does not work the way it looks like it should.

**The initial migration is not a historical snapshot.** `00000000_initial`
materialises the *complete current* schema through
`Base.metadata.create_all(...)`. Replaying the rest of the chain on top of it
fails — `relation "ix_customer_call_logs_customer_type" already exists` — because
those migrations assume the older schema they were written against. So on a
fresh database:

```bash
cd /opt/elms
docker compose run --rm api alembic upgrade 00000000_initial   # build the schema
docker compose run --rm api alembic stamp head                 # record the history as applied
```

Use `run --rm`, not `exec`: the api container crash-loops until the schema
exists (it queries `contracts` during startup), so there is nothing to exec into.

**And verify no table is missing.** `create_all` only builds models that were
imported when it ran. A fresh box came up without `company_settings`,
`catalog_categories` and `distribution_templates`; the first settings read then
raised `UndefinedTable` *inside a swallowing `except`*, which left the
transaction aborted and made the entire work-orders list 500 with
`InFailedSqlTransaction` and no trace of the real cause. Always check:

```bash
docker compose run --rm api python -c "
import app.main
from app._shared.db.base import Base
from app._shared.db.session import engine
from sqlalchemy import inspect
missing = sorted(set(Base.metadata.tables) - set(inspect(engine).get_table_names()))
print('missing:', missing or 'none')
Base.metadata.create_all(bind=engine)"
```

---

## 5. Mock data

All seeds are idempotent — re-running tops up rather than duplicating.
**Order matters:** `seed_database` creates the admin user and the typed
technician teams that `seed_demo_data` refuses to proceed without.

```bash
cd /opt/elms
docker compose exec -T api python -m app.scripts.seed_database        # roles, users, technicians, TEAMS, customers, sites, elevators
docker compose exec -T api python -m app.scripts.seed_technician_data # worker-app technician accounts
docker compose exec -T api python -m app.scripts.seed_demo_data       # contracts, plans, visits, work orders
docker compose exec -T api python -m app.scripts.seed_finance_demo    # chart of accounts, cost centres, periods
```

Expected shape afterwards: ~8 customers, ~9 sites, ~27 elevators, 3 contracts,
~17 maintenance plans, ~146 visits, ~141 work orders, plus the finance ledger.

**`seed_demo_flow` must NOT be run here.** It guards itself against any database
whose host is not localhost, by design: *"This script deletes rows. It must never
be able to touch the VPS, staging, or any managed database."* Respect it — do not
route around the guard. Run it on a local dev machine instead.

Login for the seeded admin: **`admin@elevators.sa` / `admin123`** (the API takes
form-encoded `username`/`password`, OAuth2 style). Other seeded accounts use
`manager123` / `tech123`.

Check what landed:

```bash
docker compose exec -T db psql -U postgres -d elms_db -c "
  select relname as table, n_live_tup as rows
  from pg_stat_user_tables where n_live_tup > 0
  order by n_live_tup desc limit 30;"
```

To start completely clean:

```bash
cd /opt/elms
docker compose down -v          # drops the postgres volume — mock data only, safe here
docker compose up -d
docker compose exec -T api alembic upgrade head
bash /root/provision-vps-02.sh seed
```

---

## 6. Security

This box has **no TLS and no reverse proxy**. Ports are published so a browser
can reach it, which means anyone who finds the IP can too. Restrict it:

```bash
ufw allow OpenSSH
ufw allow from <your.ip.addr> to any port 8080 proto tcp
ufw allow from <your.ip.addr> to any port 8000 proto tcp
ufw enable
```

To keep it private instead, set `BIND_ADDR=127.0.0.1` before `configure` and
reach it over an SSH tunnel:

```bash
ssh -L 8080:127.0.0.1:8080 -L 8000:127.0.0.1:8000 root@31.220.111.147
```

Demo seeding creates privileged accounts with known passwords. That is fine on
mock data behind a firewall, and unacceptable anywhere else — which is exactly
why rule 1 exists.

---

## 7. Backup / restore

The data is disposable, so backups matter less than on production — but a dump
before a risky migration test still saves time:

```bash
docker exec elms-db pg_dump -U postgres elms_db > /opt/elms/backups/test_$(date +%Y%m%d_%H%M%S).sql
cat /opt/elms/backups/<file>.sql | docker exec -i elms-db psql -U postgres -d elms_db
```

---

## 8. Checklist before trusting a test result

- [ ] `alembic current` == `alembic heads`
- [ ] `docker compose ps` shows db, redis, api, worker, web all `Up`
- [ ] `/api/v1/health` returns `healthy` **and** `redis.healthy: true`
- [ ] the specific screen actually opens (health proves almost nothing)
- [ ] `docker compose logs api --since 10m | grep -i error` is quiet
- [ ] the box is running the commit you think it is: `git -C /opt/elms/server-ELMS log --oneline -1`
