# AVIX-WORKER-REPAIR-002 — release runbook (AVIX Workers repair & parts)

Status: **candidate, not deployed.** Prepared 2026-10-29. Nothing here has run on production; every production
step needs its own authorization. Builds on AVIX-MAINTENANCE-REPAIR-001 (deployed 2026-10-28).

What it delivers: a technician sees a repair follow-up in «مهامي», reads its parts, confirms on site what he fitted
(photo or report, counted once), asks the store to take back the rest, records the elevator test and closes the
job; the storekeeper receives returns in «المستودع › طلبات الإرجاع». Stock, audit and tenant isolation as below.

## 1. Release Manifest

Built from what production runs, never from `main`:

| Component | Production now | Release branch | Head | Commits on top |
|---|---|---|---|---|
| Backend (`server-ELMS`) | `f0a2f37` | `release/avix-worker-repair-002` | `c2de317` | 7 (below) |
| AdminPortal (`client-ELMS`) | `bbcc36d` (deployed 2026-10-29, sticky filters) | `release/avix-worker-repair-002` | `c25ba33` | 2 |
| AVIX Workers (OTA, runtime `2.0.0`, branch `preview`) | `65256605` per the last recorded publish — **confirm with `eas update:list --branch preview` before publishing** | `release/avix-worker-repair-002` | `94f0d6de` | 5 |
| Database | `repair_0002` | — | `repair_0003` | 1 migration |

Backend commits (cherry-picked with `-x` from `feature/worker-repair-parts`; the code is byte-identical to it):

| Release | Source | What |
|---|---|---|
| `66c0b13` | `5f0d508` | my-tasks: repair follow-up, origin, diagnosis, parts readiness (batched) |
| `9d9a1ce` | `bd45fc8` | **fix**: a request that waited on a part's row lock counts from the committed row (`populate_existing`) |
| `afe7b3b` | `8b86fcd` | `GET /work-orders/{id}/my-parts` (assignment-checked) |
| `aba15d1` | `c4fdeea` | `POST …/parts/{rid}/field-install` (absolute total, replay-safe, 409 on stale) |
| `b03eb14` | `9d1644e` | `repair_0003` `part_return_requests`; return request / receive / cancel; completion gate; cancel reason |
| `5e9d49e` | `a933f78` | compatibility: older apps are held for review, approval gate, no closing by status change |
| `c2de317` | `ca4d893` | tests: two-transaction races on every requirement write |

AdminPortal commits: `0faf45e` (from `e8de7fd`, «طلبات الإرجاع» + cancel reason + return-pending column),
`c25ba33` (from `cecd4fb`, «اعتماد إغلاق الإصلاح» for held repairs).

AVIX Workers commits: `ba895585` (feed chips and repair card), `1fe017a9` (parts section), `2070ed2a` (field
install), `02994cee` (returns, test result, closing), `94f0d6de` (repair_flow, 404-tolerant, build label).
No native change: no new module, permission or config — JS-only, OTA-eligible for runtime `2.0.0`.

Artifacts (SHA-256):

| File | SHA-256 |
|---|---|
| `server-ELMS-avix-worker-repair-002.bundle` (`f0a2f37..c2de317`, head `refs/heads/release/avix-worker-repair-002`) | `2a99e1b1ed3c36cd3445feb6d99c48b231c23f94f7a22c118b1c43e443042784` |
| `client-ELMS-c25ba33.tar` (`git archive` of `c25ba33`, 1,269 files) | `6a9a5088a5728dce77c3319e3e0f422b47b42dde44f00aeb3ba6b5b1bc5bcac3` |

The OTA has no artifact: it is published from a clean checkout of `94f0d6de` on the night.

## 2. Preconditions (stop if any fails)

- Backend HEAD = `f0a2f37`, clean tree, branch `release/marketplace-console`; `alembic current` = `repair_0002`.
- Live portal tree = `bbcc36d` exactly (1,267 files, file-by-file SHA-256 compare as in the 2026-10-29 deploy).
- `eas update:list --branch preview` shows the last publish and its commit; it must be an ancestor of `94f0d6de`
  (else rebase the five app commits onto it and re-run §8 app checks). `.github/workflows/eas-update.yml`
  publishes on every push to `main` — **do not push or merge to `main` until step 5.6**, or CI ships the OTA early.
- No long transaction (`pg_stat_activity`, as in REPAIR-001 §2); outside working hours.

## 3. Backups and restore readiness

Same procedure and gates as REPAIR-001 §3 (dump, `pg_restore --list` with `TABLE DATA` for `work_orders`,
`part_requirements`, `inventory_movements`, `audit_logs`, `work_order_repair_requests`; isolated restore into
`elms_restore_check_<ts>`, counts equal, `alembic_version` = `repair_0002`, then dropped; tarballs; rollback images
`:pre-wrp002-<ts>`; one line in `server-rollback.log`). **If the restore fails, do not migrate.** Attachments are on
S3 and this release only adds objects.

## 4. Compatibility — three versions run side by side during the rollout

