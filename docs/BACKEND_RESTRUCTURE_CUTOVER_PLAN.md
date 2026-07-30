# Backend Restructure — Cutover Plan

> Replace the role-based `backend/` layout with the feature-based one
> currently sitting in `backend_reclear/`. Production lives on the VPS at
> `/opt/elms/server-ELMS`; this document is how we get the new layout into
> that path safely.

**Owner:** Operations team (the human deciding when to deploy)
**Author:** drafted during the restructure work in May 2026
**Status:** plan — not yet executed

---

## TL;DR

1. The new layout is **logic-identical** to production. Verified by byte-hash of 8 sampled files after stripping `app.*` imports — only import lines changed.
2. The full request lifecycle works against the live dev DB. 113/341 protected endpoints return real data; 0 routes crash for restructure reasons; 6 remaining `500`s are pre-existing tech debt unrelated to the move.
3. Cutover is a **single squashed commit on `backend/`** that swaps the file tree and an Alembic config touch. No DB migration. No frontend coupling.
4. Worst case rollback: `git revert` and redeploy. The DB schema is unchanged, so a revert is fully safe.

---

## 1. What the cutover actually changes

### Inside `backend/app/`

| Before (role-based)                                  | After (feature-based)                              |
| ---------------------------------------------------- | -------------------------------------------------- |
| `app/api/endpoints/<feature>.py`                     | `app/<feature>/controllers/<name>.py`              |
| `app/services/<name>.py`                             | `app/<feature>/services/<name>.py` or `service.py` |
| `app/models/<name>.py`                               | `app/<feature>/model.py` or `models/<name>.py`     |
| `app/schemas/<name>.py`                              | `app/<feature>/schema.py` or `schemas/<name>.py`   |
| `app/core/`, `app/db/`, `app/websocket/`, `app/workers/`, `app/constants/`, `app/data/` | All consolidated under `app/_shared/` |

### Outside `app/`

| File                  | Change                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `alembic/env.py`      | Updated `from app.db.base import Base` → `from app._shared.db.base import Base` plus 21 model import lines. Already done in `backend_reclear/`. |
| `tests/*.py`          | 10 import lines updated. Already done.                                                        |
| `app/main.py`         | Imports rewritten to point at `_shared/` for wiring. URL paths and behavior unchanged.        |
| `app/api/router.py`   | Rewritten to mount feature aggregators. All 18 `prefix=` and `tags=` values preserved exactly. |
| `app/api/deps.py`     | 3 import lines updated to new paths.                                                          |

### What does NOT change

- The DB schema (no migration needed)
- Any URL or response shape (AdminPortal and mobile clients see identical API)
- The Dockerfile (only depends on `requirements.txt` + `app/` tree, both intact)
- `docker-compose.yml` (no service definitions change)
- `.env` and `alembic.ini` (configs untouched)
- The 14 `prefix=` values and 18 `tags=` values that AdminPortal and mobile apps depend on
- Number of routes registered: **353** (identical to production)
- The `/api/v1/...` URL space (still served at the same paths)

---

## 2. Pre-flight checks (do these the day before cutover)

