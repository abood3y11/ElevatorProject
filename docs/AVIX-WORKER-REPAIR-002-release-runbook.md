# AVIX-WORKER-REPAIR-002 — release runbook (AVIX Workers repair & parts)

Status: **candidate, not deployed.** Prepared 2026-10-29; release gates re-checked 2026-10-30 (§8, §11). Nothing here has run on production; every production
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
| AVIX Workers (OTA, runtime `2.0.0`, branch `preview`) | `65256605` — update group `3d4d4952-85d9-4916-b069-3beca650fdf0`, read from EAS 2026-10-30 | `release/avix-worker-repair-002` | `94f0d6de` | 5 |
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

Binary for phones still on runtime `1.0.0` — **no new build is needed**; the existing EAS build is the one:

| Build | Value |
|---|---|
| EAS build id | `270ff52b-e3d8-435f-a5fa-1bb8a2ce17f4` (profile `preview`, 2026-10-18, commit `8f7eabf0`, SDK 57) |
| Package / version | `com.elms.worker`, versionName `1.0.0`, versionCode `17`, minSdk 24, targetSdk 36 |
| Embedded update config | runtime `2.0.0`, channel header `expo-channel-name: preview`, `u.expo.dev/be346236…` |
| Signing certificate SHA-256 | `b984da9fc5caf659abe6e1aaaeb6e6ff226d89bd478f1b99138b0d3652c0e3db` |
| APK SHA-256 | `835aa784dd3798b95a10cbd1abc40914aeb31fcd25c8f015019d38e82896e535` (136,469,099 bytes) |

Native compatibility with this release: `eas fingerprint:compare --build-id 270ff52b…` against `94f0d6de` differs
only in local, untracked inputs (CRLF `eas.json`, gradle outputs under `android/`), and `git diff 8f7eabf0..94f0d6de`
touches no native file (no `android/`, `app.json`, `eas.json`, package files) — every change is under `src/`.

**The EAS download link of this APK expires 2026-11-01.** A copy was saved locally on 2026-10-30; keep it somewhere
durable (or rebuild the same profile at `8f7eabf0`). The old runtime `1.0.0` build (also versionCode 17) is the same
package; install the new APK over it on one phone first to confirm Android accepts it as an update (same signer
expected — EAS-managed keystore).

## 2. Preconditions (stop if any fails)

- Backend HEAD = `f0a2f37`, clean tree, branch `release/marketplace-console`; `alembic current` = `repair_0002`.
- Live portal tree = `bbcc36d` exactly (1,267 files, file-by-file SHA-256 compare as in the 2026-10-29 deploy).
- `eas update:list --branch preview` still shows group `3d4d4952…` (commit `65256605`) as the latest runtime
  `2.0.0` publish; if anything newer appears, it must be an ancestor of `94f0d6de` (else rebase the five app
  commits onto it and re-run the app checks).
- **CI publishes on every push to `main`, to 100 %.** `.github/workflows/eas-update.yml` runs `eas update --branch
  preview` on `push: main` with no rollout percentage. Before merging the app branch: disable that workflow
  (GitHub › Actions › «EAS Update (OTA)» › Disable workflow), merge, publish by hand with a rollout (§5.6), and
  re-enable it only after the rollout reaches 100 %. Any push to `main` before that ships the release untested.
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

Phones in the field (EAS Update insights, unique users per update, read 2026-10-30):

| Update group (branch `preview`) | Runtime | Android users, last 7 days | last 30 days |
|---|---|---|---|
| `3d4d4952` (`65256605`, latest) | `2.0.0` | 1 | 2 |
| `02e6a267` (AVIX theme) | `2.0.0` | 0 | 1 |
| `89b17325` (latest for runtime `1.0.0`) | `1.0.0` | 4 | 5 |
| `47a7f528` | `1.0.0` | 0 | 2 |

So most active phones are still on the SDK 54 binary and **will not receive this OTA**. These counts miss phones that
run the bundle embedded in their APK and never downloaded an update, and phones without network to `u.expo.dev`
(the app has no `expo-insights`, so EAS has no app-wide count). The full count needs the production query below
(prepared, not run — production reads were not authorized in this session) plus the technician roster.

The already-installed app reports only `app_version` = `1.0.0` for every binary, so `user_devices` cannot tell
runtime `1.0.0` from `2.0.0` until a phone runs the new JS. What it can tell: which technicians have a phone
registered and when it was last seen — every technician seen recently whose row does not end in `/rf1` after the
OTA is either on runtime `1.0.0` or has not relaunched; check the phone or install the APK.