OTA does not reach every phone at once: a phone takes it on its next launch (or the in-app «يتوفر تحديث جديد»
prompt), and phones still on the **SDK 54 binary (runtime `1.0.0`) never receive it** — they need the runtime
`2.0.0` APK. So the backend must serve old and new apps together, for as long as it takes.

| Client | Against the new backend | Evidence |
|---|---|---|
| AVIX Workers already installed (no `repair_flow`) | Routine/emergency/installation jobs: unchanged. A repair follow-up it closes while parts or the test are unsettled is **held** in «بانتظار المراجعة» (`REPAIR_COMPLETION_HELD_FOR_REVIEW` audit with the blockers), not refused; nothing is counted as fitted; `spare_parts_used` still refused | integration tests replay the deployed app's exact completion body (mobile-worker `65256605` `submitWorkOrder`) |
| AVIX Workers new (OTA) | Full flow; an unsettled repair is refused with the reason (`repair_flow=1`) | tests + emulator run (§8) |
| AVIX Workers new on the **old** backend (OTA before backend) | Parts section hides itself on 404; `repair_flow` is ignored (schema has no `extra=forbid`); `app_version` fits 50 chars | code + schema check |
| AdminPortal old (open tab) | Works; cancelling a part on a repair follow-up without a reason gets a clear 400; consume/return capped by pending returns with a message | tests |
| AdminPortal new on the old backend | Works (old `CancelIn` accepts `reason`); «طلبات الإرجاع» shows its error state until the backend lands | schema check at `f0a2f37` |

The supervisor's way out for a held repair: settle the parts (portal «تأكيد التركيب» on the technician's report;
storekeeper return), then «اعتماد إغلاق الإصلاح» stating the test result. The server refuses the approval while parts
are unsettled, and neither status endpoint can close a repair follow-up.

Finding phones that have not updated: every launch rewrites `user_devices.app_version`; the new build writes
`<version>/rt<runtime>/<update id|embedded>/rf1`.

```sql
-- technicians whose latest device row is not on the repair-flow build
select u.full_name, d.app_version, d.last_seen
from user_devices d join users u on u.id = d.user_id
where d.is_active and d.last_seen > now() - interval '14 days'
  and coalesce(d.app_version, '') not like '%/rf1'
order by d.last_seen desc;
```

Gap: a phone that never registered for push (permission denied) has no row. `audit_logs`
`REPAIR_COMPLETION_HELD_FOR_REVIEW` lists every repair an older app closed.

## 5. Order of operations

1. Preconditions (§2) → backups and isolated restore (§3).
2. Backend code: fetch the bundle into `release/avix-worker-repair-002`, `git merge --ff-only`; assert HEAD =
   `c2de317` and `git rev-list --count f0a2f37..HEAD` = 7; `docker compose build api worker` (old containers serve).
3. Migrate from the new image with lock timeouts: `docker compose run --rm -e PGOPTIONS="-c lock_timeout=5s -c
   statement_timeout=60s" api alembic upgrade head`; assert `repair_0003`; `part_return_requests` RLS t/t, 1 policy,
   `elms_app` SELECT/INSERT/UPDATE. One transaction; a lock timeout rolls back to `repair_0002` — find the blocker,
   wait, retry once; twice → stop (old code still runs on the old schema).
   Lock profile: `CREATE TABLE` takes SHARE ROW EXCLUSIVE briefly on its FK targets (`companies`, `part_requirements`,
   `work_orders`, `inventory_items`, `users`, `technicians`, `warehouses`, `inventory_movements`) — blocks writes to
   them for milliseconds, never reads. No existing table is altered.
4. `docker compose up -d --no-deps api worker`; health 200.
5. AdminPortal: archive deploy of `c25ba33` with the live-tree check against `bbcc36d`; build web; bundle
   contains «طلبات الإرجاع» and «اعتماد إغلاق الإصلاح».
6. AVIX Workers OTA, from a clean checkout of `94f0d6de` (`npm ci`, `tsc`, jest): `eas update --branch preview
   --environment preview --message "AVIX-WORKER-REPAIR-002"`, **after** the backend is live. Staged: start with a
   rollout percentage (EAS Update rollouts) to a few devices / the pilot technicians, then widen (§6 gates).
7. APK (runtime `2.0.0`) for any phone still on runtime `1.0.0` — `eas build --profile preview`, installed by hand;
   not needed for phones already on runtime `2.0.0`.

## 6. Rollout gates

1. Old and new apps against the candidate backend without bypassing repair proofs — **done locally (§8)**.
2. Camera photo, upload, offline retry, completion on a real Android device with the production runtime — §8 states
   what ran on the emulator; a **physical phone run with the OTA is still required before widening**.
3. Backup + isolated restore + migration + RLS on the night.
4. Pilot: a few technicians, one supervisor, the storekeeper, one internal test job.
5. Widen only after the pilot shows no stock or completion errors (watch §7 queries).

## 7. Smoke tests and monitoring