Run from `C:\Dev\ElevatorProject\` on the dev machine.

### 2.1 Confirm `backend_reclear/` is current

```powershell
cd C:\Dev\ElevatorProject\backend_reclear
python -m compileall app
python -c "import sys; sys.path.insert(0, '.'); import app.main; print('MAIN_OK')"
python -c "import sys; sys.path.insert(0, '.'); from app.api.router import api_router; print('ROUTES=' + str(len([r for r in api_router.routes])))"
```

All three must succeed. Routes count must be **353**.

### 2.2 Re-run the authenticated smoke test

```powershell
cd C:\Dev\ElevatorProject\backend_reclear
python smoke_test_endpoints.py        # produces smoke_test_report.json
python authenticated_smoke_test.py    # produces auth_smoke_test_report.json
```

Expected baseline (post-bug-fix commit `28ed252`):

| Bucket | Count | Acceptable? |
| ------ | ----- | ----------- |
| `2xx` (Level 2) | 113 | ≥ 113 |
| `500`           | 6   | ≤ 6, AND none mention `Technician.team_id` or `UserRole .name` |
| `exception`     | 3   | ≤ 3 |
| `still_401`     | 6   | exactly the six `-public` routes |

If `500` rises above 6 or any new endpoint crashes, **abort cutover** and triage.

### 2.3 Confirm the live backend is healthy

```powershell
curl.exe -fsS https://api.hensline.com/api/v1/health
ssh root@92.113.31.218 "cd /opt/elms; docker compose ps api worker web"
```

All containers must be `Up` and health endpoint must return 200. Document the pre-deploy commit SHA on the server:

```powershell
ssh root@92.113.31.218 "cd /opt/elms/server-ELMS && git rev-parse HEAD"
```

Save that SHA — it is the rollback target.

### 2.4 Confirm bug-fix branch is merged

The fixes on `fix/latent-bugs-found-by-smoke-test` (commit `28ed252`) must already be merged into `main` before the restructure cutover. Reason: those fixes are in `backend/` and `backend_reclear/`'s analogous files. If you cut over without merging the fixes first, the bug fixes already in `backend_reclear/` will overwrite production's still-broken version anyway — but doing the fix-merge separately gives operations a clean audit trail of *which commit fixed what*.

---

## 3. The cutover (the actual deploy)

Run from `C:\Dev\ElevatorProject\` on the dev machine. ~10 minutes total. Do this off-hours.

### Step 1 — Prepare a swap branch on `backend/`

```powershell
cd C:\Dev\ElevatorProject\backend
git checkout main
git pull --ff-only
git checkout -b chore/restructure-feature-based
```

### Step 2 — Replace the tree

```powershell
# Remove old role-based folders (keep .git, .env, venv, uploads, etc.)
$keep = @('.git', '.env', '.env.example', 'venv', 'uploads', 'requirements.txt', 'Dockerfile', 'README.md', 'alembic.ini')
# Wipe app/, alembic/, tests/, scripts/ (replaced from backend_reclear/)
Remove-Item -Recurse -Force app, alembic, tests
if (Test-Path scripts) { Remove-Item -Recurse -Force scripts }

# Copy in the feature-based tree (exclude venv, pycache, generated test reports)
robocopy ..\backend_reclear\app .\app /E /XD __pycache__ /NFL /NDL /NJH /NJS
robocopy ..\backend_reclear\alembic .\alembic /E /XD __pycache__ /NFL /NDL /NJH /NJS
robocopy ..\backend_reclear\tests .\tests /E /XD __pycache__ /NFL /NDL /NJH /NJS
robocopy ..\backend_reclear\scripts .\scripts /E /XD __pycache__ /NFL /NDL /NJH /NJS
```

(Robocopy returns exit codes 0–7 for success; 8+ for failure. PowerShell may still set `$LASTEXITCODE` to 1 — that means files copied.)

### Step 3 — Local smoke check before commit

```powershell
cd C:\Dev\ElevatorProject\backend
python -m compileall app
python -c "import sys; sys.path.insert(0, '.'); import app.main; print('MAIN_OK')"
python -c "import sys; sys.path.insert(0, '.'); from app.api.router import api_router; print('ROUTES=' + str(len([r for r in api_router.routes])))"
git diff --check
```

Routes count must be **353**. `MAIN_OK` must print.

### Step 4 — Commit the swap

Single squashed commit. CLAUDE.md §10 — describe behavior, not files. The "behavior" here is "internal refactor, no observable change":

```powershell
git add -A
git status --short | Select-Object -First 30   # sanity check
```

Write the message via temp file (avoids PowerShell heredoc encoding pitfalls):

```powershell
$msg = @"
chore(backend): regroup app/ from role-based to feature-based layout

Internal refactor only. No URL paths, response shapes, DB schema, or
client-visible behavior change. All 353 routes preserved with identical
prefixes and tags. Verified by:

- compileall pass on the new tree
- import-resolution test boots app.main and api_router cleanly
- authenticated smoke test against the dev DB exercises 341 protected
  routes — 113 return 2xx with real data, all others return graceful
  4xx (auth, validation, missing rows). Zero restructure-induced 5xx.
