# Sales System Analysis — Backend + AdminPortal + Mobile-Worker

> Snapshot date: 2026-06-11. Written after retiring the finance/installation
> approval stages (status "معتمد من المالية — بانتظار التركيب" replaced by
> "معتمد مبدئيًا"). This is the authoritative map of how the sales subsystem
> actually works in the code today.

---

## 1. The flow end-to-end (as the code stands)

```
MOBILE-WORKER (sales rep)
  └─ creates offer ........................ POST /technicians/sales/contract-requests
       status: pending_review (بانتظار المراجعة)
       upserts preliminary Customer + Site, dedup by phone (last 9 digits)

ADMINPORTAL (sales manager) — /sales
  └─ approves the offer ................... POST .../{id}/status {approved_working}
       status: approved_working (معتمد — قيد العمل)   [MANAGER_ONLY]

MOBILE-WORKER (sales rep)
  ├─ registers calls inside the offer
  ├─ builds/sends the quote (quote starts as sendable `draft`;
  │    quotes can only be created for approved requests — 409 otherwise)
  └─ customer signs → tap "ready to contract" ... POST .../{id}/ready-to-contract
       (flag only — readyToContract=true, NO status change)

ADMINPORTAL (sales manager) — request drawer, ONE toggle primary button:
  • no contract + not signed  → "إنشاء عرض سعر"
  • readyToContract           → "إنشاء العقد" → ContractWizard
       wizard EDITS the request's own Customer/Site in place (PUT, no duplicates)
  └─ build contract ....................... POST .../{id}/build-contract
       status: approved (معتمد مبدئيًا)
       THE single contract-creation trigger:
         Contract (draft) + child (InstallationProject | MaintenanceContract)
         + request.contract_id linked (idempotent) + lead → converted (تم التعاقد)
       requires status == approved_working, gated to MANAGER_ROLES

MOBILE-WORKER
  └─ contract appears in ContractsTab (group=approved), read-only detail
INSTALLATIONS (AdminPortal)
  └─ receives the auto-created InstallationProject under مشاريع التركيب
```

