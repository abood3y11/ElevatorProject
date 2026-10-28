# AVIX-MAINTENANCE-REPAIR-001 — production release runbook (PREPARED, NOT EXECUTED)

Status: final release candidate (2026-10-28). Nothing below has run on production; it runs only after an explicit
Production GO from the owner. Production facts were read with read-only commands on 2026-10-28 (re-checked after
D2: backend `bf3d531` clean, alembic `saasuse_0001`, api/worker/web up, portal content = `07826ad`).

Decisions closed by the owner on 2026-10-28: **D1** — `769508a` stays out; **D2** — installation is confirmed
administratively by a supervisor on the technician's report, never by the storekeeper (see §4, §9).

## 1. What ships (Release Manifest)

| Part | Live now | Target | How |
|---|---|---|---|
| Backend `/opt/elms/server-ELMS` | `bf3d531` on `release/marketplace-console`, clean | **`f0a2f37`** on local branch `release/avix-maintenance-repair-001` = `bf3d531` + 7 commits (below) | git bundle, fast-forward only |
| Alembic | `saasuse_0001` | `repair_0001` → `repair_0002` | one-off container, explicit lock/statement timeouts (§5) |
| AdminPortal `/opt/elms/client-ELMS` | content = `07826ad` exactly (1,258 files, CRLF-normalised SHA-1 compare: 0 missing, 0 extra, 0 differing) | **`a79a52e`** = `07826ad` + 9 commits, linear, no merges | `git archive` of `a79a52e` |
| Mobile Worker (AVIX Workers) | store build | **unchanged** | — |

Backend commits, in order (cherry-picked from local `main`; every touched file is byte-identical to `main`):

| Release | From `main` | What |
|---|---|---|
| `12d8390` | `f22496f` | distribution candidates carry contract number, customer phone and code |
| `418b96d` | `9e08f7a` | repair requests → approvals → one follow-up order; migration `repair_0001` |
| `cd80ddf` | `348d1aa` | audit who confirmed installation / cancelled a part request |
| `9e18afe` | `2595ede` | amend a contract's customer-approval term, with reason, audited |
| `d73897e` | `1164fb8` | labor vs parts coverage, review of mixed/unknown coverage; migration `repair_0002` |
| `e14672c` | `8a97d55` | test: cross-tenant quote refusal |
| `f0a2f37` | `89b3d7c` | **D2**: installation confirmed administratively by a supervisor on the technician's report |

AdminPortal commits: `8c20c59` `463aa8c` `0d9e41a` `9957204` `c2f328e` `91953f6` `44cdcca` `eb2a952` `a79a52e` (D2).

Release artifacts (built locally, not uploaded):

| File | SHA-256 |
|---|---|
| `server-ELMS-avix-repair-001.bundle` (prerequisite `bf3d531`, head `refs/heads/release/avix-maintenance-repair-001` = `f0a2f37`) | `e494609749bcef8d38ae1e07d26c61de16aea6a6a719466312d8d547bd80dda4` |
| `client-ELMS-a79a52e.tar` (1,267 files; no `.env`, only `.env.example`) | `4965be411b2d72171882edd43a04bbb237879c71bf24b8a264c428e571104a3d` |

**Not in this release:** `769508a` (D1), anything else on local `main` (the bundle carries exactly the 7 commits
above — no `git pull`, no `main`), Marketplace/Store, AVIX Workers changes, per-line parts coverage. No `.env` or
secret-bearing file is in the commit range or the archive.

## 2. Preconditions (stop if any fails)

- Backend HEAD = `bf3d531`, `git status --porcelain` empty.
- Bundle on the server: `sha256sum` matches §1; `git bundle verify` says okay; `git bundle list-heads` shows `f0a2f37`.
- `alembic current` = `saasuse_0001`.
- Portal content = `07826ad` (CRLF-tolerant compare, 1,258 files) — a deploy by anyone since 2026-10-28 shows here.
- WhatsApp auto switches unchanged: only `contract_expired`, `contract_expiring`, `visit_no_access` rows, all
  `false`; `elms_service_closed_notice` auto absent (= `false`).
- `APP_DATABASE_URL` set in the api container.
- No long transaction open: `select pid, now()-xact_start, state, left(query,80) from pg_stat_activity where
  datname='elms_db' and xact_start < now() - interval '30 seconds';` returns nothing (else wait).
- Outside working hours.

## 3. Backups and restore readiness

What must be recoverable: the database (all business data, attachment ROWS, audit) and the code/images. Attachment
FILES are all on S3 (33 rows, all `https://`; `UPLOAD_DIR` empty, no local uploads); this release never deletes or
rewrites an S3 object — new proofs are new objects — so S3 needs no snapshot for this release.