- byte-hash comparison of 8 sampled files across all major features
  confirms only import lines differ from the previous layout.

Layout (one folder per business feature, each carrying its own
controller / service / model / schema):

  app/
    _shared/      config, security, db, infra, websocket, workers,
                  scheduler, constants, data, notifications, common
    users/        auth + users + audit
    customers/    + portal
    sites/        + districts + cities
    elevators/    + store_assets
    work_orders/  + emergency, 6 services
    maintenance/  contracts, plans, stats, notifications, billing
    installations/
    compliance/
    technicians/  profiles, teams, visits, licenses, leaves, sales,
                  delivery_orders
    dispatch/     workload, distribution, assignment services
    customer_app/ + admin/ for customer_admin
    whatsapp/     webhook + customer_messages
    dashboard/
    settings/

Old paths (app/api/endpoints/, app/models/, app/services/, app/schemas/,
app/core/, app/db/, app/websocket/, app/workers/, app/constants/,
app/data/) are removed entirely. The previous compatibility shims at
those paths were used only during the transition window and have been
deleted.

Alembic env.py model imports were updated to the new paths. No migration
files were changed. The DB schema is unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
"@
[System.IO.File]::WriteAllText("$env:TEMP\elms-cutover-msg.txt", $msg, (New-Object System.Text.UTF8Encoding($false)))
git commit -F "$env:TEMP\elms-cutover-msg.txt"
Remove-Item "$env:TEMP\elms-cutover-msg.txt" -Force
git log -1 --format="%s"
```

### Step 5 — Push the swap branch (do NOT merge to main yet)

```powershell
git push -u origin chore/restructure-feature-based
```

Open the PR. **Do not auto-merge.** Manual review of the commit's tree-diff (mostly file renames) is the human gate.

### Step 6 — Deploy from the swap branch to a staging VPS first (if available)

If a staging VPS exists, deploy the swap branch there and re-run the auth smoke test against the staging API URL. If no staging exists, skip to step 7 with extra caution.

### Step 7 — Cutover the production VPS

Same procedure as a normal backend deploy per CLAUDE.md §8, but pointed at the swap branch:

```powershell
ssh root@92.113.31.218 "set -e; cd /opt/elms/server-ELMS; git fetch origin; git checkout chore/restructure-feature-based; cd /opt/elms; docker compose build api worker; docker compose up -d api worker; sleep 8; curl -fsS http://127.0.0.1:8000/api/v1/health"
```

The `docker compose build` step is critical — the Docker image's `COPY app /app/app` must pick up the new tree.

### Step 8 — Production verification (within 5 min of deploy)

```powershell
# 1. External health
curl.exe -fsS https://api.hensline.com/api/v1/health

# 2. Container state
ssh root@92.113.31.218 "cd /opt/elms; docker compose ps api worker web"

# 3. Spot-check the two fixed endpoints with a real admin token
$token = curl.exe -fsS -X POST -d "username=admin@example.com&password=admin123" `
  -H "Content-Type: application/x-www-form-urlencoded" `
  https://api.hensline.com/api/v1/auth/login | ConvertFrom-Json | Select-Object -ExpandProperty access_token

curl.exe -fsS -H "Authorization: Bearer $token" https://api.hensline.com/api/v1/technicians/supervisors
curl.exe -fsS -H "Authorization: Bearer $token" "https://api.hensline.com/api/v1/maintenance/stats/capacity-dashboard?month=5&year=2026"

# Both should return 200 with JSON bodies. If either returns 500, ROLLBACK.