There is **one approval** (the sales manager's) and **one contract trigger**
(build-contract). Quote-level approval and request-level finance/installation
approval are both retired.

---

## 2. Request status machine (backend source of truth)

File: `backend/app/technicians/controllers/sales.py`

| Status | Arabic label | How it's reached | Who |
|---|---|---|---|
| `pending_review` | بانتظار المراجعة | worker creates offer; terminal states reopen here | sales_rep |
| `approved_working` | معتمد — قيد العمل | generic status endpoint | MANAGER_ONLY |
| `approved` | معتمد مبدئيًا | **build-contract only** (ENDPOINT_ONLY) | MANAGER_ROLES |
| `rejected` | مرفوض | generic status endpoint | MANAGER_ONLY |
| `cancelled` | ملغي | generic status endpoint | owner or manager |
| `contacted` / `site_survey` / `quoted` | تم التواصل / معاينة الموقع / تم إصدار عرض سعر | **legacy labels only** — old rows still render; not in the active path | — |

Edges (`REQUEST_STATUS_EDGES`):
- `pending_review → approved_working | rejected | cancelled`
- `approved_working → approved | pending_review | rejected | cancelled`
- `approved → pending_review | cancelled` ; `rejected → pending_review | cancelled` ; `cancelled → pending_review`
- legacy funnel statuses keep permissive edges so old rows aren't stuck
- unknown source statuses are treated permissively; same-status no-op always allowed

**Retired (2026-06-11):** `pending_finance`, `finance_approved`
("معتمد من المالية — بانتظار التركيب"), `finance_rejected`. They are out of
`STATUS_LABELS` (so out of the filter dropdown / statusOptions), rejected by
the generic status endpoint (400), and **migration `sales_reqfin_0032`**
remaps any rows: `finance_approved → approved`, `pending_finance →
approved_working`, `finance_rejected → rejected`. Already applied to the local
dev DB (3 rows moved); runs on the VPS at deploy.

Role sets:
- `SALES_ROLES` = admin, operations_manager, sales_rep, sales_manager, customer_service (read access; shared-pool reads)
- `MANAGER_ROLES` = admin, operations_manager, sales_manager (approve / reject / build-contract)
- `FINANCE_ROLES` = admin, operations_manager, finance_manager (only guards the legacy finance-decision endpoint)

Quote statuses (separate entity, `backend/app/sales/`): `draft → sent →
accepted | rejected | expired`. No approval gate; creation 409s unless the
request is approved; `expire_stale_quotes` scheduler marks past-validity open
quotes expired daily at 03:00.

---

## 3. Key endpoints

Base: `/api/v1/technicians/sales` (requests + leads) and `/api/v1/sales` (quotes/pricing).

| Endpoint | Purpose | Gate |
|---|---|---|
| `POST /contract-requests` | worker creates offer (upserts Customer+Site) | SALES_ROLES |
| `GET /contract-requests` | list; filters mine/group/status/type/search/sort; returns `counts` (per-status, ignores status filter) + `statusOptions` | SALES_ROLES |
| `POST /contract-requests/{id}/status` | generic transition (edge-validated; notes timeline + AuditLog) | owner-or-manager; MANAGER_ONLY for binding states |
| `POST /contract-requests/{id}/ready-to-contract` | worker signals customer signed (flag) | owner |
| `POST /contract-requests/{id}/build-contract` | THE contract trigger; optional confirmed customerId/siteId overrides; resyncs request's denormalized site fields | MANAGER_ROLES |
| `GET /contract-requests/{id}/history` | status history from AuditLog (newest first) | SALES_ROLES |
| `DELETE /contract-requests/{id}` | delete request (quotes FK → SET NULL) | manager |
| `POST /contract-requests/{id}/finance-decision` | **LEGACY — unreachable** (requires pending_finance, which nothing can produce) | FINANCE_ROLES |
| `GET/POST /new-calls`, `/periodic-calls` | unified leads module (CustomerCallLog) — one query path, per-status `counts` + dueToday | SALES_ROLES |
| `POST /sales/quotes`, `.../send`, `.../status` | quotes: create (only for approved requests), send via WhatsApp (tracked WhatsAppMessage row), edge-validated status | sales roles; owner-or-manager mutations |

---

## 4. File map

### Backend
- `app/technicians/controllers/sales.py` — requests + leads: status machine, list/counts, approve, ready-to-contract, build-contract, history, delete
- `app/sales/` — quotes router, `services.py::materialize_contract_from_request` (Contract + child creation, idempotent via `request.contract_id`), `schema.py` (CamelModel Pydantic)
- `app/maintenance/models/contract.py` — `CustomerContractRequest`, `Contract`, `MaintenanceContract`
- `app/installations/model.py` — `InstallationProject`
- `alembic/versions/sales_qmgr_0031_*` — quote approval removal + merges the 5 old alembic heads (single head after)
- `alembic/versions/sales_reqfin_0032_*` — request finance-status retirement (data-only)

### AdminPortal
- `src/pages/sales/SalesRequests.tsx` — main workspace: table⇄kanban, stat filter cards (active statuses always shown; legacy only when count>0), drawer (`?request=id`)
- `src/pages/sales/workspace/` — ApprovalWorkspace, RequestActionBar (toggle primary button), RequestDetailPanel, RequestFilterBar, types
- `src/pages/sales/salesFormat.ts` — status order/colors/severity/edge maps (keeps legacy entries as render fallback)
- `src/pages/sales/SalesQuotes.tsx`, `QuoteBuilderDialog` — quotes (no approval UI)
- `src/pages/sales/SalesNewCalls.tsx` — unified leads page (/sales/calls; /sales/periodic redirects)
- `src/pages/sales/SalesDefaultPricing.tsx` — default pricing
- `src/pages/customers/dialogs/ContractWizard.tsx` — edit-in-place wizard (PUT customer/site, no duplicate records)
- `src/api/index.ts` — `salesApi`, `quotesApi`
- `src/i18n/ar.ts` — all sales strings under `sales.*`

### Mobile-worker
- `src/screens/workstation/sales/OffersTab.tsx` — groups: العروض(all)/قيد المراجعة(review)/المعتمدة(working)/المرفوضة(rejected)
- `SalesOfferCreateScreen.tsx` — lean offer form
- `OfferWorkPanel` / quote actions — calls + quote + ready-to-contract inside an approved offer
- `ContractsTab.tsx` — group=approved contracts, read-only DetailSheet (reads the request's denormalized site fields — resynced by build-contract)
- `NewCallDetailScreen.tsx` — lead detail; register-call allowed only while offer is `approved_working`

---

## 5. Changes made 2026-06-11 (this pass — uncommitted)

1. **Backend** `sales.py`: removed `pending_finance`/`finance_approved`/`finance_rejected` from `STATUS_LABELS` + edges; `ENDPOINT_ONLY_STATUSES={'approved'}`; build-contract requires exactly `approved_working`; removed unused `_FUNNEL_TO_FINANCE`; finance-decision endpoint marked LEGACY (kept only because FinanceApprovals page still calls it).
2. **Migration** `sales_reqfin_0032` (data-only, head after `sales_qmgr_0031`); same remap executed on the local dev DB → the 3 stuck rows now show **معتمد مبدئيًا** (approved = 10).
3. **AdminPortal**: `ar.ts` — `financeApproved` and `approved` both 'معتمد مبدئيًا' (fixes the chip-vs-card label mismatch: chips said 'معتمد — تم إنشاء العقد', cards said 'معتمد مبدئيًا'); `Sidebar.tsx` — removed the dead 30s poll for `finance_approved` (badge for a removed nav child).
4. **Tests**: rewrote `test_sales_approval_pipeline.py` for the simplified flow (+ pinned the retired statuses dead); fixed stale statuses in `test_sales_authz/history/lifecycle/transitions`. Sales suite: 68/68 pass.
5. **Docs**: `docs/SALES_WORKFLOW.md` rewritten to the single-approval model.

Verified: `python -m compileall app` OK, AdminPortal `npm run build` OK, live API
returns clean counts/statusOptions (no finance statuses).

---

## 6. Leftovers / recommendations (not done — need a decision)

| # | Item | Where | Why it matters |
|---|---|---|---|
| 1 | **FinanceApprovals page is live but permanently empty** | `AdminPortal/src/pages/finance/FinanceApprovals.tsx`, route `App.tsx:198`, sidebar entry "اعتماد طلبات التعاقد" + `financePendingCount` badge polling `pending_finance` every 30s | Nothing can ever reach `pending_finance`. Delete page + route + sidebar entry + badge **together with** the backend `finance-decision` endpoint, `RequestFinanceDecisionIn` schema, `salesApi.financeDecision`, and `FINANCE_ROLES`/`_ensure_finance_access` in sales.py. |
| 2 | Dead file `InstallationContractRequests.tsx` | `AdminPortal/src/pages/installations/` (route already redirects to /sales) | Unimported dead code (~400 lines) + its i18n block (`ar.ts` installations `financeApproved: 'بانتظار التركيب'`). Safe to delete. |
| 3 | `group=finance` list filter | backend `sales.py` (~line 365) | Returns empty forever; no client sends it. Remove with item 1. |
| 4 | Legacy finance entries in frontend maps | `salesFormat.ts` (color/severity/order/edges), `SalesRequests.tsx` `STATUS_LABEL`, `canDropTo`, `types/index.ts` status union; mobile `OffersTab.tsx` STATUS_COLORS, `NewCallDetailScreen.tsx` `sentToFinance` | Harmless render fallbacks today; can be trimmed after the migration has run on the VPS. |
| 5 | `pageHelpContent.ts` finance help text still describes the finance→installation pipeline | `AdminPortal/src/pages/finance/pageHelpContent.ts:151` | User-facing help is now wrong; update or remove with item 1. |
| 6 | Stale comment in `scheduler.py:607` mentions quote finance states | `backend/app/_shared/scheduler.py` | Comment only — code is correct. |
| 7 | Contract defaults at build | `materialize_contract_from_request` | Contract is created with `status='draft'` (no auto-visits); confirm ops wants draft-not-active before production rollout. |
| 8 | Pre-existing test debt (unrelated to sales) | `tests/test_maintenance_api.py` collection error (httpx/TestClient version); 4 work-order test failures | Existed before this pass; not touched. |

---

## 7. Operational invariants worth protecting

- **One contract trigger**: only build-contract creates a Contract (idempotent on `request.contract_id`). Never add a second path.
- **`approved` is endpoint-only**: the generic status endpoint must keep refusing it.
- **Quote send is tracked**: every send creates a `WhatsAppMessage` row (failed → مراجعة) — same rule as all messaging.
- **Wizard edits in place**: customer/site step uses PUT on the request's own records; re-introducing "create new" buttons brings back the duplicate-site bug.
- **Worker payloads read denormalized request fields**: anything that repoints `customer_id`/`site_id` must also resync `site_name/city/region/address_text` (build-contract does this).