1. `docker compose exec -T db pg_dump -U postgres -Fc elms_db > backups/elms-db-<ts>-preRepair.dump`; refuse an empty
   file; `pg_restore --list` must show `TABLE DATA` for `work_orders`, `maintenance_contracts`, `work_order_attachments`,
   `audit_logs`, `inventory_movements`.
2. **Isolated restore check (required before step 5.2):** inside the db container, `createdb -U postgres
   elms_restore_check_<ts>`; `pg_restore -U postgres -d elms_restore_check_<ts> --no-owner backups/…preRepair.dump`
   must exit 0; compare counts with live (companies 4, maintenance_contracts 612, work_orders 5,172 as of
   2026-10-28 — use the live numbers of the night) and `alembic_version` = `saasuse_0001`; then `dropdb`. The
   app never points at this database.
3. Tarballs of `server-ELMS` and `client-ELMS`; rollback images `elms-api-rollback`, `elms-worker-rollback`,
   `elms-web-rollback` tagged `:pre-repair-<ts>`.
4. One line in `backups/server-rollback.log`: `backend=bf3d531 alembic=saasuse_0001 frontend=07826ad dump=<file>`.

Rehearsed locally on 2026-10-28 (PostgreSQL 17, same major as production 17.8) on a throwaway database with the
production schema: dump → `pg_restore --list` → restore into a second throwaway database → counts equal →
`alembic_version` carried → both databases dropped.

## 4. Compatibility

- **Backend first, then AdminPortal.** The new backend is additive for the live portal: new endpoints and fields;
  two new refusals that need repair requests (0 exist) — accepted-quote edit lock, send block under coverage review.
  The new portal on the old backend would break the repair section, so the portal never goes first.
- **One breaking contract change, internal only:** `POST /part-requirements/{id}/consume` now requires
  `technician_report` or `evidence_attachment_id` and refuses the storekeeper. Its only caller is AdminPortal
  (checked: AVIX Workers and the customer app never call it). Between step 5.4 and 5.5 the OLD portal's «تأكيد
  التركيب» returns 400 — a minutes-long window, at night, on an action used 0 times in production (0 part
  requirements exist).
- **AVIX Workers — no new release.** The follow-up is a normal `corrective_maintenance` order: shown in
  `my-tasks` (no type filter, keeps undated assigned work), `start`/`complete` have no type restriction. Completion
  without `spare_parts_used` (what the app sends today) fits NOTHING: issued parts stay «مع الفني» until a
  supervisor confirms or the storekeeper takes them back (tested).
- **Who does what (D2):**

  | Role | Can | Cannot |
  |---|---|---|
  | أمين المستودع (`store_manager`) | reserve, issue, take returns | confirm installation (403; button hidden) |
  | مشرف/مدير الصيانة أو التركيبات, admin, operations | approve/schedule; **administrative** installation confirmation with a technician-report reference or a proof attached to the same work order | confirm without either (400) |
  | الفني | start/complete in AVIX Workers | — field confirmation of parts comes in a separate app release |

  Each confirmation writes `audit_logs` `PART_CONSUMED` with the confirmer (`user_id`), time, `workOrderId`,
  `quantity`, `technicianReport` / `evidenceAttachmentId`, and `confirmationSource: "administrative"`,
  `basis: "technician_report"`. No migration was needed: the audit row carries the distinction.
- **History is not reinterpreted:** each repair request stores its own coverage/approval policy; amending a
  contract's term affects new requests only.
- **RLS:** `work_order_repair_requests` gets ENABLE + FORCE RLS and `tenant_isolation` in `repair_0001`.

## 5. Order of operations

1. Preconditions (§2) → backups and isolated restore check (§3).
2. Code: `cd /opt/elms/server-ELMS && git fetch /tmp/server-ELMS-avix-repair-001.bundle
   release/avix-maintenance-repair-001:refs/heads/release/avix-maintenance-repair-001 && git merge --ff-only
   release/avix-maintenance-repair-001`; assert HEAD = `f0a2f37` and `git rev-list --count bf3d531..HEAD` = 7.
   Then `docker compose build api worker` (old containers keep serving).
3. Migrate from the NEW image while the old containers serve, never waiting on a lock indefinitely:
   `docker compose run --rm -e PGOPTIONS="-c lock_timeout=5s -c statement_timeout=60s" api alembic upgrade head`;
   assert `alembic current` = `repair_0002`.
   - The whole upgrade is ONE transaction. If any statement cannot get its lock within 5 s it fails with
     `LockNotAvailable`, everything rolls back and the database stays at `saasuse_0001` — rehearsed: with a reader
     holding `maintenance_contracts`, the run exited 1 with `lock timeout`; alembic, the new table and the new
     column were all absent afterwards. Then: find the blocker in `pg_stat_activity`, wait for it, re-run. Never
     remove the timeout. Two refusals in a row → stop; the old code is still serving on the old schema.
   - Lock profile (PG 17): `CREATE TABLE` takes a brief SHARE ROW EXCLUSIVE on each FK target (`companies`,
     `work_orders`, `users`, `work_order_attachments`, `work_order_spare_parts_quotes`) — it blocks writes to them,
     not reads, for milliseconds; `ALTER TABLE maintenance_contracts ADD COLUMN … NOT NULL DEFAULT false` is
     metadata-only (no rewrite of the 612 rows) under a sub-second ACCESS EXCLUSIVE; `repair_0002` alters the new,
     empty table (its FK to `users` again takes SHARE ROW EXCLUSIVE briefly). Rehearsed DDL time:
     **86 ms for all 23 statements** on 612 contracts.