# 4. Spot-check a representative business flow (AdminPortal-driven, in the browser)
#    - Log in to https://admin.hensline.com
#    - Open a work order page; confirm it loads
#    - Open the maintenance contracts list; confirm it loads
#    - Open the WhatsApp messages tab; confirm "تم الإرسال" and "مراجعة" tabs populate
```

### Step 9 — Merge the PR to `main`

Only after step 8 passes against production. This makes the swap branch the new history.

---

## 4. Rollback plan

Trigger: any of the production checks in step 8 fail, OR ops sees an unexpected error rate on AdminPortal within 30 min of cutover.

### Fast rollback (recommended, ~3 min)

```powershell
ssh root@92.113.31.218 "cd /opt/elms/server-ELMS; git checkout main; cd /opt/elms; docker compose build api worker; docker compose up -d api worker; sleep 8; curl -fsS http://127.0.0.1:8000/api/v1/health"
```

This reverts to whatever `main` was before the merge — the pre-cutover layout. No DB changes to undo. `main` is unchanged because we only deployed the swap branch in step 7.

### After rollback

1. Reproduce the failure locally against `backend_reclear/`.
2. Fix on the swap branch.
3. Re-run pre-flight (§2) and re-deploy when green.

---

## 5. Risks specific to this restructure

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Alembic `env.py` model registration misses a feature → migrations stop autogenerating | Low | High | `alembic/env.py` was rewritten with all 21 model imports. Pre-flight runs `alembic check` (add this to §2 next time). |
| A function-local import we missed inside some controller still references `app.models.X` | Very low | Medium (one endpoint 500s) | Phase 2A's bulk pass + Phase 2B's stray scan covered 700+ import lines + the one indentation case. Smoke test already exercised every route once. |
| Hidden script in `scripts/` references an old path | Low | Low (script fails when manually run) | All 7 scripts had their imports rewritten. Verified by re-running compileall. |
| `app/_shared/data/makkah_demo_seed.json` not found by `seed_makkah_demo_data.py` after layout change | Already fixed | None | Script path was updated; no further action. |
| AdminPortal cached an old OpenAPI schema | Low | Low (UI looks normal) | AdminPortal generates types at build time, not runtime. Force a rebuild on the next FE deploy. |
| Scheduler cron jobs (in `_shared/scheduler.py`) trigger off-cycle due to container restart | Expected | Low | Cron jobs are idempotent (catchup-style). One missed tick is fine. |
| Docker layer cache hides the change | Low | Cosmetic | The `docker compose build` step is rebuilt fresh per CLAUDE.md §8. |

---

## 6. What we explicitly are NOT doing in this cutover

- Adding a repository layer (deferred — see "next phase" below).
- Fixing the 5 remaining "controller wraps HTTPException(400) as 500" cases (separate tech debt ticket).
- Fixing the data-quality issue in `/users/` (a real user has a reserved email domain — needs a data fix, not a code fix).
- Rewriting the 6 `-public` routes to share auth (they use signed URLs by design).
- Changing any URL prefix, tag, response shape, or HTTP method.
- Touching `AdminPortal/`, `mobile-worker/`, `elms-customer/`, or `elms-landing/`.
- Touching `docker-compose.yml` or any infra outside the `backend/` tree.

---

## 7. Next phase (after cutover is green for ≥1 week)

In priority order, with the restructure as the prerequisite:

1. **Add a repository layer per feature.** Move all `db.query(...)` / `db.add(...)` calls out of services and controllers into `<feature>/repository.py`. Services call repo methods only. This was the original "3-layer" plan deferred in Phase 1.
2. **Fix the `try/except` pattern** that wraps `HTTPException(400)` as `500` in 5 maintenance endpoints. One sweep across `app/maintenance/` and `app/dispatch/`.
3. **Write tests for the critical flows** (per the user's request — contract creation → visit generation → assignment → completion → invoice; WhatsApp webhook → work order update → notification). Not unit tests for every function — targeted integration tests for the safety-critical paths called out in CLAUDE.md §9.
4. **Set up CI to run the smoke tests on every PR.** Both `smoke_test_endpoints.py` and `authenticated_smoke_test.py` should be wired into the GitHub Actions pipeline so this kind of regression is caught before merge.

---

## 8. Tools left in `backend_reclear/` (move to `backend/` post-cutover)

These were built during the restructure and are worth keeping:

- `smoke_test_endpoints.py` — Level 1 (unauthenticated)
- `authenticated_smoke_test.py` — Level 2 (authenticated)
- Generated reports (`smoke_test_report.json`, `auth_smoke_test_report.json`, `auth_smoke_test_bugs.txt`) — these are runtime output, do NOT commit. Add to `.gitignore`.

Move them into `backend/scripts/` (or `backend/tests/smoke/`) on the same PR as the cutover so they survive.