The new build writes `<version>/rt<runtime>/<update id|embedded>/rf1` on every launch.

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
6. AVIX Workers OTA, from a clean checkout of `94f0d6de` (`npm ci`, `tsc`, jest), **after** the backend is live
   and with the CI workflow disabled (§2): `eas update --branch preview --environment preview --message
   "AVIX-WORKER-REPAIR-002" --rollout-percentage 10`. Run the §11 device checklist on the pilot phone; widen with
   `eas update:edit` (rollout percentage) to 50 then 100 (§6 gates). Back out with `eas update:revert-update-rollout`.
7. Runtime `1.0.0` phones: install the existing runtime `2.0.0` APK (§1, build `270ff52b`) by hand or by link; on
   first launch it fetches the OTA from `preview`. Not needed for phones already on runtime `2.0.0`.

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
- **Full backend suite on the release branch `c2de317`** (2026-10-30, two sequential chunks against the local
  `elms_test` database, WhatsApp/AWS blanked, the conftest send-blocker on): `tests/integration` 2,487 passed /
  116 failed / 69 errors / 20 skipped; the rest 1,787 passed / 1 failed / 31 skipped — **4,274 passed, 117 failed,
  69 errors**. The 186 failing IDs (from the JUnit XML) are **identical** to the same files run at production
  `f0a2f37` (186 = 186, none only on the release) and to `main` on 2026-10-29. No failing test is in inventory,
  parts or repair code; the largest groups are installations (~90), SaaS usage (26), WhatsApp number ownership,
  credential encryption, marketplace — pre-existing, unchanged by this release.
- **Re-run under `elms_app` 2026-10-30** on a fresh database migrated `repair_0002 → repair_0003` with the
  production lock timeouts (then dropped): RLS 9/9, concurrency 4/4, feature 27/27 — 40/40.
- **AVIX Workers**: `tsc` clean, 162 unit tests, Android JS bundle export OK; web build driven headless against a
  local API under RLS: feed chips and cards, parts section, field install with a report, return request,
  withdraw, test result, closing blockers; RTL and LTR. AdminPortal `npm run check` (types, lint 0 errors,
  build) on the release branch; storekeeper receive and supervisor cancel-with-reason driven in a browser.

Not done — gate 2 stays open:

- **No physical phone and no emulator run.** No device was attached on 2026-10-29 or 2026-10-30. The local APK
  build and the `Pixel_6` emulator were stopped for lack of memory on 2026-10-29, and on 2026-10-30 the machine
  had under 2 GB free, so they were not started again. Camera capture, photo upload from a phone, the offline
  retry on a real network drop and completing from the phone are **unverified on a device**: run §11 on one pilot
  phone with the OTA at the first rollout step, before widening.

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

## 11. Device checklist (gate 2 — pilot phone, first rollout step)

On one Android phone with the runtime `2.0.0` APK, after the backend is live and the OTA is at its first rollout
percentage. Internal test job only (a test customer/elevator, no customer messages); a storekeeper and a
supervisor at the portal. Record the phone model, Android version and the `app_version` row it wrote.

| # | Step | Pass when |
|---|---|---|
| 1 | Log in as the pilot technician | lands on «مهامي»; `user_devices.app_version` ends in `/rf1` with the OTA's update id |
| 2 | «مهامي» | the test follow-up shows the «إصلاح وتركيب قطع» chip, the origin order and the fault |
| 3 | Open it | the parts section lists each part: issued, fitted, pending return |
| 4 | Fit 1 of 2 with a **camera** photo | photo taken in-app, upload completes, fitted = 1; audit `PART_CONSUMED` `confirmationSource: field` |
| 5 | Partial install | 1 still in hand; no second consumption |
| 6 | Airplane mode on, confirm again, off | the app retries; the server answers the replay with 200 and adds nothing |
| 7 | Repeat the same confirmation | still 1 fitted; `inventory_movements` has exactly one `consume` for it |
| 8 | Ask back the remaining 1 | return request `pending`; stock unchanged until the storekeeper receives it once |
| 9 | Record the elevator test «ناجح» | the checklist line `repair_test_result=passed` is stored |
| 10 | Complete | before the store receipt: refused with the reason; after it: `completed`; parent order unchanged |

Fail any step → set the rollout to 0 % (`eas update:revert-update-rollout`), keep the backend (it serves the old app
through the held-for-review path), and fix before retrying.