4. `docker compose up -d --no-deps api worker`; `/api/v1/health` 200 within 90 s.
5. Web: `git archive` tar of `a79a52e` (SHA-256 in §1) → the usual archive deploy → `docker compose build web && up -d
   web`; content check against the `a79a52e` tree (1,267 files); grep the bundle for «طلبات الإصلاح وأوامر المتابعة».

## 6. Smoke tests (production, no customer messages)

On one internal test customer only:
`GET /work-orders/{id}/repair-requests` → 200 `{items: [], origin: null}`; contract detail returns
`repair_requires_customer_approval=false`; distribution search by a customer mobile returns rows; the work-orders
page shows the sticky «فترة العرض»; a `store_manager` session sees no «تأكيد التركيب» on a work order's parts.
Do NOT record a customer decision, send a quote, or confirm an installation on a real customer.

Watch 30 minutes: api 5xx in `docker compose logs api`; `audit_logs` `REPAIR_REQUEST_*`, `PART_CONSUMED`;
`inventory_movements` only from intended actions; `whatsapp_messages` gains nothing unexpected.

## 7. Rollback

- **Code:** start the `:pre-repair-<ts>` images for api/worker/web (or `git reset --hard bf3d531` in
  `server-ELMS`, rebuild). Old code runs on the new schema — rehearsed: an insert into `maintenance_contracts` that
  does not name the new column gets `false` from the server default; the old code never reads the new table.
- **Schema: do not downgrade by default.** `alembic downgrade saasuse_0001` works (rehearsed: drops the table and
  the column, keeps all contracts, re-upgrade works) but is only acceptable while `work_order_repair_requests` is
  empty and no contract term was amended; afterwards it destroys approvals and their audit context.
- Never restore the pre-release dump over live data unless the whole release window is to be discarded.

## 8. Verification of this candidate (2026-10-28, local, isolated)

- Assembled release tree (`f0a2f37`, clean worktree, no `.env`): compile OK; unit suite + repair, parts demand,
  install confirmation, completion-parts, quote, distribution and contract suites: **1,193 passed, 2 failed** — the
  2 are D3 below and fail identically on `bf3d531`.
- D2 tests (`tests/integration/test_install_confirmation.py`, 3): storekeeper 403 and can still return; supervisor
  without report/proof → 400, proof from another work order → 400, report → 200, proof → 200; audit fields as in §4;
  only the `issue` movement in the ledger; technician completion without parts leaves 2 issued / 0 fitted. A
  mutation check (gate widened back to the old roles) makes the storekeeper test fail.
- AdminPortal `a79a52e`: `tsc -b` clean, `eslint .` 0 errors (44 warnings, none in changed files), `vite build` OK;
  headless render: storekeeper sees «طلب قطعة» and «إرجاع غير المستخدم» only; supervisor's dialog stays disabled
  until a report reference or proof is given and posts `technician_report`.
- Migrations on a production-shaped schema (`bf3d531` models stamped `saasuse_0001`, 612 contracts): lock test,
  real run, old-code insert, backup/restore, downgrade/re-upgrade — all as stated in §3, §5, §7. The full
  repair cycle was proven end-to-end in the UI under real RLS earlier the same day.
- Not testable locally: a restore of the PRODUCTION dump (done on the night, §3.2) and live S3 uploads.

## 9. Decisions and open items

- **D1 (closed):** `769508a` excluded; `.env.bak.5433` untouched by this release.
- **SEC — separate security issue, open, NOT solved by this release:** `/opt/elms/server-ELMS/.env.bak.5433` is
  tracked in git and on disk with mode 644, and contains credentials. Excluding `769508a` only avoids deleting it as
  a side effect. Needs its own task: assess which credentials it holds and whether they are live, rotate as needed,
  untrack and remove it from the working tree, and decide on history rewrite. No key rotation or permission change
  was done here.
- **D2 (closed):** as §4. Field confirmation from AVIX Workers (issued parts per task, fitted quantity, proof
  photo) is a separate future app release.
- **D3 (known, unchanged by this release):** two spare-parts-quote tests stop at the test suite's WhatsApp send
  guard; `test_put_start_date_keeps_ordinals_stable` expects direct date edits removed in `1e148f6`.