Production, internal test data only, no customer messages:
`GET /work-orders/my-tasks` as a pilot technician returns the new fields; `GET /inventory/return-requests` 200 for
the storekeeper; the portal shows «طلبات الإرجاع»; a technician `POST …/status {"status":"completed"}` on a repair
follow-up is refused.

Watch (first 30 minutes, then daily during the rollout): api 5xx; `audit_logs` `PART_CONSUMED`
(`confirmationSource` field vs administrative), `PART_RETURN_*`, `REPAIR_COMPLETION_HELD_FOR_REVIEW`, `APPROVE` with
`repair`; `inventory_movements` of type `return` = received return requests; `part_return_requests` stuck in
`pending` for more than a day; the §4 device query.

## 8. Verification of this candidate (local, isolated, 2026-10-29)

Done, and what each proves:

- **Backend, feature tests** (`tests/integration/test_worker_repair_parts.py`, 27): the twelve scenario steps
  (approved follow-up → assigned → «مهامي» → parts → 2 issued → 1 fitted with proof → retried → 1 asked back →
  received once → closed with the test → stock and audit) and the negative cases (other technician 403, other
  company 404, part of another job, more than issued, bad proof, stale screen 409, decrease refused, overlapping
  returns, double receipt 409, `spare_parts_used` refused, unsettled completion, cancel without reason / with parts
  out), plus the compatibility cases (the deployed app's completion body held for review; supervisor approval gated
  on settled parts and a stated test; a routine job from the deployed app unchanged; no closing by status).
- **Concurrency on PostgreSQL** (`test_parts_concurrency.py` 4 + 4 races in the feature file): issue/issue,
  cancel/issue both orders, receive/direct return, fit/ask-back, identical fittings, identical return asks,
  double receipt. **Without the `bd45fc8` fix three of the four new races fail; with it all pass.**
- **RLS with `elms_app`** (the real runtime role, NOSUPERUSER NOBYPASSRLS) on a database where `repair_0003` ran for
  real: `test_part_returns_rls.py` 4/4 and `test_repair_requests_rls.py` 5/5 — another company cannot see, receive,
  cancel or blind-UPDATE a return request, cannot INSERT into another tenant; races hold under RLS.
  `tests/test_tenant_isolation.py` could not be used: it needs a production-like copy (company `C1` with its
  customers) and its raw inserts predate `customers.credit_hold` NOT NULL — a stale suite, left unchanged.
- **Migration** `repair_0003`: unit tests 8/8; real `repair_0002 → repair_0003` with the production lock
  timeouts, downgrade and re-upgrade; pre-commit migration suite 68/68.
- **Old code on the new schema**: `f0a2f37` issued, consumed and returned on `repair_0003`, never wrote the new
  table; its own repair RLS suite 5/5 there.
- **Full backend suite**: the feature branch run (4,268 passed) failed exactly the same 117 + 69 test IDs as
  unmodified `main` (`comm` on the IDs: none only on the feature branch). The run on the release branch was
  stopped at 33 % by the machine running out of memory; for the part it covered its result line is identical,
  test by test, to the feature run. **Re-run it to the end before the deploy.**
- **AVIX Workers**: `tsc` clean, 162 unit tests, Android JS bundle export OK; web build driven headless against a
  local API under RLS: feed chips and cards, parts section, field install with a report, return request,
  withdraw, test result, closing blockers; RTL and LTR. AdminPortal `npm run check` (types, lint 0 errors,
  build) on the release branch; storekeeper receive and supervisor cancel-with-reason driven in a browser.

Not done — gate 2 stays open:

- **No physical phone and no emulator run.** No device was attached; a local release APK (runtime `2.0.0`, debug
  keystore, API on the host) and the `Pixel_6` emulator were started, but the machine ran out of memory and both
  were stopped before the APK finished. Camera capture, photo upload from a phone, the offline retry on a real
  network drop, and completing from the phone are therefore **unverified on a device**. Run them on one pilot
  phone with the OTA before widening the rollout.
- Which update the phones run now is not known from here (`eas update:list` needs the Expo account); the number
  of phones still on runtime `1.0.0` is not known either — the §4 query answers it after the backend is live.

## 9. Rollback

- **App:** `eas update:republish` the previous update group to `preview` (or roll the rollout back to 0 %). The
  backend keeps serving old apps (held-for-review path), so an app rollback needs nothing else.
- **Portal:** `elms-web-rollback:pre-wrp002-<ts>` (or the `bbcc36d` tarball).
- **Backend code:** `:pre-wrp002-<ts>` images. The old code runs on `repair_0003` unchanged (checked: `f0a2f37`
  issues, consumes and returns on the new schema and never writes `part_return_requests`).
- **Schema: no automatic downgrade.** `alembic downgrade repair_0002` drops `part_return_requests` (rehearsed); only
  while it is empty — afterwards it destroys pending returns and their audit context.

## 10. Out of scope (next release)

Per-elevator parts history, serial/batch tracking and cost reports (roadmap phase 2) — no schema for them here.
