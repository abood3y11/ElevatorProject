# ELMS Sales Module — A-to-Z Analysis

> **Update 2026-11-23 — documents.** Sales quotes and contracts now export **Word + PDF from each
> company's own Word template**; the shared `.xlsx` workbooks (`quote_template.xlsx`,
> `contract_template.xlsx`), `app/sales/contract_document.py`, the xlsx cell fillers in
> `quote_document.py` and the `document.xlsx` / `contract-document.xlsx` routes were removed.
> Line references to those below are historical. Current flow: `docs/QUOTE_TEMPLATE_EXPORT.md`.


**Date:** 2026-08-01
**Scope:** the complete sales subsystem across all four surfaces — `backend/app/sales/`, `backend/app/technicians/controllers/sales.py`, `AdminPortal/src/pages/sales/`, `mobile-worker/src/screens/workstation/sales/` — plus persistence, migrations, tests, docs and deploy state.
**Method:** six parallel analysis agents, one per slice (§1–§6 below). Every claim is cited `file:line` and was produced by reading source, not by running the system. The two highest-severity findings (S1, S2) were re-verified by hand against the code before being written down.
**Nothing was modified.** No file edited, no test run, no migration executed, no DB contacted, no commit or push.

---

## 0.1 Executive summary

The sales module is **functionally complete and architecturally coherent**: one funnel, one approval gate, one contract trigger. The 2026-06 simplification pass (retiring the finance/installation approval stages) landed cleanly and is committed and pushed on both server repos.

What it is *not* is finished. Three classes of problem dominate:

1. **Three guard bypasses** let a client reach states the code's own comments say are unreachable — including creating an "approved" request with no contract, and a broken best-effort error handler that turns a non-critical billing failure into a hard 500 on contract creation.
2. **A large dead surface.** The entire leads/calls module is unreachable in the worker app (5 screens, ~2,000 lines); two AdminPortal pages are unrouted or zombie; one whole action kind is unreachable. Ops sees KPIs for screens nobody can open.
3. **Documentation and tests have drifted behind the code.** No sales test has been touched since 2026-06-19 while `app/sales/` changed on 2026-07-30; `docs/FINANCE_MODULE_MAP.md` describes a quote-level finance gate that no longer exists.

The system is safe to run today — none of the findings strand a passenger or corrupt money that is already invoiced. But S1–S3 are reachable by a normal user through the normal UI, and should be fixed before the next sales-facing change.

## 0.2 The module in one picture

```
mobile-worker (field rep)                backend                              AdminPortal (office)
─────────────────────────                ───────                              ────────────────────
SalesOfferCreateScreen  ──POST──►  /technicians/sales/contract-requests
  30 fields, 2 validations            ├─ upsert Customer (exact phone match)
                                      ├─ CREATE a new Site (always)
                                      └─ CustomerContractRequest
                                           status = pending_review          ──►  SalesRequests.tsx
                                                                                  table ⇄ kanban
                                                                                  stat cards, drawer
                                                  │
                       ┌──────────────────────────┤  APPROVAL #1 — sales manager only
                       │                          ▼
                       │                    approved_working                ──►  RequestActionBar
                       │                          │                               primary button:
OffersTab / OfferWork  │                          ├─ POST /sales/quotes           "إنشاء عرض سعر"
  rep calls customer,  │                          │    (409 unless request             │
  shares quote PDF     │                          │     is approved_working)           ▼
                       │                          │    draft → sent → accepted    QuoteBuilderDialog
  rep marks signed ────┴──POST /ready-to-contract  │    (WhatsApp + AuditLog)      xlsx / PDF export
     readyToContract = true  (no notification!)   │
                                                  ▼                                    │
                                            POST /{id}/build-contract  ◄────────  ContractWizard
                                                  │                                (edits customer +
                                                  ├─ Contract (status=draft)        site IN PLACE)
                                                  ├─ MaintenanceContract | InstallationProject
                                                  ├─ draft Invoice  ← best-effort, handler is broken (S1)
                                                  └─ request.status = approved  [ENDPOINT-ONLY]
                                                                                ──►  "عرض العقد"
LEADS / CALLS  ─────────────────────────────────────────────────────────────────────────────────
CustomerCallLog ── one table, two views: /new-calls (+counts) and /periodic-calls (frozen shape)
  worker screens: CallsTab, NewCallsTab, PeriodicCallsScreen, +2 create screens  ◄── ALL UNREACHABLE (S4)
  AdminPortal: SalesNewCalls.tsx at /sales/calls  ◄── live and working
```

**Live route surface**

| Surface | Mount | Endpoints / routes |
|---|---|---|
| Requests + leads API | `/api/v1/technicians/sales/…` | 25 endpoints |
| Quotes + pricing API | `/api/v1/sales/…` | 11 endpoints |
| AdminPortal | `/sales`, `/sales/calls`, `/sales/quotes` | 3 live routes + 4 redirects |
| mobile-worker | `SalesRequestsScreen` | 3 tabs + 1 create form (5 more screens dead) |

**Status machines (both are free-text `String` columns — no enum, no CHECK constraint)**

- **Request:** `pending_review → approved_working → approved` (+ `rejected`, `cancelled`). Legacy-but-still-settable: `contacted`, `site_survey`, `quoted`. Retired by migration `sales_reqfin_0032`: `pending_finance`, `finance_approved`, `finance_rejected`.
  - `approved` is **endpoint-only** (build-contract owns it) — except it isn't, see S2.
  - `{approved_working, rejected}` are manager-only. `cancelled` is **not**.
- **Quote:** `draft → sent → accepted | rejected | expired`, via explicit `QUOTE_STATUS_EDGES` — except `send_quote` bypasses the map entirely, see S3.

## 0.3 Findings register

Severity: **S** = safety/data-integrity or user-reachable breakage · **H** = high · **M** = medium · **L** = low/cleanup.
Every row is cited in full in the section named.

| # | Sev | Finding | Where | §|
|---|---|---|---|---|
| S1 | **S** | `logger` is undefined in `sales.py` — no `import logging`, no module logger. The *only* use is inside `except Exception` in `_open_contract_invoice`. So when invoice creation fails, the handler itself raises `NameError`, `get_db` rolls back, and **contract creation 500s**. The guard that exists to make billing non-critical is what makes it critical. **Verified by hand.** | `sales.py:1550` (no import at `:1-36`) | 2 |
| S2 | **S** | `POST /contract-requests/{id}/update` validates the incoming status only against `ALLOWED_STATUS_TRANSITIONS = set(STATUS_LABELS.keys())`, which **contains `approved`**. It never consults `ENDPOINT_ONLY_STATUSES` or the edge map. A sales manager can therefore set a request to معتمد مبدئيًا with **no Contract, no child project, no invoice, no lead conversion** — directly contradicting the comment three lines above the constant. **Verified by hand.** | `sales.py:66,73,1248-1256` | 2, 6 |
| S3 | **S** | `send_quote` force-sets `"sent"` from any state, bypassing `QUOTE_STATUS_EDGES`. `rejected → sent`, `expired → sent`, and superseded quotes are all sendable. No `valid_until` check, no idempotency — each POST writes another `WhatsAppMessage`, so a double-click double-sends to the customer. | `quotes.py:620-623` | 1 |
| H1 | **H** | `DELETE /contract-requests/{id}` is gated only by `_ensure_sales_access`. Any `sales_rep` or `customer_service` can hard-delete any request, **including one that already has a materialized Contract**. **Verified by hand.** | `sales.py:1104` | 2, 6 |
| H2 | **H** | Quote creation gate only fires when the request is *found*. An omitted or non-existent `request_id` leaves `req=None` → an ungated, unlinked quote is created, which can then never be exported (409 forever). | `quotes.py:326,332,197-214` | 1 |
| H3 | **H** | Lead-status mutation without owner check on `POST /new-calls/{id}/interactions` and the `POST /new-calls` dedupe branch — both can move any lead, including `converted`/`deleted`, bypassing the guard that `POST /new-calls/{id}` does enforce. | `sales.py:1889,1960,2002` | 2 |
| H4 | **H** | "عرض العقد" links to `/contracts?contractId=` — **that route does not exist**; the catch-all dumps the user on the dashboard. (`ContractWizard` uses the correct `/customers/contracts`.) | AdminPortal sales | 4 |
| H5 | **H** | "تحميل المزيد" grows `limit` 30→60→90→120 against a backend `le=100` cap → **422 on the 4th click**, and the error card wipes the already-loaded table. Same bug in `ApprovalWorkspace`, and at 5 clicks in `SalesNewCalls`. | AdminPortal sales | 4 |
| H6 | **H** | Materialization's second idempotency guard *adopts* any existing active/draft contract for the same site+type and **silently discards** the entered `startDate` / `totalValue` / `contractNumber` — while still flipping the request to `approved`. The operator sees success; their data is gone. | `services.py:84,119-130` | 2, 3 |
| H7 | **H** | **The entire worker leads module is unreachable.** `CallsTab` and `NewCallsTab` are imported by nothing; nothing navigates to `PeriodicCalls`; so `NewCallDetail`/`NewCallCreate`/`PeriodicCallCreate` are dead too. The dashboard still shows a "الاتصالات" KPI for a screen the rep cannot open. | mobile-worker sales | 5 |
| M1 | M | `PATCH /quotes/{id}` is a full-body overwrite, not partial — omitting `notes`/`terms`/`payment_terms`/`vat_pct` wipes or resets them. Editing an already-`sent` quote neither bumps `version` nor resets status. | `quotes.py:498-513` | 1 |
| M2 | M | Force-deleting a site CASCADEs `contracts`, which SET NULLs `customer_contract_requests.contract_id` — **that column is the materialize idempotency guard**, so a duplicate contract can then be re-created. | `services.py:119-130` | 3 |
| M3 | M | `readyToContract` sends **no notification**. The backend sets a boolean + AuditLog, yet the app tells the rep "تم إبلاغ مدير المبيعات". The manager only finds out by opening AdminPortal. | `sales.py:1359-1391` | 5 |
| M4 | M | Every offer creates a **brand-new Site**, even when the Customer is reused. Customer matching is exact-string on `contact_phone` while leads dedupe on last-9-digit `phone_norm` — so `+966…` vs `05…` merges the lead but **forks the customer**. | `sales.py:461-503` | 2, 5 |
| M5 | M | Single-record lead responses (`update_new_call`, periodic get/update) call `_call_payload(item)` bare — regressing `callCount` to 1, `lastCallAt` to `createdAt`, and dropping `lastCallerName`/`interactions`. | `sales.py` leads | 2 |
| M6 | M | `contractNumber` is never emitted by `_request_payload`, so the worker's العقود tab always displays `CR-SALES-…` instead of the real contract number. | `sales.py` `_request_payload` | 5 |
| M7 | M | `callDate`/`nextCallDate` are silently dropped on new-call edit (`NewCallUpdateIn` lacks them); `selections` is discarded via `extra="ignore"`; `lookup.periodic` is always `[]`. | `schema.py`, `sales.py` | 5 |
| M8 | M | `StatusStepper` has no `approved_working` label → **blank middle step** on the most common status. | AdminPortal sales | 4 |
| M9 | M | The ContractWizard success Snackbar unmounts before it can render; the wizard permanently dead-ends on a request lacking `customerId`/`siteId`. | AdminPortal sales | 4 |
| M10 | M | Server-side search ignores `customer_name` — the table's own headline column is not searchable. | AdminPortal sales | 4 |
| M11 | M | `seed_default_prices` dedupes on `(category, option_key)` **domain-blind**, but `catalog_0001` scoped pricing uniqueness by `domain` — so a maintenance row can suppress seeding of the installation option. | `seed.py:88-93` | 1, 3 |
| M12 | M | Money math is Decimal and server-authoritative (good), but `subtotal`/`total` are **not quantized to 2dp**, `qty=0` silently becomes 1, VAT is client-overridable and uncapped (ignores the `finance_vat_rate` setting), and `discount_pct` + `discount_amount` can be persisted contradicting each other. | `quotes.py:118-155` | 1 |
| M13 | M | All numbering is Python `MAX+1` with no sequence or lock; `next_quote_number` scans every `QUOTE%-%` row into Python. Concurrency yields IntegrityError 500s, not retries. The customer-app request number `CR-{YYYYMMDD-HHMMSS}` has only second-level entropy and **no random suffix** — a genuine collision risk on a unique column. | `codes.py:253-258`, `portal.py:218-220` | 1, 3 |
| M14 | M | Quote access is completely **un-scoped**: any sales role can read, edit, send and accept *every* quote in the system. (This may be the intended shared-pool decision — it is documented as such for requests, but not for quotes.) | `quotes.py` role sets | 1 |
| M15 | M | `_lead_list_payloads` uses Postgres-only `DISTINCT ON` — the leads list cannot run on SQLite, which is what the test suite uses. | `sales.py` leads | 2 |
| M16 | M | Missing indexes on genuinely hot paths: `customer_call_logs.next_call_date` (the leads page's default sort **and** filter), `quotes.customer_id`, `quotes.superseded_by_id`, `requests.active_quote_id`; no `(created_by_user_id, status)` composite. | migrations | 3 |
| L1 | L | Dead code: `BuildContractDialog.tsx` (zero importers, fully unlocalized), `InstallationContractRequests.tsx` (unrouted), `FinanceApprovals` (live route, but nothing produces `pending_finance` anymore — its button always 409s), the whole `approve` action kind + `ApproveConfirmContext`. Backend: `finance-decision`, `_ensure_installation_access`, `INSTALLATION_ROLES`, `_phone_like`, `group=finance`, `materialize_contract_from_request(quote_id=…)`. | both | 2, 4 |
| L2 | L | ~50 hardcoded Arabic strings remain in AdminPortal sales (placeholders in `CreateSalesRequestDialog`/`QuoteBuilderDialog`/`ContractWizard`, sidebar labels, export filenames) — against CLAUDE.md §13. **RTL itself is clean**: zero physical margin/padding/border props anywhere in `pages/sales/`. | AdminPortal sales | 4 |
| L3 | L | The worker app still hardcodes the three retired `*finance*` statuses. Harmless today (no row can reach them) but it is the kind of stale mapping that silently mislabels a row after the next status change. | mobile-worker | 5 |
| L4 | L | `bgcolor:"#fff"` applied to chips/boxes already sitting on white reads as a botched find/replace that stripped tinted backgrounds. | AdminPortal sales | 4 |
| L5 | L | `toRowVM`/`buildSections`/`sortValue` are copy-pasted between `SalesRequests` and `ApprovalWorkspace`, with two behavioural divergences already present. | AdminPortal sales | 4 |
| L6 | L | `expo-file-system/legacy` is imported without being a declared dependency — it resolves only transitively through `expo`. | mobile-worker | 5 |
| L7 | L | `services.py:134-139` still claims a DB uniqueness on `(site_id, contract_type)` that migration `contract_dropuq_0036` dropped. | `services.py` | 3 |

## 0.4 Test coverage

**68 test functions across 11 `test_sales_*.py` files** (+ `test_quote_number.py` ×3, `unit/test_catalog_category_guards.py` ×12).

| Behaviour | State | Anchor |
|---|---|---|
| build-contract materialization | **COVERED** (12 tests) | `test_sales_approval_pipeline.py` |
| Request + quote status edge maps | **COVERED** | `test_sales_transitions.py` |
| `approved` is endpoint-only | **COVERED** | `test_sales_approval_pipeline.py` |
| Retired finance statuses | **COVERED** | `test_sales_approval_pipeline.py` |
| Quote totals / draft status / send tracking / audit | **COVERED** | `test_sales_quotes.py`, `test_sales_quote_messaging.py` |
| Leads filters / counts / dueToday | **COVERED** (18 tests) | `test_sales_leads.py` |
| Validation + camel/snake casing | **COVERED** | `test_sales_validation.py` |
| `DELETE /contract-requests/{id}` | **NOT COVERED** → H1 shipped untested | — |
| `POST /{id}/update` | **NOT COVERED** → S2 shipped untested | — |
| `/ready-to-contract`, `/{id}/calls`, `/execution`, `/lookup-phone` | **NOT COVERED** | — |
| `PATCH /quotes/{id}`, quote versioning/supersede | **NOT COVERED** → M1 untested | — |
| All document exports (xlsx/PDF) | **NOT COVERED** | — |
| `_link_calls_to_contract`, `_open_contract_invoice` | **NOT COVERED** → S1 untested | — |
| Request list filters + counts | **NOT COVERED** | — |

**The correlation is not a coincidence: every S/H-severity backend finding sits in an untested endpoint.**

Five tests carry lying docstrings or dead targets — notably `test_sales_transitions.py` claiming quote `finance_decision` "still works" (removed) and `test_sales_lifecycle_contract.py` calling build-contract "installation-manager, finance-gated" (it is sales-manager only).

## 0.5 Documentation drift

| Doc | State |
|---|---|
| `docs/QUOTE_TEMPLATE_EXPORT.md` | **Accurate** — the only one. |
| `docs/SALES_SYSTEM_ANALYSIS.md` | 22 stale statements: §5 still labelled "uncommitted" (shipped in `0bc1b08`), wrong `ContractWizard` path, `SalesDefaultPricing` route now redirects to `/settings/catalog`, alembic chain continued past `0033`/`0034`, `quoted` still actively written by `quotes.py:413`, and the draft-`Invoice` fan-out at build-contract documented nowhere. |
| `docs/SALES_WORKFLOW.md` | Single-approval model is correct; endpoint-level details drifted. |
| `docs/FINANCE_MODULE_MAP.md` | **Most drifted** — 6 statements about a quote-level finance gate (`POST /quotes/{id}/finance`, `SalesQuotesFinance.tsx`, `finance_by_user_id`/`finance_at`, `quotesApi.financeDecision`) that no longer exist anywhere. |

## 0.6 Deploy & git state (verified 2026-08-01)

| Repo | Branch | Uncommitted | Remote state |
|---|---|---|---|
| `backend` | `main` @ `b0e4139` | **0 files** | = `origin/main`, 0 ahead / 0 behind |
| `AdminPortal` | `main` @ `ec1ff05` | **0 files** | = `origin/main`, 0 ahead / 0 behind |
| `mobile-worker` | `feat/sales-offer-screen` | **0 files** | **no upstream and no git remote at all** — 69 commits of sales screens exist only on this machine |
| monorepo root (holds `docs/`) | `main` | 0 files | **5 ahead, 1 behind** — both sales docs unpushed |

**Alembic: a single head, `wa_conv_read_0001`** (down_revision `catalog_0001`), confirmed by parsing all 105 migration files — no dangling refs, one versions dir. `sales_qmgr_0031` is the merge point that collapsed the old open heads; everything after it is strictly linear (33 revisions to head). 29 migrations touch sales tables; 4 are data-only.

**Production migration state is inferred, not verified.** Because the chain is linear, the recorded `user_avatar_0001` VPS deploy implies everything through `contract_dropuq_0036` is applied. `catalog_0001` and `wa_conv_read_0001` (both 2026-07-30) are **unknown** — and `catalog_0001` is the one non-idempotent migration in the set. **Check `alembic current` on the VPS before the next deploy.**

⚠️ **The mobile-worker risk is the largest operational one on this page** and is not a code bug: 69 commits of the field sales app have no remote. A disk failure loses the entire worker sales experience.

## 0.7 Recommended order of work

Each item is independent; the order is by risk-per-unit-effort.

1. **S1** — add `import logging` + `logger = logging.getLogger(__name__)` to `sales.py`. One line, removes a 500 on contract creation. Add the missing test.
2. **Push mobile-worker.** Create the remote, push `feat/sales-offer-screen`. No code change, removes total-loss risk.
3. **S2** — make `/update` consult `ENDPOINT_ONLY_STATUSES` and the edge map, exactly as the generic status endpoint does. Test pinning "manager cannot reach `approved` via `/update`".
4. **H1** — add the manager gate + a has-contract check to `DELETE /contract-requests/{id}`. Test.
5. **S3, H2** — make `send_quote` respect `QUOTE_STATUS_EDGES`; make the quote-creation gate reject a missing/unknown `request_id` instead of falling through.
6. **H4, H5** — two small AdminPortal fixes, both user-visible on the happy path (broken contract link, 422 on the 4th "load more").
7. **H7** — decide the worker leads module: wire it up or delete it and its dashboard KPI. Do not leave it half-present.
8. **H6, M2** — tighten materialization: never silently discard operator-entered contract data; reconsider the SET NULL on the idempotency guard.
9. **Docs** — `FINANCE_MODULE_MAP.md` first (most wrong), then `SALES_SYSTEM_ANALYSIS.md`.
10. **Cleanup sweep** — L1 dead code, L2 hardcoded strings, L3 stale statuses, in one commit per app.

Per CLAUDE.md §9 (dispatch/messaging logic needs tests in the same PR) and §10 (backend and frontend commit separately), items 1/3/4/5 each want a failing test written first.

---

## 0.8 How this analysis was produced

Six agents ran in parallel, one per slice, each reading source only:

| Agent | Slice | Output |
|---|---|---|
| 1 | `/sales/*` router — quotes, pricing, documents | §1 |
| 2 | Contract requests, approval pipeline, leads | §2 |
| 3 | Data model, migrations, integrity | §3 |
| 4 | AdminPortal sales frontend | §4 |
| 5 | mobile-worker field sales app | §5 |
| 6 | Tests, doc drift, git/deploy state | §6 |

The full per-slice reports follow. They are the evidence for the register above and go substantially deeper — every endpoint, every column, every screen.

---

## 1. Backend — `/sales/*` router (quotes, pricing, documents)

### 1.0 Mounting & shape

| Fact | Value | Cite |
| --- | --- | --- |
| Aggregator | `app/sales/router.py` includes `pricing_router` + `quotes_router`, no own prefix | `backend/app/sales/router.py:7-9` |
| Mounted at | `api_router.include_router(sales_router, prefix="/sales", tags=["Sales"])` | `backend/app/api/router.py:248` |
| Global prefix | `app.include_router(api_router, prefix=settings.API_V1_PREFIX)`, `API_V1_PREFIX = "/api/v1"` | `backend/app/main.py:460`, `backend/app/_shared/config.py:24` |
| **Effective base** | `/api/v1/sales/quotes*`, `/api/v1/sales/pricing*` | — |
| Sub-prefixes | `APIRouter(prefix="/quotes")`, `APIRouter(prefix="/pricing")` | `backend/app/sales/controllers/quotes.py:27`, `backend/app/sales/controllers/pricing.py:30` |

Module files: `router.py`, `controllers/{quotes,pricing}.py`, `models/{quote,default_price,customer_call,call_interaction}.py`, `schema.py`, `services.py`, `quote_document.py`, `contract_document.py`, `seed.py`, `templates/{quote_template.xlsx,contract_template.xlsx}` (only two assets in `templates/`).

Note: `services.py` (`materialize_contract_from_request`) and `contract_document.py` live in this package but are **not** wired into the `/sales` router — they are called from `app/technicians/controllers/sales.py` (`backend/app/technicians/controllers/sales.py:1059,1081`). Likewise `models/customer_call.py` + `models/call_interaction.py` back the `/technicians/sales/new-calls*` endpoints, not `/sales/*`.

---

### 1.1 Every endpoint

Auth on **all 9** endpoints: `Depends(get_current_user)` = JWT bearer (`backend/app/api/deps.py:38-74`); 401 on bad token, 403 if `is_active` false. No `RoleChecker` dependency is used — role gating is a manual call inside each handler.

| # | Method + full path | Handler | Role gate | Request | Response |
| --- | --- | --- | --- | --- | --- |
| 1 | `GET /api/v1/sales/quotes` | `list_quotes` | `_ensure_sales_access` (SALES_ROLES) `quotes.py:166` | query `request_id: UUID?`, `status: str?` (alias of `status_filter`), `limit: int=50 [1..200]` | `{items: QuotePayload[], total: int}` `quotes.py:173` |
| 2 | `GET /api/v1/sales/quotes/{quote_id}` | `get_quote` | same `quotes.py:182` | path UUID | `QuotePayload`; 404 `العرض غير موجود` |
| 3 | `GET /api/v1/sales/quotes/{quote_id}/document.docx` | `quote_document_docx` | `quotes.py` | path UUID | the company's Word quote (`build_quote_document`); the `.xlsx` route was removed 2026-11-23 |
| 4 | `GET /api/v1/sales/quotes/{quote_id}/document.pdf` | `quote_document_pdf` | `quotes.py` | path UUID | that same .docx via LibreOffice; **503** no LibreOffice / **502** render error (Arabic, `app/sales/document_pdf.py`) |
| 5 | `POST /api/v1/sales/quotes` (201) | `create_quote` | same `quotes.py:319` | `QuoteIn` | `QuotePayload`; 400 no items, 409 request not approved |
| 6 | `PATCH /api/v1/sales/quotes/{quote_id}` | `update_quote` | same `quotes.py:484` | `QuoteIn` (full body, not partial) | `QuotePayload`; 404, 409 if `status == "accepted"` |
| 7 | `POST /api/v1/sales/quotes/{quote_id}/send` | `send_quote` | same `quotes.py:568` | `QuoteSendIn {phone?}` | `QuotePayload`; 400 no phone, **502** on provider failure `quotes.py:648-652` |
| 8 | `POST /api/v1/sales/quotes/{quote_id}/status` | `set_quote_status` | same `quotes.py:664` | `QuoteStatusIn {status}` | `QuotePayload`; 400 unknown status, 409 illegal edge |
| 9 | `GET /api/v1/sales/pricing/defaults` | `get_default_prices` | `_ensure_sales_access` (SALES_ROLES) `pricing.py:106` | query `domain: str = "installation"` | `{domain, groups[], currency:"SAR"}` |
| 10 | `PUT /api/v1/sales/pricing/defaults` | `save_default_prices` | **`_ensure_pricing_edit_access`** (admin / operations_manager / sales_manager) `pricing.py:130` | `SaveDefaultPricesRequest {items[]}`, query `domain` | `{domain, groups[], currency, created, updated}`; 400 empty / missing keys / negative price |
| 11 | `POST /api/v1/sales/pricing/calculate` | `calculate_price` | `_ensure_sales_access` `pricing.py:203` | `CalculatePriceRequest {selections{}, addons[]}` | `CalculatePriceResponse {total, currency, breakdown[], unmatched[]}` |

Role sets (identical read set in both controllers):

```python
SALES_ROLES = {"admin", "operations_manager", "sales_rep", "sales_manager", "customer_service"}   # quotes.py:29, pricing.py:33-39
PRICING_EDIT_ROLES = {"admin", "operations_manager", "sales_manager"}                              # pricing.py:41
```

`QuotePayload` (camelCase, hand-built dict — no `response_model`, so it is absent from the OpenAPI schema) — `backend/app/sales/controllers/quotes.py:87-115`:
`id, quoteNumber, requestId, customerName, customerPhone, lineItems[], subtotal, discountPct, discountAmount, vatPct, vatAmount, total, currency, paymentTerms[], validUntil, notes, terms, status, statusLabel, sentAt, sentChannel, createdAt, version, supersededById, isSuperseded, templateOverrides{}`.

Write bodies accept **both** camelCase and snake_case (`CamelModel`: `populate_by_name=True`, `alias_generator=to_camel`, `extra="ignore"`) — `backend/app/sales/schema.py:74-83`. Blank strings are coerced to `None`, but malformed non-blank values still 422 (`_blank_to_none` + `condecimal(ge=0)` / `conint(ge=0)` / `date`) — `backend/app/sales/schema.py:31-71`.

---

### 1.2 Data model (`backend/app/sales/models/`)

All four models inherit `Base, TimestampMixin` → `created_at`, `updated_at` (naive UTC, `default=utcnow`, `onupdate=utcnow`) — `backend/app/_shared/db/base.py:16-21`.

#### `quotes` — `backend/app/sales/models/quote.py:16-66`

| Column | Type | Null | Default | FK / index |
| --- | --- | --- | --- | --- |
| `id` | GUID PK | no | `uuid4` | |
| `quote_number` | String(50) | no | — | **unique**, indexed (`:20`) |
| `request_id` | GUID | yes | — | → `customer_contract_requests.id` `ON DELETE SET NULL`, indexed (`:22`) |
| `customer_id` | GUID | yes | — | → `customers.id` `ON DELETE SET NULL` (`:23`) |
| `customer_name` / `customer_phone` | String(255)/(50) | yes | — | snapshot of contact at creation |
| `line_items` | JSONB | yes | — | `[{label, qty, unitPrice, total}]` (`:28-29`) |
| `subtotal` | Numeric(12,2) | no | 0 | |
| `discount_pct` | Numeric(5,2) | no | 0 | |
| `discount_amount` | Numeric(12,2) | no | 0 | |
| `vat_pct` | Numeric(5,2) | no | **15** | (`:33`) |
| `vat_amount` | Numeric(12,2) | no | 0 | |
| `total` | Numeric(12,2) | no | 0 | |
| `currency` | String(8) | no | `"SAR"` | (`:36`) |
| `payment_terms` | JSONB | yes | — | `[{label,pct,days,when}]` |
| `valid_until` | Date | yes | — | drives the nightly expiry job |
| `notes`, `terms` | Text | yes | — | |
| `status` | String(20) | no | `"draft"` | indexed; `draft\|sent\|accepted\|rejected\|expired` (`:47-48`) |
| `sent_at` | DateTime | yes | — | naive UTC |
| `sent_channel` | String(20) | yes | — | only ever `"whatsapp"` (`quotes.py:623`) |
| `created_by_user_id` | GUID | yes | — | → `users.id` |
| `version` | Integer | no | 1 | per-request re-quote counter |
| `superseded_by_id` | GUID | yes | — | **self-FK** → `quotes.id` `SET NULL` (`:57`) |
| `template_overrides` | JSONB | yes | — | `{cellRef: text}` written verbatim on export (`:59-63`) |

No SQLAlchemy `relationship()` on `Quote` at all — every join is a manual `db.query(...)`.

Migration history: `sales_quote_0012_add_quotes.py` (create), `sales_quote_fin_0013` (added `finance_note/finance_by_user_id/finance_at`), `sales_qver_0015` (`version`, `superseded_by_id`, `customer_contract_requests.active_quote_id`), `sales_qmgr_0031` (**drops** the three finance columns and collapses 6 legacy approval statuses to `draft`; also a 5-head alembic merge), `sales_qovr_0033` (`template_overrides`).

#### `sales_default_prices` — `backend/app/sales/models/default_price.py:16-55`

`id` GUID PK; `domain` String(32) not null default `"installation"` indexed (`:27`); `category` String(50) not null indexed; `option_key` String(100) not null; `option_label` String(255) not null; `price` Numeric(12,2) not null default 0; `currency` String(8) not null default `"SAR"`; `is_active` Boolean not null default True; `sort_order` Integer not null default 0; `updated_by_user_id` GUID → `users.id`.
Unique: `("domain","category","option_key")` = `uq_sales_default_prices_domain_category_option` (`:47-52`), replacing the older `(category, option_key)` constraint in `alembic/versions/catalog_0001_catalog_categories_and_pricing_domain.py:110-118`.

#### `customer_call_logs` — `backend/app/sales/models/customer_call.py:16-57` (not served by `/sales/*`)

`worker_user_id`→users, `worker_name`, `customer_id`→customers SET NULL, `customer_name` (not null), `phone`, `phone_norm` String(9) indexed (last-9 dedupe key, partial unique index), `address`, `call_date`, `register_note`, `worker_note_1/2`, `status` default `"new"` (`new|interested|following|not_interested|converted|deleted`, `:46-47`), `customer_type` default `"individual"` (`individual|company`), `source` default `"rep_own"` (`company_assigned|rep_own`), `classification`, `last_call_date`, `next_call_date`.

#### `customer_call_interactions` — `backend/app/sales/models/call_interaction.py:17-36`

`call_log_id` → `customer_call_logs.id` **CASCADE** not null indexed; `worker_user_id`, `worker_name`, `outcome` String(30) not null default `"other"` (`interested|not_interested|no_answer|callback|converted|other`, `:28-29`), `note`, `interaction_date`; `lead = relationship("CustomerCallLog", backref="interactions")` (`:33`) — the only relationship in the package.

---

### 1.3 Quote state machine

Exact constants — `backend/app/sales/controllers/quotes.py:30-49`:

```python
QUOTE_STATUS_LABELS = {
    "draft": "مسودة", "sent": "أُرسل للعميل", "accepted": "مقبول",
    "rejected": "مرفوض", "expired": "منتهي",
}

QUOTE_STATUS_EDGES: dict[str, set[str]] = {
    "draft":    {"sent", "accepted", "rejected", "expired"},
    "sent":     {"accepted", "rejected", "expired", "draft"},
    "accepted": {"sent", "draft"},
    "rejected": {"draft"},
    "expired":  {"draft", "sent"},
}
```

`_quote_transition_allowed` (`quotes.py:52-63`): no-op (`old == new`) always allowed; **unknown source status ⇒ permissive** (`allowed is None → True`). Enforced only in `set_quote_status` (`quotes.py:672`).

Other status writers **bypass the edge map**:
- `send_quote` sets `status = "sent"` directly on success from any state (`quotes.py:620-623`) — including `rejected`, which the edge map forbids.
- `expire_stale_quotes` (nightly 03:00 cron) sets `"expired"` for `valid_until < today AND status NOT IN {expired, rejected, accepted}` — `backend/app/_shared/scheduler.py:624-674`, registered at `backend/app/_shared/scheduler.py:1029-1036`. Its docstring still mentions the deleted `pending_finance/finance_*` states (`scheduler.py:645-647`).
- Historic states `pending_finance | finance_approved | finance_rejected | pending_manager_approval | manager_approved | manager_rejected` were data-migrated to `draft` — `alembic/versions/sales_qmgr_0031_quote_manager_approval.py:44-52,73-78`. There is **no quote-level approval step anymore**; the gate moved to the request (`quotes.py:38-42`).
- Accepting a quote explicitly does **not** create a `Contract` — that only happens in the installation-manager `build-contract` step (`quotes.py:683-687`).

---

### 1.4 Business rules & guards

**Creation gate.** A quote may only be built for a request in `{"approved_working", "approved"}`, else 409 `لا يمكن إنشاء عرض سعر قبل اعتماد الطلب من مدير المبيعات` (`quotes.py:332-336`). **The gate only fires when the request was found** — `request_id=None` *or a non-existent `request_id`* silently yields `req=None` and an ungated, unlinked quote (`quotes.py:326`).

**At least one line item.** `_compute` drops items with a blank label; empty result ⇒ 400 `يجب إضافة بند واحد على الأقل` (create `quotes.py:322-323`, update `quotes.py:495-496`).

**Edit gate.** `status == "accepted"` ⇒ 409 `لا يمكن تعديل عرض مقبول` (`quotes.py:488-492`). Everything else — including an already-`sent` or superseded quote — is editable in place, with no version bump and no status reset.

**Send gate.** Only "a phone must exist" (`payload.phone or q.customer_phone`, else 400) — `quotes.py:572-574`. No status/validity/supersession check, no idempotency key: re-POSTing `/send` re-sends and writes another `WhatsAppMessage` row every time.

**Numbering** (`quotes.py:368-376`):
- With a resolvable customer: `next_quote_number(db, customer)` → `QUOTE{customer_number}-{global_seq}` where seq = max trailing integer over **all** `QUOTE%-%` rows + 1 — `backend/app/_shared/codes.py:241-258`.
- Otherwise legacy fallback `_quote_number()` → `Q-{YYYYMMDD-HHMMSS}-{uuid4hex[:6]}` (`quotes.py:83-84`).

**Versioning / supersession** (`quotes.py:349-362, 402-406`): `version = max(existing.version) + 1` per request; every prior quote of that request whose status ∉ `{expired, rejected, accepted}` gets `superseded_by_id = new.id`.

**Request side-effects on create** (`quotes.py:412-416`): `req.status = "quoted"` unless already in `{approved_working, approved, rejected, cancelled}`; always `req.manual_price = total` and `req.active_quote_id = quote.id`. `update_quote` also re-syncs `req.manual_price` (`quotes.py:516-519`).

**Money math** — `_compute`, `backend/app/sales/controllers/quotes.py:118-155`, all in `Decimal`:

```
line_total = unit_price * qty                     # qty falsy → 1 (0 becomes 1)
subtotal   = Σ line_total                          # NOT quantized
disc_amt   = payload.discount_amount
             or (subtotal * discount_pct / 100).quantize(0.01)   # pct only used when amount is 0/absent
taxable    = max(subtotal - disc_amt, 0)
vat_pct    = payload.vat_pct ?? 15                 # client-supplied, no cap
vat_amount = (taxable * vat_pct / 100).quantize(0.01)
total      = taxable + vat_amount                  # NOT quantized
```

Client-sent totals are always ignored/recomputed (schema comment `schema.py:383-385`, test `tests/integration/test_sales_quotes.py:60`). Currency: `payload.currency or "SAR"` on create (`quotes.py:391`), same on update only if the key is present (`quotes.py:510-511`); pricing endpoints hardcode `DEFAULT_CURRENCY = "SAR"` and ignore each row's own `currency` when summing (`pricing.py:43,231,256-261`).

**Pricing rules.** `PUT /pricing/defaults`: rejects empty `items` (400), requires `category`+`optionKey`+`optionLabel` per row (400), rejects negative price (400), unparsable price silently becomes 0 (`pricing.py:151-159`); upsert keyed on `(category, option_key)` within the query-string `domain`; no deletes. `POST /pricing/calculate`: matches active rows by exact `option_key` **or** whitespace-collapsed casefolded `option_label`, per category; unmatched selections are reported in `unmatched[]` rather than erroring (`pricing.py:214-254`). `GET /pricing/defaults` lazily seeds the 7 installation categories at price 0 on first use, only when the installation domain is empty (`pricing.py:110-114`, `seed.py:87-114`).

---

### 1.5 Side effects

| Effect | Where | Detail |
| --- | --- | --- |
| `WhatsAppMessage` row | `quotes.py:594-617` | Always written, success **and** failure (`status = "sent" \| "failed"`), `direction="outbound"`, `message_type="text"`, `template_name="sales_quote"`, `to_phone` = normalized phone from the send result, `customer_id = q.customer_id`, `sent_at = utcnow()`, `raw_payload = {metadata, provider_response, send_result minus response/access_token}`, `provider_message_id` from `response.messages[0].id`. Committed **before** the 502 is raised (`quotes.py:625-627`) — satisfies CLAUDE.md §6. |
| WhatsApp body | `_build_whatsapp_message` `quotes.py:536-557` | Free-text (not a Meta template): number, customer, **first 15** line items, discount, VAT line, total, payment terms, validity, notes. Sent via `WhatsAppService(db).send_text_message` (`backend/app/_shared/infra/whatsapp_service.py:549`), which never raises — always returns `{success, detail, ...}` (`whatsapp_service.py:616-624`). Free text only works inside the 24h Meta window. |
| `AuditLog` rows, `entity_name="sales_quotes"` | `quotes.py:421-435, 524-532, 631-646, 691-700` | `CREATE`, `UPDATE`, `SEND_WHATSAPP` / `SEND_WHATSAPP_FAILED`, `STATUS_CHANGE`. `AuditLog.log` **commits internally** (`backend/app/users/models/audit.py:104-105`) — a second commit after the handler's own. These rows are what the request pipeline timeline renders (`backend/app/technicians/controllers/sales.py:626-651`). |
| `AuditLog` for pricing | `pricing.py:176-184` | One `UPDATE` on `sales_default_prices` per bulk save, `entity_id = current_user.id` (**not** a price row id), `new_value={created,updated,total}`. |
| Document generation | `app/maintenance/services/contract_document.py` | **Changed 2026-11-23:** the company's own Word template (`build_quote_document` / `build_contract_document`); PDF = the same .docx converted. The xlsx workbook fillers described in earlier revisions of this audit were removed — see `docs/QUOTE_TEMPLATE_EXPORT.md`. |
| PDF generation | `render_pdf` `quote_document.py:442-482` | Headless `soffice --convert-to pdf` in a temp dir with a private profile, 120 s timeout; binary found via `LIBREOFFICE_BIN`, PATH, or the Windows install dirs (`:423-439`). `LibreOfficeNotAvailable` → 503; other `RuntimeError` → 502. |
| Company settings read | `_quote_defaults` `quotes.py:217-234` | `quote.speed`, `quote.warranty_period`, `quote.validity_days`, `company.name/owner/title/tax_number` via `CompanySettingsService` (`backend/app/settings/service.py:15,35,49`). |
| Filename | `_content_disposition` `quotes.py:189-194` | ASCII fallback + RFC 5987 UTF-8 for `عرض سعر <اسم العميل>.{xlsx,pdf}`; customer name resolved from the real `Customer` row, falling back to contact/quote number (`quotes.py:237-248`). |
| **No PNG, no S3** | — | The quote path produces xlsx/PDF only and streams them; nothing is uploaded. (PNG export exists only on the unrelated work-order spare-parts quote, `backend/app/work_orders/controllers/spare_parts_quote.py`.) |
| `materialize_contract_from_request` | `backend/app/sales/services.py:84-217` | Lives here but is **not** reachable from `/sales/*`; idempotent (request→contract link, then site+type lookup), flush-only (caller owns the transaction), creates `Contract` + `MaintenanceContract` or `InstallationProject`, contract number via `next_contract_number` or `CON-{request_number}`, default 1-year term. |

---

### 1.6 Risks / gaps

**Correctness / business**

1. **Creation gate bypass.** `create_quote` resolves `req` and skips the approval check entirely when it is `None` (`quotes.py:326,332`). A bogus or omitted `request_id` produces an unapproved, unlinked quote with a legacy `Q-…` number. There is no 404 for an unknown `request_id`.
2. **`send_quote` ignores the state machine.** It force-sets `"sent"` (`quotes.py:620-623`), so `rejected → sent` and `expired → sent` happen without passing `QUOTE_STATUS_EDGES`, and an already-superseded quote can be sent to the customer. No check on `valid_until` either — an expired-by-date quote is sendable until the 03:00 job runs.
3. **Editing a `sent` quote is silent.** `update_quote` rewrites totals on a quote the customer already received, without bumping `version`, creating a new quote, or resetting `status` to `draft` (`quotes.py:474-533`). The audit row only records the new total, never the old one (`quotes.py:524-532` passes no `old_value`).
4. **`PATCH` is not a partial update.** `notes`, `terms`, `payment_terms` and all money fields are unconditionally overwritten from the body (`quotes.py:498-513`) while `valid_until`, `currency`, `template_overrides` are conditional. A client that PATCHes only `line_items` wipes notes/terms/payment terms and resets `vat_pct` to 15.
5. **Quote-number race + O(n) scan.** `next_quote_number` loads every `QUOTE%-%` number into Python on each create and does `max+1` (`backend/app/_shared/codes.py:253-258`). Two concurrent creates get the same number → `uq_quotes_quote_number` IntegrityError surfacing as a 500; and the scan grows linearly with the quote table.
6. **Discount fields can disagree.** When both `discount_pct` and `discount_amount` are sent, the amount wins but the pct is persisted verbatim (`quotes.py:137-140`) — the stored row can read "10% / 500 SAR" on a 10,000 subtotal. `discount_amount > subtotal` is accepted (taxable clamps to 0) and stored as-is.
7. **Unbounded `vat_pct` / qty coercion.** `vat_pct` is any client `Decimal ≥ 0` (`schema.py:410`), silently defaulting to 15 when omitted — VAT is never read from the finance config (`finance_vat_rate` used elsewhere in the app). `qty = 0` becomes `1` (`quotes.py:129-130`).
8. **`subtotal`/`total` are not quantized** to 2dp (`quotes.py:148,154`); only `discount_amount`/`vat_amount` are. The DB `Numeric(12,2)` rounds on write, so the response body (built from the refreshed row on create, but from `computed` semantics on the wire) can differ by sub-cent amounts from the arithmetic the client shows.
9. **Seed skips rows across domains.** `seed_default_prices` checks existing `(category, option_key)` **without** filtering `domain` (`backend/app/sales/seed.py:89-94`) while the unique constraint and all reads are domain-scoped. If maintenance rows are created first (catalog page), the matching installation options are never seeded. Seeded rows also never set `domain` explicitly — they rely on the model default.
10. **Duplicate keys in one pricing PUT → 500.** `existing` is not updated as new rows are added (`pricing.py:161-166`), so two payload items with the same `(category, option_key)` insert twice and violate the unique constraint at commit.
11. **`domain` query param is unvalidated** on `GET`/`PUT /pricing/defaults` (`pricing.py:104,128`) — any string creates/reads a private price namespace. `POST /pricing/calculate` has **no** `domain` param at all and hardcodes `DEFAULT_DOMAIN` (`pricing.py:205`), so maintenance selections can never be priced through it.
12. **Label source inconsistency.** `get_default_prices` prefers `catalog_categories` labels (`pricing.py:118`), but `calculate_price` builds `categoryLabel` from the hardcoded `CATEGORY_LABELS` (`pricing.py:235,249`) — a category renamed in the catalog page shows the old label in the breakdown.

**Authorization / data exposure**

13. **Flat, un-scoped access.** Any of the 5 SALES_ROLES (incl. `customer_service`) can read, edit, send and re-status **every** quote in the system; there is no owner-or-manager check like the request endpoints have (`backend/app/technicians/controllers/sales.py:1105-1107`). Notably `sales_rep` can move a quote to `accepted`.
14. **`_ensure_sales_access` in `quotes.py:66-69` will 500 on a dangling role.** `{ur.role.name for ur in user.roles}` has no `ur.role is not None` guard — the pricing twin does (`pricing.py:47`), as does the sales timeline (`technicians/controllers/sales.py:1078`).
15. **N+1 on every request.** `User.roles` and `UserRole.role` are default-lazy (`backend/app/users/models/user.py:34,79`), so the role gate issues 1 + N queries per call, on all 11 endpoints.

**Robustness / API hygiene**

16. **`total` in `list_quotes` is `len(items)`** (`quotes.py:173`), i.e. capped at `limit` — it is not the match count, and there is no `offset`, so the list is not paginable past 200.
17. **`status` filter is unvalidated** (`quotes.py:170-171`): a typo returns an empty list instead of a 400.
18. **No `response_model` on any quote endpoint** — the payload is a hand-built dict, so the OpenAPI schema documents nothing and drift with the AdminPortal types is undetectable at build time.
19. **Document endpoints 409 on standalone quotes.** `_load_quote_with_request` requires a linked request (`quotes.py:197-214`), so a quote created without one (see #1) can never be exported — the failure appears only at download time.
20. **`fill_quote_template` failures are unhandled.** A missing template file raises `FileNotFoundError` (`quote_document.py:295-296`) → 500 for the xlsx route, with no Arabic-facing message; the PDF route only maps `LibreOfficeNotAvailable`/`RuntimeError`.
21. **Synchronous LibreOffice in the request path.** Up to 120 s blocking subprocess per PDF (`quote_document.py:472`), on a sync `def` endpoint (runs in the threadpool) — a handful of concurrent PDF requests can starve it. No caching of a rendered document.
22. **`apply_overrides` writes arbitrary text into arbitrary cells** (`quote_document.py:206-219`). `_overrides_from` only checks the key *looks* like an A1 ref (`quotes.py:440-453`) — no sheet-range whitelist, so any sales-role user can overwrite price/legal cells of the exported quote, and the exported document can disagree with the stored `total`.
23. **Add-on toggles are keyword-guessed** from free text (`_TOGGLE_KEYWORDS`, `quote_document.py:141-157`) — e.g. `"16"` matches any add-on string containing 16, and `"طوارئ"` maps to the battery flag. Silent mis-rendering of the contractual spec.
24. **Stale comments/dead code.** The `expire_stale_quotes` docstring still describes the removed finance states (`scheduler.py:645-647`); `_clean_str` exists only to preserve pre-Pydantic behavior (`quotes.py:72-74`); `sales_quote_fin_0013` adds columns that `sales_qmgr_0031` drops; `QUOTE_STATUS_EDGES`'s "Finance-only target states are rejected separately by the endpoint" comment (`quotes.py:56-57`) refers to a check that no longer exists.
25. **`_quote_transition_allowed` is fail-open** for unknown source statuses (`quotes.py:60-62`) — legacy/garbage `status` values allow any move.
26. **No idempotency anywhere**: repeated `POST /send` and repeated `POST` (create) both duplicate freely; the only guard is the DB unique constraint on `quote_number`.
27. **Audit vs. transaction ordering.** `AuditLog.log` commits on its own (`audit.py:105`); in `create_quote` it runs after `db.commit()`/`refresh` so a failure there leaves the quote committed with no audit trail (fails the request with a 500 while the quote exists).

**Existing test coverage** (not run): `tests/integration/test_sales_quotes.py` (server-side recompute, discount-before-VAT, `draft` initial state), `test_sales_quote_messaging.py` (sent/failed `WhatsAppMessage` rows, 502, all four audit actions), `test_sales_quote_approval.py` (approved-request gate, rep cannot self-unlock, decision endpoint removed), `test_quote_number.py` (global sequence, legacy numbers ignored). No tests cover `PATCH`, the document endpoints, `set_quote_status` edges, or any `/sales/pricing/*` endpoint.
## 2. Backend — sales contract requests, approval pipeline & leads

**Primary file:** `C:\Dev\ElevatorProject\backend\app\technicians\controllers\sales.py` (2,332 lines, 25 endpoints)

### 2.0 Mounting & prefix

| Layer | File:line | Prefix |
| --- | --- | --- |
| App | `backend/app/main.py:460` | `app.include_router(api_router, prefix=settings.API_V1_PREFIX)` → `/api/v1` |
| API router | `backend/app/api/router.py:245` | `api_router.include_router(technicians_router, prefix="/technicians")` |
| Technicians aggregator | `backend/app/technicians/_main.py:415` | `router.include_router(sales_router, tags=["technician-sales"])` |
| Controller | `backend/app/technicians/controllers/sales.py:38` | `APIRouter(prefix="/sales")` |

**Full base path: `/api/v1/technicians/sales/...`**

Registration order in `_main.py:409-418` puts `sales_router` before the dynamic `@router.get("/{technician_id}")` (`_main.py:418`), so `/technicians/sales/*` is never swallowed by the technician-by-id route.

Note there is a *second, separate* sales router mounted at `/api/v1/sales` (`api/router.py:248`, `app/sales/controllers/quotes.py` → `/sales/quotes`). Quotes live there, requests/leads live under `/technicians/sales`. This split is a frequent source of confusion.

---

### 2.1 Role sets (verbatim)

```python
# sales.py:40-46
SALES_ROLES = {"admin", "operations_manager", "sales_rep", "sales_manager", "customer_service"}

# sales.py:143
MANAGER_ROLES = {"admin", "operations_manager", "sales_manager"}

# sales.py:82-83
FINANCE_ROLES      = {"admin", "operations_manager", "finance_manager"}
INSTALLATION_ROLES = {"admin", "operations_manager", "installation_manager"}
```

Gate helpers:

| Helper | Line | Behaviour |
| --- | --- | --- |
| `_user_role_names` | `sales.py:205` | `{ur.role.name for ur in current_user.roles}` |
| `_ensure_sales_access` | `sales.py:209` | 403 `"هذه الشاشة مخصصة لفريق المبيعات وخدمة العملاء"` if disjoint from `SALES_ROLES` |
| `_is_sales_manager` | `sales.py:1398` | `True` if user has any of `MANAGER_ROLES` (defined *after* first use at `:697` — fine at runtime, module-level) |
| `_ensure_finance_access` | `sales.py:217` | `FINANCE_ROLES` — **used once**, by the dead `finance-decision` endpoint (`:784`) |
| `_ensure_installation_access` | `sales.py:226` | `INSTALLATION_ROLES` — **never called anywhere in the repo** (dead) |

`_ensure_sales_access` is *not* an ownership check. Ownership is enforced ad hoc per endpoint via `item.created_by_user_id != current_user.id and not _is_sales_manager(...)`.

---

### 2.2 Every endpoint

All paths below are relative to `/api/v1/technicians/sales`.

| # | Method + path | Line | Purpose | Payload | Response | Gate |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `GET /contract-requests` | `:315` | Offer list (shared pool) | query: `status`, `contractType`, `group`, `search`, `mine`, `sort`, `offset`, `limit≤100` | `{items[_request_payload], total, offset, limit, hasMore, counts, statusOptions}` | `_ensure_sales_access` |
| 2 | `POST /contract-requests` | `:435` | Worker creates a sales offer; creates/reuses `Customer`, always creates a new `Site` | `SalesContractRequestIn` | `_request_payload` (201) | `_ensure_sales_access` |
| 3 | `GET /contract-requests/{id}` | `:574` | Single offer | — | `_request_payload` | `_ensure_sales_access` |
| 4 | `GET /contract-requests/{id}/history` | `:601` | Merged AuditLog timeline (request + its quotes) | — | `{items:[{id,action,entity,oldStatus,newStatus,description,userName,userRoles[],at}], total}` | `_ensure_sales_access` |
| 5 | `POST /contract-requests/{id}/status` | `:684` | Generic status move + notes timeline append | `SalesContractStatusIn{status*, note, quoteAmount, surveyDate}` | `_request_payload` | sales access **+ owner-or-manager** (`:697`); `MANAGER_ONLY_STATUSES` gate (`:714`); edge map (`:722`) |
| 6 | `POST /contract-requests/{id}/finance-decision` | `:770` | **LEGACY / unreachable** — always 409 | `RequestFinanceDecisionIn{decision*, note}` | `_request_payload` | `_ensure_finance_access` (`FINANCE_ROLES`) |
| 7 | `POST /contract-requests/{id}/build-contract` | `:828` | **The single Contract-creation trigger** | `BuildContractIn` | `_request_payload` | `_is_sales_manager` only (`:845`) — no `_ensure_sales_access` call |
| 8 | `GET /contract-requests/{id}/contract-document.docx` | `sales.py` | The company's Word contract (`build_contract_document`, by contract type) | — | .docx, RFC-5987 Arabic filename; **409** when no contract is built (the `.xlsx` route was removed 2026-11-23) | `_ensure_sales_access` |
| 9 | `GET /contract-requests/{id}/contract-document.pdf` | `sales.py` | Same .docx via LibreOffice | — | `application/pdf`; **503** if LibreOffice missing, **502** on render failure, **409** without a contract | `_ensure_sales_access` |
| 10 | `DELETE /contract-requests/{id}` | `:1104` | Hard delete the request | — | `{message, id}` | `_ensure_sales_access` **only — no owner/manager check** |
| 11 | `POST /contract-requests/{id}/update` | `:1136` | Partial edit of the offer spec (+ optional status) | `SalesContractRequestUpdate` | `_request_payload` | sales access + owner-or-manager (`:1153`) + `status == "pending_review"` unless manager (`:1160`) |
| 12 | `GET /contract-requests/{id}/calls` | `:1278` | Calls logged on the offer's lead (matched by phone) | — | `{items[_interaction_payload], total, leadId, canRegister}` | `_ensure_sales_access` |
| 13 | `POST /contract-requests/{id}/calls` | `:1298` | Log a call from inside the offer; creates the lead if missing | `CallInteractionIn` | `{items, total, leadId}` (201) | sales access + owner-or-manager (`:1309`) + `status=="approved_working"` unless manager (`:1313`) |
| 14 | `POST /contract-requests/{id}/ready-to-contract` | `:1359` | Sets `ready_to_contract=True` (no status change) | — | `_request_payload` | sales access + owner-or-manager (`:1372`) + `status=="approved_working"` unless manager (`:1374`) |
| 15 | `GET /new-calls` | `:1774` | **Canonical leads list** | `status`, `search`, `customerType`, `hasNextCall`, `dueToday`, `mine`, `offset`, `limit≤200` | `{items, total, offset, limit, hasMore, counts, statusOptions, outcomeOptions}` | `_ensure_sales_access` |
| 16 | `GET /lookup-phone` | `:1827` | Duplicate detection across leads + requests | `phone` (required) | `{phone, calls[], periodic[], requests[], total}` | `_ensure_sales_access` |
| 17 | `POST /new-calls` | `:1863` | Register a lead; **dedupes by last-9-digit phone** | `NewCallIn` | `_call_payload` + `interactions` (+`deduped:true` on merge) (201) | `_ensure_sales_access` |
| 18 | `GET /new-calls/{id}` | `:1943` | Lead + full interaction history | — | `_call_payload` with `interactions` | `_ensure_sales_access` |
| 19 | `POST /new-calls/{id}/interactions` | `:1960` | Append a call; may also set lead status + nextCallDate | `CallInteractionIn` (note required) | `_call_payload` with `interactions` (201) | `_ensure_sales_access` **only — no owner check** |
| 20 | `POST /new-calls/{id}` | `:1989` | Partial edit of the lead | `NewCallUpdateIn` | `_call_payload` (no interactions) | sales access + owner-or-manager (`:2002`) |
| 21 | `GET /periodic-calls` | `:2075` | الاتصالات الدورية view of the **same** leads | `filter`, `classification`, `search`, `mine`, `sort`, `offset`, `limit≤300` | `{items, total, offset, limit, hasMore, filters}` (**no `counts`**) | `_ensure_sales_access` |
| 22 | `POST /periodic-calls` | `:2133` | Add to periodic follow-up; dedupes by phone | `PeriodicCallIn` | `_call_payload` (+`deduped`) (201) | `_ensure_sales_access` |
| 23 | `GET /periodic-calls/{id}` | `:2184` | Single lead, periodic shape | — | `_call_payload` | `_ensure_sales_access` |
| 24 | `POST /periodic-calls/{id}` | `:2198` | Edit periodic fields | `PeriodicCallIn` | `_call_payload` | sales access + owner-or-manager (`:2209`) |
| 25 | `GET /execution` | `:2231` | متابعة التنفيذ — installation projects with originating rep | `includeClosed`, `search`, `sort`, `mine`, `offset`, `limit≤200` | `{items, total, offset, limit, hasMore, statusOptions}` | `_ensure_sales_access` |

`group` values accepted by #1 (`:353-370`): `active` | `all` | `review` | `working` | `finance` | `rejected` | `approved`.
`sort` values (`:386-399`): `oldest` | `name` | `amount` (`coalesce(manual_price, system_price, 0) desc`) | default `newest`.

All write bodies are `CamelModel` (`app/sales/schema.py:74-83`): `populate_by_name=True`, `alias_generator=to_camel`, `extra="ignore"` — so **both** camelCase (mobile-worker) and snake_case (AdminPortal axios) keys are accepted on every endpoint.

---

### 2.3 The request status machine

`STATUS_LABELS` (`sales.py:48-64`) — the full set; `ALLOWED_STATUS_TRANSITIONS = set(STATUS_LABELS.keys())` (`:66`):

| Status | Label | Live? | Who sets it |
| --- | --- | --- | --- |
| `pending_review` | بانتظار المراجعة | **live** | create (`:511`), status endpoint, `/update` (only rep-settable soft status) |
| `approved_working` | معتمد — قيد العمل | **live** | status endpoint, manager-only |
| `contacted` | تم التواصل | legacy | nothing produces it; still settable by a rep via `/status` |
| `site_survey` | معاينة الموقع | legacy | same |
| `quoted` | تم إصدار عرض سعر | legacy | `quotes.py:414` sets it — but that line is **dead** (see §2.7) |
| `approved` | معتمد مبدئيًا | **live** | `build-contract` only (`:942`) — and, by a bug, `/update` (see §2.8) |
| `rejected` | مرفوض | **live** | status endpoint, manager-only |
| `cancelled` | ملغي | **live** | status endpoint, **not manager-gated** |

Retired statuses `pending_finance` / `finance_approved` / `finance_rejected` are **absent from `STATUS_LABELS`**, so they fail the `ALLOWED_STATUS_TRANSITIONS` check with 400 (`:701`). Existing rows were folded by migration `sales_reqfin_0032` (`backend/alembic/versions/sales_reqfin_0032_retire_request_finance_statuses.py:39-43`): `finance_approved→approved`, `pending_finance→approved_working`, `finance_rejected→rejected`; downgrade is a deliberate no-op.

Gate constants (`sales.py:70-76`):

```python
MANAGER_ONLY_STATUSES  = {"approved_working", "rejected"}   # 403 for non-managers
ENDPOINT_ONLY_STATUSES = {"approved"}                       # 403 for everyone on /status
REP_SOFT_STATUSES      = {"pending_review"}                 # consulted ONLY by /update
```

`REQUEST_STATUS_EDGES` (`sales.py:91-109`) verbatim:

| From | Allowed to |
| --- | --- |
| `pending_review` | `approved_working`, `rejected`, `cancelled` |
| `approved_working` | `approved`, `pending_review`, `rejected`, `cancelled` |
| `approved` | `pending_review`, `cancelled` |
| `rejected` | `pending_review`, `cancelled` |
| `cancelled` | `pending_review` |
| `contacted` | `approved_working`, `pending_review`, `rejected`, `cancelled` |
| `site_survey` | `approved_working`, `pending_review`, `rejected`, `cancelled` |
| `quoted` | `approved_working`, `pending_review`, `rejected`, `cancelled` |

`_request_transition_allowed` (`:112-123`): same-status is always allowed (never 409 on re-save); an **unknown source status is permissive** (`allowed is None → True`) so legacy rows are never stuck. Violation → **409** with an Arabic from→to message (`:723-729`).

Order of checks in `POST /status` (`:700-729`): membership 400 → `ENDPOINT_ONLY` 403 → `MANAGER_ONLY` 403 → edge-map 409. Note `contacted`/`site_survey`/`quoted` are **not** in `REQUEST_STATUS_EDGES["pending_review"]`, so a rep can no longer walk the old funnel forward — only `cancelled` is reachable for a rep-owner from `pending_review`.

Lead statuses `CALL_STATUS_LABELS` (`:126-133`): `new`, `interested`, `following`, `not_interested`, `converted`, `deleted` — **no edge map at all**; any listed value can be set from any other.
Call outcomes `CALL_OUTCOME_LABELS` (`:135-142`): `interested`, `not_interested`, `no_answer`, `callback`, `converted`, `other`.

---

### 2.4 Full lifecycle A → Z

**Step 1 — worker creates the offer.** `create_sales_contract_request` (`sales.py:435`).
- `contract_type` defaults to `"installation"` and is coerced back to it if not in `{maintenance, installation}` (`:444-447`).
- Business rule: `customerName` and `contactPhone` required → 400 (`:457`). Everything else is optional at the schema layer (`SalesContractRequestIn`, `schema.py:139`).
- Customer lookup: `Customer.contact_phone == contact_phone` **exact string match** (`:460-465`), newest first. Miss → create; hit → overwrite `name`, `contact_person_name`, `contact_email` (`:481-483`).
- **A brand-new `Site` is created unconditionally** (`:486-504`), with `next_site_code(db, customer)` from `app._shared.codes`.
- Request row: `status="pending_review"`, `source="worker_sales_app"`, `instructions_acknowledged=True`, `request_number = CR-SALES-{YYYYMMDD-HHMMSS}-{uuid6}` (`_generate_contract_request_number`, `:192`), `created_by_user_id=current_user.id`, `rep_name` defaults to `current_user.full_name`, `rep_notes` falls back to `notes`.
- `AuditLog.log(action_type="CREATE", description="sales_contract_request_created_from_worker_app")` (`:560`) then one `db.commit()`.

**Step 2 — review.** The offer sits in `pending_review`. The rep may still edit it via `POST /update` (`:1136`); `_EDITABLE_REQUEST_STATUSES = {"pending_review"}` (`:1160`) makes it read-only for the rep afterwards (409), managers override.

**Step 3 — Approval #1 (the only real gate).** Sales manager calls `POST /status` with `approved_working` (`update_sales_contract_request_status`, `:684`). `MANAGER_ONLY_STATUSES` blocks reps (`:714`). The move is appended to `item.notes` as a `YYYY-MM-DD HH:MM - {full_name}: {label}` timeline line (`:735-745`), plus optional `note` / `quote_amount` / `survey_date` details. `AuditLog` `STATUS_CHANGE` / `sales_contract_request_status_update`. **This endpoint never creates a Contract** (explicit comment `:747`).

**Step 4 — calls.** With `status == "approved_working"`, `canRegister` flips true (`:1294`) and the rep logs calls via `POST /contract-requests/{id}/calls` (`:1298`). The call is stored on the **customer lead**, not the request: `_find_lead_by_phone(db, item.contact_phone)` (`:1322`), creating a `CustomerCallLog` with `status="following"`, `source="rep_own"` if absent (`:1324-1335`). One history, two entry points.

**Step 5 — quote.** `POST /api/v1/sales/quotes` (`app/sales/controllers/quotes.py:313`). Hard gate at `quotes.py:332`: the linked request's status must be in `{"approved_working", "approved"}`, else **409** `"لا يمكن إنشاء عرض سعر قبل اعتماد الطلب من مدير المبيعات"`. On success it versions the quote (N+1, prior open quotes get `superseded_by_id`), writes back `req.manual_price = total` and `req.active_quote_id = quote.id` (`quotes.py:415-416`).

**Step 6 — readyToContract.** `mark_offer_ready_to_contract` (`:1359`) sets `ready_to_contract = True`; **does not change status**, and there is no path that resets it to `False`.

**Step 7 — build-contract (Approval #2 / materialization).** `build_contract_for_request` (`:828`). Guards, in order:
1. `_is_sales_manager` → 403 `"إنشاء العقد من صلاحية مدير المبيعات"` (`:845`). Despite the docstring saying "Installation manager", `installation_manager` is **not** allowed.
2. 404 if request missing (`:856`).
3. **Idempotency:** `item.contract_id is not None` → return `_request_payload(item)` unchanged (`:860`).
4. `item.status != "approved_working"` → 409 `"إنشاء العقد متاح بعد اعتماد المبيعات"` (`:863`).
5. Optional `customer_id` / `site_id` overrides must exist → 404 each (`:873-889`).
6. `effective_site_id` required → 400 (`:892`).
7. `start_date` required → 400 (`:901`).
8. Overrides built from `payload.model_fields_set` over 12 whitelisted fields (`:910-931`); blank text is cleaned to `None` and dropped so the derived default wins.
9. `materialize_contract_from_request(...)` (§2.5).
10. `item.status = "approved"` (`:942`).
11. Customer write-back (`:946-950`) and **site resync** (`:958-967`): `site_id`, `site_name`, `site_city`, `site_region`, `site_address_text` repointed to the confirmed site so mobile-worker stops showing the preliminary data.
12. `_link_calls_to_contract` (`:1483`) — matches leads by `phone_norm`, sets `status="converted"`, `customer_id`, and renames to the authoritative customer name; returns the count.
13. `_open_contract_invoice` (`:1518`) — draft `Invoice`, 30-day due date, hardcoded 15% VAT.
14. `AuditLog` `CREATE` / `sales_contract_request_contract_built` with `{status, contract_id, contract_number, linked_calls}`, then a single `db.commit()` (`:999`).

**Step 8 — downstream.** For installation contracts the `InstallationProject` created in step 7 surfaces in `GET /execution` (`:2231`), which maps each project back to its rep via `CustomerContractRequest.contract_id → rep_name` in one bulk query (`:2291-2300`).

---

### 2.5 Contract materialization

`materialize_contract_from_request` — `backend/app/sales/services.py:84`.

Signature: `(db, request, *, quote_id=None, overrides=None, customer_id=None, site_id=None) -> Contract`. `quote_id` is accepted but **never used** in the body.

Effective ids (`services.py:116-117`): override if not `None`, else the request's own.

**Idempotency, two guards:**
1. `request.contract_id is not None` → `repo.find_by_id(...)`; return it. A *dangling* link (contract deleted) falls through and re-creates (`services.py:120-124`).
2. `repo.find_for_site_and_type(site_id, contract_type)` → if a blocking contract already exists, **adopt it**: set `request.contract_id = existing.id`, flush, return (`services.py:137-143`). `find_for_site_and_type` (`app/maintenance/repository.py:118`) only counts active/draft/pending contracts.

`ValueError` if `effective_site_id is None` (`services.py:126`) — build-contract already 400s before this, so it is a defence-in-depth path only.

**What it creates** (`services.py:163-211`):

| Field | Source / hardcoded default |
| --- | --- |
| `contract_number` | `overrides["contract_number"]`, else `next_contract_number(db, eff_site)`, else `f"CON-{request.request_number}"` (`_contract_number_for_request`, `:56`) |
| `start_date` / `end_date` | `_resolve_dates` (`:68`): override → `request.requested_start_date` → `date.today()`; end → `start + relativedelta(years=1)` (`_DEFAULT_TERM`, `:42`) |
| `total_value` | override, else `request.manual_price or request.system_price` |
| `currency` | override → `request.currency` → `"SAR"` |
| `status` | **hardcoded `"draft"`** |
| `notes` | `overrides["notes"]` if not `None`, else **`request.rep_notes`** — deliberately *not* `request.notes`, which is the status-timeline dump (`:173-176`) |

Child rows:
- **maintenance** → `MaintenanceContract` with `coverage_type` override or `"full"`, `visit_frequency` override or `"monthly"`, `visits_per_year` override or `_FREQUENCY_VISITS.get(frequency, 12)` (`services.py:46-53`), `emergency_call_included` override or `True`.
- **installation (default)** → `InstallationProject` with `project_code` override or `f"INST-{request.request_number}"`, `project_name` override → `request.site_name` → `f"تركيب {request.request_number}"`, `description = overrides["notes"] or request.rep_notes`, **`status="design"`**, `planned_start_date=start_date`, `planned_end_date=end_date`.

Finally `request.contract_id = contract.id; db.flush()` (`:214-215`). **The service never commits** — `build_contract_for_request` owns the single transaction (documented invariant, `services.py:15-17`).

`_open_contract_invoice` (`sales.py:1518`) creates `Invoice(status="draft", invoice_number=f"INV-{utcnow}-{uuid6}", invoice_date=today, due_date=today+30d, subtotal=manual_price or system_price, vat_rate=15, vat_amount=round(subtotal*0.15,2), total_amount=subtotal+vat)`.

---

### 2.6 Leads / calls (اتصالات الجدد + الاتصالات الدورية = one module)

One table, two views: `CustomerCallLog` (`app/sales/models/customer_call.py:16`) + `CustomerCallInteraction` (`app/sales/models/call_interaction.py:17`, `ondelete="CASCADE"` on `call_log_id`).

**Dedupe key.** `_phone_norm` (`sales.py:146`) = last 9 digits, `None` if fewer than 6 digits. Persisted on `CustomerCallLog.phone_norm` (`String(9)`), with a partial unique index + index created by `alembic/versions/sales_dedup_0011_normalize_and_merge_phone.py` (`uq_customer_call_logs_phone_norm`, `ix_customer_call_logs_phone_norm`), which also merged pre-existing duplicates keeping the earliest row. `_find_lead_by_phone` (`sales.py:1470`) returns the **earliest** matching lead (original owner).

**Shared query path** (`sales.py:1626-1771`) — the "one module" seam:
- `_leads_scope_query` (`:1655`) applies `mine` (`_my_activity`, `:1580` — owner **or** has personally logged an interaction), `customerType`, `hasNextCall`, `search` (name / phone / workerName ILIKE). Deliberately **excludes** the status filter and the `dueToday` list filter.
- `_due_today_clause` (`:1642`) — `next_call_date IS NOT NULL AND next_call_date <= func.current_date()` (**DB clock**, not the app process clock).
- `_leads_status_counts` (`:1694`) — one `GROUP BY status` + one filtered `COUNT` for `dueToday`. No N+1.
- `_leads_list_response` (`:1715`) — the single code path behind `/new-calls` and (partially) `/periodic-calls`; applies `dueToday` and the status filter, hides `status == "deleted"` when no status filter is given (`:1757`), then orders by `next_call_date` (nulls last) or `created_at desc`.

**`counts` object** (`_COUNTED_STATUSES = ["new","interested","following","not_interested","converted"]`, `:1691`):

```json
{ "new": n, "interested": n, "following": n, "not_interested": n,
  "converted": n, "total": <sum of the five, excludes 'deleted'>, "dueToday": n }
```

Computed over the current `mine`/`search`/`customerType`/`hasNextCall` scope but **ignoring the status filter**, so stat cards always show the full distribution. `counts` is returned by `/new-calls` only — **`/periodic-calls` has no `counts` key** (`:2123-2130`), it returns `filters: PERIODIC_FILTERS` instead.

`PERIODIC_FILTERS` (`:180-189`): `all`, `due`, `following`, `company_assigned`, `rep_own`, `company`, `contracted`, `deleted`. Applied by `_apply_periodic_filter` (`:2032`), which uses `date.today()` (**app clock**) for `due` — inconsistent with `_due_today_clause`'s `func.current_date()`.

**Wire-shape compatibility notes for mobile-worker:**
- `_call_payload` (`:1415`) is the single lead shape: `id, workerUserId, workerName, customerName, phone, address, callDate, registerNote, workerNote1, workerNote2, status, statusLabel, customerType, source, sourceLabel, classification, note, lastCallDate, nextCallDate, callCount, lastCallAt, createdAt, updatedAt`. `note` is a **duplicate of `registerNote`** kept for the periodic view. `customerId` is on the model but **not** in the payload.
- List responses add `lastCallerName` (`_lead_list_payloads:1621`) and real `callCount` / `lastCallAt`; single-record responses from `update_new_call` (`:2025`), `get_periodic_call` (`:2195`) and `update_periodic_call` (`:2224`) call `_call_payload(item)` bare, so they return **`callCount: 1` and `lastCallAt = createdAt` and no `lastCallerName`/`interactions`** — a client that re-renders a row from an update response regresses those fields.
- `interactions[]` is present only when explicitly passed (create/get/interaction endpoints).
- Dedupe responses add `"deduped": true` (`:1909`, `:2155`).
- `lookup_phone` always returns `"periodic": []` (`:1857`) — a permanently empty key kept for wire compatibility.
- `/periodic-calls` keeps `items/total/offset/limit/hasMore/filters` unchanged by the unification refactor (explicit docstring promise, `:2092`).

---

### 2.7 `_request_payload` — the AdminPortal + mobile-worker contract

`sales.py:243-312`. 59 keys, returned by endpoints 2, 3, 5, 6, 7, 11, 14 and inside `items[]` of endpoint 1.

| Group | Keys |
| --- | --- |
| Identity | `id`, `requestNumber`, `contractType`, `contractTypeLabel` (`"تركيبات"` if installation else `"صيانة"`), `status`, `statusLabel` (falls back to the raw status), `readyToContract` |
| Links | `contractId`, `activeQuoteId`, `customerId`, `siteId` |
| Customer (from the joined `Customer` row) | `customerName`, `customerPhone`, `customerEmail`, `customerContactName` |
| Site (denormalized columns on the request) | `siteName`, `city`, `region`, `addressText` (`site_address_text` or `site.address_text`), `buildingType`, `floorsCount`, `basementsCount`, `elevatorsCount` |
| Contact (on the request) | `contactName`, `contactPhone`, `contactEmail` |
| Misc | `requestedStartDate`, `notes` (the accumulated status timeline) |
| Offer spec | `customerType`, `registerDate`, `elevatorType`, `stopsCount`, `entrancesCount`, `capacity`, `machineType`, `addons` (`selected_addons or []`), `doorExternal`, `doorSize`, `doorInternal`, `shaftWidth`, `shaftLength`, `cabinSize`, `pitDepth`, `overheadHeight`, `counterweightPosition` |
| Money | `systemPrice`, `manualPrice` (both `float | None` via `_num_out`), `currency` (`or "SAR"`), `paymentPct1..paymentPct4` |
| Notes / rep | `note1`, `note2`, `note3`, `repName`, `repNotes` |
| Timestamps | `createdAt`, `updatedAt` (ISO via `_to_iso`) |

Traps: **`customerName` ≠ `contactName`** — the former is `Customer.name`, the latter `request.contact_name`; they diverge until build-contract resyncs them (`:946-950`). `contractNumber` is **not** in the payload — after build-contract the client only gets `contractId`. `notes` is the timeline dump, not a clean note (`repNotes` is the clean one).

---

### 2.8 Legacy / dead code

| Item | Line | Status |
| --- | --- | --- |
| `POST /contract-requests/{id}/finance-decision` | `:770-825` | **Unreachable.** Docstring admits it: nothing can enter `pending_finance` (it is not in `STATUS_LABELS`, so `/status` 400s on it), so the `item.status != "pending_finance"` check at `:796` always 409s. Still routed and still called by `AdminPortal/src/pages/finance/FinanceApprovals.tsx:152` via `AdminPortal/src/api/index.ts:392` — that page can only ever produce a 409. |
| `_ensure_installation_access` + `INSTALLATION_ROLES` | `:83`, `:226-232` | Defined, **zero call sites** repo-wide. |
| `group=finance` filter | `:366` | Filters on `pending_finance`/`finance_approved`/`finance_rejected` — always returns 0 rows. |
| `contacted`, `site_survey`, `quoted` | `:53-56`, `:106-108` | Retired funnel stages. Kept in `STATUS_LABELS` (so historical rows render) *and* in `ALLOWED_STATUS_TRANSITIONS` (so they are still settable), and exposed in `statusOptions` on every list response. |
| `quotes.py:413-414` (`req.status = "quoted"`) | — | **Dead.** `quotes.py:332` already guarantees the status is `approved_working` or `approved`, both of which are in the exclusion set at `:413`. So nothing produces `quoted` anymore. |
| `_phone_like` | `:152-155` | Defined, never called. `lookup_phone` inlines its own `f"%{digits[-9:]}%"` at `:1839`. |
| `quote_id` parameter of `materialize_contract_from_request` | `services.py:88` | Accepted, never read. |
| `lookup_phone` → `"periodic": []` | `:1857` | Permanently empty; the periodic split no longer exists. |
| Stale comments | `:353` ("finance (submitted to finance…)"), `:713` ("reps only advance the soft stages contacted / site_survey / quoted" — contradicts `REP_SOFT_STATUSES = {"pending_review"}`), `:837` + `:872` + `schema.py:272-279` ("Installation manager enters the real contract data" — the endpoint is gated to the *sales* manager), `contract.py:188-190` ("submit to finance (Approval #2)") | Misleading docs |

---

### 2.9 Risks / gaps

**Correctness bugs**

1. **`logger` is undefined — `NameError` in the "best-effort" handler.** `sales.py:1550` calls `logger.error(...)` inside `except Exception` in `_open_contract_invoice`, but the module has no `import logging` and no `logger = ...` (only match in the file is that one line). Any billing failure therefore raises `NameError` out of `build_contract_for_request`, `get_db` rolls back (`api/deps.py:32`), and the **entire contract creation is lost with a 500** — the exact opposite of the documented "a billing hiccup must not fail contract creation" (`:1520`).
2. **Invoice amount ignores the entered contract value.** `_open_contract_invoice` uses `request.manual_price or request.system_price` (`:1528`) instead of `contract.total_value`. When the manager passes `totalValue` in `BuildContractIn`, the contract and the draft invoice disagree.
3. **Hardcoded 15% VAT.** `:1533` / `:1542-1543` hardcodes `vat_rate=15` while finance has a configurable `finance_vat_rate` setting elsewhere in the system.
4. **`/update` can set `approved`, bypassing build-contract entirely.** `:1248-1256` validates only against `ALLOWED_STATUS_TRANSITIONS` (which *includes* `approved`) and never consults `ENDPOINT_ONLY_STATUSES` **or** `_request_transition_allowed`. A sales manager can `POST /contract-requests/{id}/update` with `{"status":"approved"}` and land an offer in معتمد مبدئيًا with **no Contract, no InstallationProject, no invoice, no lead conversion**, and can also perform blocked jumps like `rejected → quoted`. This is the single most serious hole in the module.
5. **Silent contract adoption discards entered terms.** Idempotency guard #2 (`services.py:137-143`) returns a pre-existing contract for the site+type. If the manager overrides `siteId` to a site that already has an active/draft contract, `startDate`/`endDate`/`totalValue`/`contractNumber` are **silently ignored**, the request flips to `approved`, and the 200 response looks successful.

**Authorization**

6. **`DELETE /contract-requests/{id}` has no ownership or status guard** (`:1104-1133`). Any `sales_rep` — or `customer_service` — can hard-delete *any* request, including one already materialized into a Contract. The Contract, Invoice and InstallationProject survive as orphans with no back-link.
7. **`POST /new-calls/{id}/interactions` has no owner check** (`:1960`) and can set the lead's `status` (`:1978-1980`) to anything in `CALL_STATUS_LABELS`, including `converted` and `deleted`. `POST /new-calls` (`:1863`) has the same effect through the dedupe branch (`:1889-1893`). Contrast with `POST /new-calls/{id}` (`:2002`), which *does* enforce owner-or-manager — the weak paths let a rep bypass it.
8. `cancelled` is absent from `MANAGER_ONLY_STATUSES` (`:70`), so a rep-owner can cancel their own offer from any stage including `approved`.
9. `build_contract_for_request` never calls `_ensure_sales_access` (`:845`); harmless today because `MANAGER_ROLES ⊂ SALES_ROLES`, but the two gates can drift.
10. `_ensure_sales_access` grants `customer_service` full create/edit/delete on sales offers, which is likely broader than intended.

**Data integrity**

11. **A new `Site` is created for every offer** (`:486-504`), even when the `Customer` is reused. Repeated offers from the same phone accumulate orphan sites, each with its own `site_code`.
12. **Customer matching is inconsistent with lead matching.** Requests match on `Customer.contact_phone == contact_phone` exact string (`:462`); leads match on last-9-digits `phone_norm`. `"0512345678"` vs `"+966512345678"` merges the lead but forks the customer.
13. **TOCTOU on the lead unique index.** `_find_lead_by_phone` → insert (`:1884/1923`, `:2147/2168`) is not atomic against `uq_customer_call_logs_phone_norm`; concurrent registration surfaces as an unhandled `IntegrityError` → 500.
14. `ready_to_contract` is write-once-true (`:1379`); nothing resets it, so a bounced-back offer keeps signalling "ready".
15. `item.notes` is an ever-growing append-only timeline (`:745`, `:811`, `:972`) in a `Text` column and is also the `notes` returned to clients — it is deliberately *not* used as the contract's notes (`services.py:173-176`), but it does keep growing unbounded.

**Query / portability**

16. `_lead_list_payloads` uses `.distinct(CustomerCallInteraction.call_log_id)` (`:1612`) — **PostgreSQL `DISTINCT ON`**, not portable; it will raise on SQLite and it silently requires the leading `ORDER BY` column to match.
17. `_request_payload` touches `item.customer` and `item.site`. Only `list_sales_contract_requests` (`:334-345`), `get_sales_contract_request` (`:584`) and `build_contract_for_request` (`:852`) eager-load them; `POST /status`, `/update` (site only), `/ready-to-contract` lazy-load after `db.refresh` — 1-2 extra queries per call (bounded, not a true N+1).
18. `build_contract_for_request` re-queries `Customer` (`:948`) and `Site` (`:959`) that the caller may already have validated at `:876`/`:885` — up to two redundant round-trips.
19. `counts["total"]` (`:1709`) is the sum of the five counted statuses only; leads with an unrecognised status are invisible in `total` while still appearing in the list.

**Error handling / validation**

20. No `try/except IntegrityError` anywhere in the module. `request_number` is unique, `contract_number` is unique, `(site_id, contract_type)` is effectively unique — every collision is a raw 500 rather than a business-readable 409.
21. `SalesContractRequestIn` marks everything optional (`schema.py:139-145`); the only enforced fields are `customerName` + `contactPhone` (`:457`). `floors_count`, `elevators_count`, `payment_pct_*` etc. are unvalidated beyond `>= 0` — payment percentages are never checked to sum to 100.
22. `PeriodicCallIn` create path (`:2133`) requires only `customerName` — **no note requirement**, unlike `POST /new-calls` (`:1876`), so the "no silent saves" rule is enforced on one of the two create paths only.
23. `add_offer_call` (`:1298`) and `create_periodic_call` (`:2133`) commit without an audit entry in some branches (`:1349`, `:2152`), so those lead mutations do not appear in the merged history timeline of `GET /contract-requests/{id}/history`.
24. `statusOptions` in the list response (`:431`) exposes all 8 `STATUS_LABELS` keys including `approved`; a UI that renders them as a dropdown offers a value the `/status` endpoint always 403s.

**Related tests present (not run):** `backend/tests/integration/test_sales_lifecycle_contract.py`, `test_sales_approval_pipeline.py`, `test_sales_leads.py`.
## 3. Data model, migrations & integrity

> Scope: persistence for everything the sales funnel reads or writes — request → quote → lead → materialized contract, plus the connected-code scheme. All paths absolute. No file was modified; no migration was run; no DB was contacted. The Alembic graph below was reconstructed by parsing the migration files with `ast` (read-only).

---

### 3.1 Tables sales touches

| Table | Model (file:line) | Role in sales | Created by |
|---|---|---|---|
| `customer_contract_requests` | `C:\Dev\ElevatorProject\backend\app\maintenance\models\contract.py:156` | The offer/طلب — the funnel's root record | `b9c0d1e2f3a4` |
| `quotes` | `C:\Dev\ElevatorProject\backend\app\sales\models\quote.py:16` | عرض سعر, versioned per request | `sales_quote_0012` |
| `customer_call_logs` | `C:\Dev\ElevatorProject\backend\app\sales\models\customer_call.py:16` | Unified lead (اتصالات الجدد + الدورية) | `sales_calls_0005` |
| `customer_call_interactions` | `C:\Dev\ElevatorProject\backend\app\sales\models\call_interaction.py:17` | Per-lead call history | `sales_lead_0009` |
| `sales_default_prices` | `C:\Dev\ElevatorProject\backend\app\sales\models\default_price.py:16` | Price book, per `domain` | `sales_dp_0001` |
| `catalog_categories` | (`app/catalog/…`, seeded in migration) | Category labels/order as data | `catalog_0001` |
| `contracts` | `...\app\maintenance\models\contract.py:12` | Downstream materialized record | initial schema |
| `maintenance_contracts` | `...\app\maintenance\models\contract.py:122` | Child of a maintenance contract | initial schema |
| `installation_projects` | `C:\Dev\ElevatorProject\backend\app\installations\model.py` | Child of an installation contract | initial schema |
| `customers` | `C:\Dev\ElevatorProject\backend\app\customers\model.py:12` | Upserted by offer creation | initial schema |
| `sites` | `C:\Dev\ElevatorProject\backend\app\sites\models\site.py:12` | Created by offer creation | initial schema |
| `elevators` | `C:\Dev\ElevatorProject\backend\app\elevators\model.py:12` | Spec fields mirrored from the offer | initial schema |
| `periodic_call_customers` | — | **Dropped** — folded into `customer_call_logs` | `sales_unify_0010:72` |
| `sales_offers` | — | **Dropped** — folded into `customer_contract_requests` | `sales_merge_0004:81` |

#### Columns sales actually reads/writes (not the full tables)

| Table | Sales-relevant columns | Notes |
|---|---|---|
| `customer_contract_requests` | `request_number` (uq, NOT NULL), `status`, `contract_type`, `customer_id`, `site_id`, denormalized `site_name`/`site_city`/`site_region`/`site_address_text`, `contact_*`, 28 offer-spec columns (`elevator_type`…`rep_notes`), `created_by_user_id`, `ready_to_contract`, `active_quote_id`, `contract_id` | `contract.py:164-247`; spec block at `:192-221` |
| `quotes` | `quote_number` (uq), `request_id`, `customer_id`, `line_items`(JSONB), `subtotal`…`total`, `payment_terms`(JSONB), `status`, `sent_at`/`sent_channel`, `version`, `superseded_by_id`, `template_overrides`(JSONB) | `quote.py:19-63` |
| `customer_call_logs` | `phone`, `phone_norm`(dedupe key), `status`, `customer_type`, `source`, `classification`, `last_call_date`, `next_call_date`, `customer_id`, `worker_user_id` | `customer_call.py:21-54` |
| `contracts` | `contract_number` (uq), `contract_type`, `site_id`, `customer_id`, `start_date`/`end_date`, `total_value`, `currency`, `status` | written by `app\sales\services.py:163-177` |
| `customers` | `customer_number`, `customer_code`, `name`, `contact_person_name`, `contact_phone`, `contact_email`, `address_text`, `city`, `region` | upsert at `app\technicians\controllers\sales.py:460-482` |
| `sites` | `site_code`, `name`, `address_text`, `city`, `region`, `building_type`, `floors_count`, `basements_count`, `elevators_count`, `site_contact_*` | `app\technicians\controllers\sales.py:486-500` |
| `elevators` | `code` (uq NOT NULL), spec columns added by `elev_spec_0003` / `elev_spec_0035` | `elevators\model.py:22` |

---

### 3.2 Alembic migrations touching sales

All under `C:\Dev\ElevatorProject\backend\alembic\versions\`. `depends_on` is `None` everywhere.

| Revision | down_revision | What it changes | Kind |
|---|---|---|---|
| `b9c0d1e2f3a4` | `a7b8c9d0e1f2` | Creates `customer_contract_requests` + 5 indexes (`request_number` unique) — `b9c0d1e2f3a4_add_customer_contract_requests.py:35-68` | schema |
| `sales_dp_0001` | `d1st0002` | Creates `sales_default_prices`, uq `(category, option_key)` — `sales_dp_0001_…py:35-57` | schema |
| `sales_of_0002` | `sales_dp_0001` | Creates `sales_offers` (later dropped) | schema |
| `elev_spec_0003` | `sales_of_0002` | +14 spec columns on `elevators` — `elev_spec_0003_…py:20-35` | schema |
| `sales_merge_0004` | `elev_spec_0003` | +29 offer columns onto `customer_contract_requests`; **DROPs `sales_offers`** — `sales_merge_0004_…py:22-52,81` | schema (destructive) |
| `sales_calls_0005` | `sales_merge_0004` | Creates `customer_call_logs` + 2 indexes | schema |
| `sales_periodic_0006` | `sales_calls_0005` | Creates `periodic_call_customers` (later dropped) | schema |
| `sales_repid_0007` | `sales_periodic_0006` | `requests.created_by_user_id` + FK to `users` (**no ondelete**) + index — `:41-49` | schema |
| `sales_idx_0008` | `sales_repid_0007` | 3 phone indexes (`call_logs.phone`, `periodic.phone`, `requests.contact_phone`) — `:18-22` | schema (index-only) |
| `sales_lead_0009` | `sales_idx_0008` | Creates `customer_call_interactions`, FK `call_log_id` **ON DELETE CASCADE** — `:46` | schema |
| `sales_unify_0010` | `sales_lead_0009` | +5 columns on `customer_call_logs`; **copies** all `periodic_call_customers` rows over (status remap `contracted→converted`); **DROPs** the periodic table — `:55-72` | schema **+ data** |
| `sales_dedup_0011` | `sales_unify_0010` | Adds `phone_norm`; backfills last-9-digits; repoints interactions to the earliest keeper; **DELETEs duplicate leads**; partial unique index `uq_customer_call_logs_phone_norm … WHERE phone_norm IS NOT NULL` — `:33-87` | schema **+ destructive data** |
| `sales_quote_0012` | `sales_dedup_0011` | Creates `quotes`; FKs `request_id`/`customer_id` **SET NULL**, `created_by_user_id` no-action; indexes on `quote_number`/`request_id`/`status` — `:28-62` | schema |
| `sales_quote_fin_0013` | `sales_quote_0012` | `quotes.finance_note/finance_by_user_id/finance_at` (later dropped by `0031`) | schema |
| `sales_matctr_0014` | `sales_quote_fin_0013` | `requests.contract_id` + FK **SET NULL** + index — the materialize idempotency guard — `:47-56` | schema |
| `sales_qver_0015` | **`finance_zatca_0030`** | `quotes.version` (server_default 1), `quotes.superseded_by_id` self-FK SET NULL, `requests.active_quote_id` FK SET NULL — `:37-60` | schema |
| `sales_callcust_0016` | `sales_qver_0015` | `call_logs.customer_id` + index + FK SET NULL — `:34-43` | schema |
| `sales_ready_0017` | `sales_callcust_0016` | `requests.ready_to_contract` NOT NULL default false | schema |
| `codes_0018` | `sales_ready_0017` | `customers.customer_number` + sequential backfill by `created_at`; unique index; renumbers `sites.site_code` to `{cnum}-{seq}` — `:36-74` | schema **+ data** |
| `codes_0019` | `codes_0018` | Rewrites `elevators.code` → `ELV{site_code}-{seq}` | **data-only** |
| `codes_0020` | `codes_0019` | Rewrites `work_orders.work_order_number`/`code` → `WO{path}-{seq}` | **data-only** |
| `codes_0021` | `codes_0020` | Prefixes site codes with `S`; renumbers `contracts.contract_number` → `CON{bare_site}-{seq}` — `:34-52` | **data-only** |
| `sales_qmgr_0031` | **tuple of 5** (`add_month_name_field`, `codes_0021`, `d2e3f4a5b6c7`, `fd3e4f5a6b7c`, `seed_work_orders_001`) — `sales_qmgr_0031_…py:28-34` | Collapses 6 legacy quote statuses → `draft`; DROPs `finance_note`/`finance_by_user_id`/`finance_at`; **merges the repo's 5 open heads** — `:44-75` | schema **+ data + MERGE** |
| `sales_reqfin_0032` | `sales_qmgr_0031` | Remaps request statuses `finance_approved→approved`, `pending_finance→approved_working`, `finance_rejected→rejected`; downgrade is an explicit no-op — `:39-60` | **data-only** |
| `sales_qovr_0033` | `sales_reqfin_0032` | `quotes.template_overrides` JSONB | schema |
| `cust_code_0034` | `sales_qovr_0033` | `customers.customer_code` + backfill `'CUS' || customer_number` + **unique** index — `:31-39` | schema **+ data** |
| `elev_spec_0035` | `cust_code_0034` | +`elevators.capacity`/`selected_addons`; **DROPs 14 elevator columns** — `:25-44` | schema (destructive) |
| `contract_dropuq_0036` | `elev_spec_0035` | **DROPs `uq_site_contract_type`** on `contracts` — `:38-42` | schema |
| `catalog_0001` | `expense_settlement_0001` | Creates `catalog_categories`; adds `sales_default_prices.domain` (default `installation`) + index; **swaps** uq `(category, option_key)` → `(domain, category, option_key)`; bulk-inserts 14 seed categories — `:78-144` | schema **+ seed data** |

Every one of these guards itself with `sa.inspect(...).has_table()` / column-set checks, so re-running is safe. Two exceptions worth naming: **`catalog_0001` is NOT idempotent** — `op.create_table`, `op.add_column`, `op.drop_constraint` and `op.bulk_insert` all run unguarded (`catalog_0001_…py:78-144`), so a partial failure mid-migration leaves it unre-runnable; and `sales_dedup_0011` / `codes_0018-0021` mutate live data with no dry-run.

---

### 3.3 Alembic head state — **exactly one head**

Reconstructed by parsing all `revision` / `down_revision` assignments in `C:\Dev\ElevatorProject\backend\alembic\versions\*.py` and taking every revision id not named as any other file's `down_revision`.

- **Migration files parsed: 105**
- **Heads: 1**
- **Current head: `wa_conv_read_0001`** (`C:\Dev\ElevatorProject\backend\alembic\versions\wa_conv_read_0001_conversation_read_marker.py:…`, `down_revision = "catalog_0001"`)
- **Dangling `down_revision` references: none** — the graph is fully closed.
- `alembic.ini:5` sets `script_location = alembic` and `version_locations` is commented out (`alembic.ini:42`), so this single directory is the whole graph.

Tail of the chain (33 revisions from the merge to the head):

```
sales_qmgr_0031 (MERGE of 5 branches)
  → sales_reqfin_0032 → sales_qovr_0033 → cust_code_0034 → elev_spec_0035
  → contract_dropuq_0036 → wa_expiry_off_0037 → drop_wo_sig_0038
  → whatsapp_media_0001 → whatsapp_departments_0001 → whatsapp_phase3_0001
  → whatsapp_phase4_0001 → wa_autooff_0039 → authz_catalog_0001
  → authz_role_perms_0001 → wo_geofence_0001 → wo_spq_0001
  → tech_days_off_0001 → wo_assigned_at_0001 → wo_notes_products_0001
  → wo_completion_edit_count_0001 → exp_invoice_items_0001 → exp_recurring_0001
  → custody_0001 → contract_renewal_0001 → user_avatar_0001 → push_tickets_0001
  → wo_late_0001 → expense_requests_0001 → expense_settlement_0001
  → catalog_0001 → wa_conv_read_0001   ◀ HEAD
```

The five branches `sales_qmgr_0031` merged: the `add_month_name_field` visit branch, the **sales/codes branch** (`sales_dp_0001 … codes_0021`), the `d2e3f4a5b6c7` customer-commerce branch, the `fd3e4f5a6b7c` WhatsApp branch, and the orphan `seed_work_orders_001`.

**Naming drift:** revision ids do not follow the graph. `sales_qver_0015`'s `down_revision` is `finance_zatca_0030` (`sales_qver_0015_…py:18`), so `0015` actually runs *after* `0030`. Anyone ordering migrations by filename will read the history wrong.

---

### 3.4 What is applied on production vs local only — stated with its uncertainty

I could not verify this directly (no DB access, and no doc records the VPS's `alembic current`). Here is the evidence and the inference, separated.

| Evidence | Source | What it establishes |
|---|---|---|
| "Already applied to the local dev DB (3 rows moved); **runs on the VPS at deploy**" (about `sales_reqfin_0032`) | `C:\Dev\ElevatorProject\docs\SALES_SYSTEM_ANALYSIS.md:77-78` | At authoring time (2026-06-11) it was local-only |
| "can be trimmed **after the migration has run on the VPS**" | `C:\Dev\ElevatorProject\docs\SALES_SYSTEM_ANALYSIS.md:161` | Same — pending at authoring time |
| Only generic commands (`alembic current` / `heads` / `upgrade head`), **no recorded output** | `C:\Dev\ElevatorProject\docs\VPS_OPERATIONS_GUIDE.md:322-341`, `:535`, `:560`, `:572` | The guide never pins a production revision |
| Backend repo is level with `origin/main` (`0 0` from `git rev-list --left-right --count`); all sales migrations except `catalog_0001` landed in commit `0bc1b08` dated **2026-06-19** | backend git | Nothing sales-related is sitting unpushed locally |
| `catalog_0001` landed in `f24a042` dated **2026-07-30**; `wa_conv_read_0001` in `1df0305`, same day | backend git | These are the two newest, ~2 days old |

**Graph inference (strong, but still an inference):** the chain is strictly linear after `sales_qmgr_0031`. So if *any* descendant is applied on the VPS, *every* sales migration up to `sales_qovr_0033` (and `cust_code_0034`, `elev_spec_0035`, `contract_dropuq_0036`) is necessarily applied too — Alembic cannot skip an ancestor. Session memory records `user_avatar_0001` as applied on the VPS on 2026-07-27, and `contract_renewal_0001` / `expense_requests_0001` as deployed. `user_avatar_0001` sits 26 revisions downstream of `sales_reqfin_0032`. If that memory is accurate, **all sales migrations through `contract_dropuq_0036` are applied in production.**

| Migration | Production status |
|---|---|
| `b9c0d1e2f3a4` … `contract_dropuq_0036` (every sales migration listed in §3.2 except the last) | **Almost certainly applied** — implied by the linear chain + the recorded `user_avatar_0001` deploy. Not directly verified. |
| `catalog_0001` (`sales_default_prices.domain`, constraint swap, `catalog_categories`) | **Unknown.** Committed 2026-07-30, two days before this analysis. No doc or deploy record mentions it. Since it is not idempotent, this is the one to check first. |
| `wa_conv_read_0001` (head) | **Unknown**, same commit window. |

**The one command that settles it** (I did not run it): `ssh root@92.113.31.218 "cd /opt/elms; docker compose exec -T api alembic current"` — compare against `wa_conv_read_0001`.

---

### 3.5 FK & cascade behaviour on sales deletes

| Child → Parent | ON DELETE | Consequence |
|---|---|---|
| `customer_contract_requests.customer_id → customers.id` | **CASCADE** (`contract.py:165`) | Deleting a customer wipes its requests |
| `customer_contract_requests.site_id → sites.id` | SET NULL (`contract.py:166`) | Site delete orphans the request from its site |
| `customer_contract_requests.contract_id → contracts.id` | SET NULL (`contract.py:238-243`) | **See the trap below** |
| `customer_contract_requests.active_quote_id → quotes.id` | SET NULL (`contract.py:229-233`) | |
| `customer_contract_requests.created_by_user_id → users.id` | **no rule** (`contract.py:225`) | Blocks user deletion; nulled manually |
| `quotes.request_id → customer_contract_requests.id` | SET NULL (`quote.py:22`) | Deleting a request leaves the quote alive, request-less |
| `quotes.customer_id → customers.id` | SET NULL (`quote.py:23`) | |
| `quotes.superseded_by_id → quotes.id` | SET NULL (self, `quote.py:57`) | Version chain breaks, rows survive |
| `quotes.created_by_user_id → users.id` | **no rule** (`quote.py:52`) | Blocks user deletion |
| `customer_call_logs.customer_id → customers.id` | SET NULL (`customer_call.py:30`) | |
| `customer_call_interactions.call_log_id → customer_call_logs.id` | **CASCADE** (`call_interaction.py:23`) | Lead delete takes its history |
| `contracts.customer_id / site_id` | **CASCADE** (`contract.py:19-20`) | Site force-delete removes contracts |
| `maintenance_contracts.contract_id` | CASCADE, `unique=True` (`contract.py:130`) | 1:1 enforced |

**Delete paths:**

- **Delete a request** — `app\technicians\controllers\sales.py:1104-1132`. Plain `db.delete(item)`; the docstring at `:1112-1114` states quotes keep their data and the materialized Contract is untouched. Correct given the FKs.
- **Force-delete a site** — `app\sites\controllers\sites.py:346-384`. Without `force` it refuses only when elevators exist (`:366-372`); with `force=true` it relies entirely on DB CASCADE. Neither the site controller nor the elevator controller references any sales table (verified by grep over `app\sites\` and `app\elevators\`).
- **Force-delete an elevator** — `app\elevators\controllers\elevators.py:339-370`. `force` hard-deletes; the default path soft-deletes by setting `status="decommissioned"`.
- **Force-delete a customer** — `app\customers\controllers\customers.py:672-720` deletes call interactions → call logs, then (`:699-718`) nulls `active_quote_id` and `superseded_by_id` before deleting quotes, then deletes requests. `:775-790` nulls the no-rule `users` FKs (`CustomerContractRequest.created_by_user_id`, `Quote.created_by_user_id`, `CustomerCallLog.worker_user_id`, `CustomerCallInteraction.worker_user_id`, `SalesDefaultPrice.updated_by_user_id`) so the user delete is not blocked. This is a hand-maintained list — a new sales FK to `users` silently breaks it.

> **Integrity trap — cascade can resurrect a duplicate contract.** Force-deleting a site CASCADEs its `contracts`, which SET NULLs `customer_contract_requests.contract_id`. That column *is* the idempotency guard (`sales_matctr_0014` docstring; `app\sales\services.py:119-124`). With it cleared, `materialize_contract_from_request` explicitly falls through and re-creates ("Dangling link (contract deleted) — fall through and re-create", `services.py:124`). Guard #2 (`repo.find_for_site_and_type`) also cannot save it — the site is gone. Meanwhile `request.site_id` is now NULL, so the next build-contract raises `ValueError` at `services.py:126-130` instead of a clean 4xx.

---

### 3.6 Code generation & numbering

All generators live in `C:\Dev\ElevatorProject\backend\app\_shared\codes.py` (scheme documented at `:1-18`).

| Entity | Format | Generator | DB guarantee |
|---|---|---|---|
| Customer number | `1, 2, 3…` (int root) | `next_customer_number` `codes.py:42-46` — `MAX+1` | `customers.customer_number` unique (`model.py:24`, idx `codes_0018:56-59`) |
| Customer code | `CUS{n}`, operator-editable | `ensure_customer_code` `codes.py:74-82` | `customers.customer_code` unique (`model.py:28`, idx `cust_code_0034:39`) |
| Site code | `S{cust}-{seq}` e.g. `S1-2`, per-customer | `next_site_code` `codes.py:196-202` | `sites.site_code` **unique but NULLABLE** (`site.py:23`) |
| Contract number | `CON{cust}-{site}-{seq}`, per-site | `next_contract_number` `codes.py:228-234` | `contracts.contract_number` unique NOT NULL (`contract.py:23`) |
| Elevator code | `ELV{cust}-{site}-{seq}`, per-site | `next_elevator_code` `codes.py:288-294` | `elevators.code` unique **NOT NULL** (`model.py:22`) |
| Work order | `WO{cust}-{site}-{elev}-{seq}`; `WO{site}-0-{seq}` when no elevator; `0-0-0` fallback | `next_work_order_number` `codes.py:301-321` | `work_order_number` unique NOT NULL (`work_order.py:85`) |
| WO reschedule marker | `WO…-{seq}S{n}`, counter climbs per move | `next_schedule_change_code` `codes.py:324-358`, applied by `mark_rescheduled` `:361-390` | same unique column |
| WO emergency | `WO…-{seq}E{n}`, `n` resets when the base seq changes | `next_emergency_work_order_number` `codes.py:393-444` | same |
| **Quote number** | `QUOTE{cust}-{globalSeq}` e.g. `QUOTE129-431` — a **single running counter across all quotes**, not per-customer | `next_quote_number` `codes.py:241-258` | `quotes.quote_number` unique NOT NULL (`quote.py:20`; uq `sales_quote_0012:58`) |
| Quote (legacy/fallback) | `Q-{YYYYMMDD-HHMMSS}-{hex6}` | `_quote_number` `app\sales\controllers\quotes.py:83-84`, used at `:376` when no customer resolves | same unique column |
| Spare-parts quote | `WQ-{seq:06d}`, global | `next_spare_parts_quote_number` `codes.py:265-281` | |
| **Request number** | **Two different formats.** Worker: `CR-SALES-{YYYYMMDD-HHMMSS}-{hex6}` (`app\technicians\controllers\sales.py:192-194`). Customer app: `CR-{YYYYMMDD-HHMMSS}` (`app\customers\controllers\portal.py:218-220`) | — | `request_number` unique NOT NULL (`contract.py:168`) |
| Derived contract/project number (fallback) | `CON-{request_number}` / `INST-{request_number}` | `app\sales\services.py:56-65` | |

**Uniqueness is enforced by the unique index, never by a sequence.** Every generator is a `MAX+1` (or `MAX tail +1`) read-then-write in Python with no lock, no `SELECT … FOR UPDATE`, and no PG sequence. Two concurrent writers computing the same next value both pass their read and the second one gets an `IntegrityError` at flush — a 500, not a retry. This applies to customer numbers, site/contract/elevator/WO codes, and quote numbers alike.

Two format-level risks:
- The customer-app request number `CR-{YYYYMMDD-HHMMSS}` (`portal.py:218-220`) has **only second-level entropy and no random suffix** — two customers submitting in the same second collide on the unique index. The worker variant adds `uuid4().hex[:6]` and is safe; the portal one was never updated to match.
- `renumber_customer` (`codes.py:98-123`) and `recode_connected` (`codes.py:146-174`) deliberately **do not** rewrite quote numbers (`codes.py:102-103`, `:152`), so a renumbered customer's quotes keep a `QUOTE{oldNumber}-…` root — intentional (documents are references), but it means the quote number is not a reliable customer key.

---

### 3.7 Risks

#### A. Nullable columns the code treats as present

| Column | Nullable | Where it bites |
|---|---|---|
| `sites.site_code` (`site.py:23`) | yes, unique | `ensure_site_code` (`codes.py:205-221`) silently no-ops when the site has no resolvable customer. `next_elevator_code` then builds `base = ""` → `ELV-1` for *every* code-less site, and `elevators.code` is unique NOT NULL → `IntegrityError` on the second one. The docstring at `codes.py:206-209` says this is exactly the bug `ensure_site_code` was added to fix — the residual hole is the `customer is None` branch at `:218-220`. |
| `contracts.total_value` (`contract.py:32`) | yes | Fed from `request.manual_price or request.system_price` (`services.py:159-161`), both nullable (`contract.py:210-211`). A materialized contract can carry a NULL value with no warning. |
| `customer_contract_requests.customer_id` | **NOT NULL** | but `site_id` is nullable, and `materialize_contract_from_request` raises a bare `ValueError` (`services.py:126-130`) rather than an HTTP error when it is NULL. |
| `quotes.version` (`quote.py:56`) | NOT NULL, default 1 | Read defensively as `q.version or 1` (`quotes.py:111`) — the defensiveness is vestigial but harmless. |
| `customers.contact_phone` (`model.py:39`) | NOT NULL, **no index, no unique** | The offer upsert dedupes on exact string equality (`sales.py:460-464`). Unlike leads (which normalize to `phone_norm`), `+9665…` and `05…` create **two** Customer rows for one person. |

#### B. Missing indexes on hot filters

| Column | Used by | Status |
|---|---|---|
| `customer_call_logs.next_call_date` | the `dueToday` clause (`sales.py:1650-1651`), the due-today list filter (`:1678`, `:1753`) and the primary ORDER BY (`:1761-1763`) | **no index** — this is the leads page's default sort |
| `quotes.customer_id` | `Quote.customer_id ==` in the customer force-delete (`customers.py:702`) and quote lookups | **no index** (FK only; `sales_quote_0012` indexes only `quote_number`/`request_id`/`status`) |
| `quotes.superseded_by_id` | `.in_()` update during customer delete (`customers.py:711-713`) | **no index** |
| `quotes.created_by_user_id` | ownership checks | **no index** |
| `customer_contract_requests.active_quote_id` | `.in_()` update during customer delete (`customers.py:707-709`) | **no index** |
| `(created_by_user_id, status)` on requests | the "mine + status" list — by far the most common worker query (`sales.py:350` + `:354-372`) | only two single-column indexes; no composite |
| free-text search | `ILIKE '%…%'` over `request_number`/`contact_name`/… (`sales.py:377-386`) | unindexable as written — full scan; no `pg_trgm` |

`customer_contract_requests.contact_phone` *is* indexed (`sales_idx_0008:21`), as are the request `status`/`contract_type`/`customer_id`/`site_id`/`created_by_user_id`/`contract_id`, and the lead `worker_user_id`/`status`/`customer_type`/`source`/`phone`/`phone_norm`/`customer_id`.

#### C. Status columns are free strings — no enum, no CHECK

Grep for `Enum` / `CheckConstraint` across `app\sales\` and `app\maintenance\models\contract.py` returns **nothing**. Every lifecycle column is a plain `String` with a server default:

| Column | Type | Default | Validation |
|---|---|---|---|
| `customer_contract_requests.status` | `String(50)` (`contract.py:170`) | `pending_review` | Python edge map in `sales.py` only |
| `quotes.status` | `String(20)` (`quote.py:48`) | `draft` | `QUOTE_STATUS_EDGES` (`quotes.py:43-50`) |
| `customer_call_logs.status` | `String(30)` (`customer_call.py:47`) | `new` | none |
| `customer_call_interactions.outcome` | `String(30)` (`call_interaction.py:29`) | `other` | none |
| `contracts.status` | `String(50)` (`contract.py:37`) | `draft` | none |

Worse, the guard is permissive by design: `_quote_transition_allowed` returns `True` for any status not in the edge map (`quotes.py:61-63`), and `sales.py` treats unknown source statuses permissively too. So a legacy or junk status is never *blocked* — it is a free pass out of any state.

#### D. Drift left by the retired finance statuses

`sales_reqfin_0032` and `sales_qmgr_0031` are one-shot data folds with **no constraint preventing the values from coming back**. Residue still in the tree:

| Location | What is stale |
|---|---|
| `app\technicians\controllers\sales.py:366` | `group=finance` still filters `status.in_(["pending_finance","finance_approved","finance_rejected"])` — permanently empty (flagged as item 3 in `SALES_SYSTEM_ANALYSIS.md:161`) |
| `app\_shared\scheduler.py:646-647` | `expire_stale_quotes` docstring still describes finance quote states; the code (`:655`) is correct |
| `app\sales\controllers\quotes.py:414` | `req.status = "quoted"` is **unreachable** — the 409 gate at `:332` already restricts `req.status` to `{approved_working, approved}`, both of which are in the exclusion set at `:413` |
| `app\sales\services.py:134-139` | Comment claims "The DB enforces one contract per (site_id, contract_type)". **`contract_dropuq_0036` dropped that constraint.** Guard #2 now rests entirely on `find_for_site_and_type` (`maintenance\repository.py:118-135`), which matches only `active/draft/pending/pending_approval/suspended`. Two `cancelled` contracts on the same site+type are now possible and nothing blocks a third. |

#### E. `catalog_0001` left the price-book seeder domain-blind

`catalog_0001` widened the unique key to `(domain, category, option_key)` (`catalog_0001_…py:114-118`), and reads are correctly domain-scoped (`app\sales\controllers\pricing.py:77`, `:138`, `:163`). But the seeder was not updated:

- `seed_default_prices` builds its "already present" set from `(row.category, row.option_key)` across **all** domains — `app\sales\seed.py:88-93`
- and inserts without a `domain`, relying on the ORM default `"installation"` — `seed.py:99-110`, `default_price.py:27`

So a maintenance-domain row for e.g. `("elevator_type","standard")` makes the seeder believe the *installation* option already exists and skip it. The seeder is invoked precisely when the installation domain looks empty (`pricing.py:111-114`), which is the state where this misfires. `catalog_0001:70-74` already seeds `elevator_type` and `capacity` categories under the `maintenance` domain, so the collision surface is live the moment operations prices anything there.

Related, smaller: the `domain` attribute was missing from the ORM model when `catalog_0001` shipped and was patched separately in `8c0c22d` ("fix(backend): add the domain column to the SalesDefaultPrice model") — a one-commit window where the model and schema disagreed.

#### F. Two request-number formats on one unique column

`CR-SALES-…-{hex6}` (worker) and `CR-…` (customer app) both write `customer_contract_requests.request_number`. Beyond the collision risk in §3.6, nothing in the schema or the code distinguishes provenance by number, so any downstream parser must handle both shapes.
## 4. AdminPortal — sales frontend

Scope: `AdminPortal/src/pages/sales/**`, the sales slice of `AdminPortal/src/api/index.ts`, routing in `AdminPortal/src/App.tsx`, the sales nav in `AdminPortal/src/components/layout/Sidebar.tsx`, section gating in `AdminPortal/src/auth/permissions.ts`, the `sales.*` i18n block in `AdminPortal/src/i18n/ar.ts`, and `AdminPortal/src/pages/installations/ContractWizard.tsx`.

All paths below are relative to `C:\Dev\ElevatorProject\`.

---

### 4.1 Page inventory

Three live sales routes; four redirects. All wrapped in `SectionRoute section="sales"`.

| Route | Component | What it shows | API endpoints called |
|---|---|---|---|
| `/sales` (`App.tsx:245`) | `pages/sales/SalesRequests.tsx` | Sales-request workspace: stat filter cards + filter bar + table⇄kanban + `?request=` detail Drawer. Hosts QuoteBuilder, ContractWizard, ContractDocumentDialog, CreateSalesRequestDialog. | `GET /technicians/sales/contract-requests`; `POST …/{id}/status`; `POST …/{id}/ready-to-contract`; `DELETE …/{id}`; `GET …/{id}/history`; `GET /sales/quotes?request_id=`; (via children) `POST …/{id}/build-contract`, `POST …/{id}/update`, `POST/PATCH /sales/quotes`, `POST /sales/quotes/{id}/send`, `GET /sales/quotes/{id}/document.{fmt}`, `GET …/{id}/contract-document.{fmt}`, `POST /technicians/sales/contract-requests`, `GET /sales/pricing/defaults` |
| `/sales/calls` (`App.tsx:246`) | `pages/sales/SalesNewCalls.tsx` (~2,100 lines) | Unified leads workspace (اتصالات الجدد + الاتصالات الدورية merged). Stat cards, «مستحقة اليوم» scope, customer-type segment, periodic toggle, table + `?call=` Drawer with interaction history, 4 action tiles, "promote to sales request". | `GET /technicians/sales/new-calls`; `GET …/new-calls/{id}`; `POST …/new-calls`; `POST …/new-calls/{id}`; `POST …/new-calls/{id}/interactions`; `GET /sales/pricing/defaults` (prewarm, `SalesNewCalls.tsx:1729`) |
| `/sales/quotes` (`App.tsx:247`) | `pages/sales/SalesQuotes.tsx` | عروض الأسعار: sortable table + `?quote=` Drawer (line items, totals, payment terms), print / send / accept / reject / Excel / PDF. | `GET /sales/quotes`; `POST /sales/quotes/{id}/status`; `POST /sales/quotes/{id}/send`; `GET /sales/quotes/{id}/document.{fmt}` |
| `/sales/finance-approvals` | → `Navigate to="/sales/quotes"` (`App.tsx:250`) | — | — |
| `/sales/periodic` | → `Navigate to="/sales/calls"` (`App.tsx:252`) | — | — |
| `/sales/default-pricing` | → `Navigate to="/settings/catalog?tab=installation"` (`App.tsx:255`) | — | — |
| `/installations/sales-requests` | → `Navigate to="/sales"` (`App.tsx:298`) | — | — |

Sales components rendered **outside** `/sales`:

| Host route | Component | Notes |
|---|---|---|
| `/settings/catalog` (`App.tsx:316`) | `pages/sales/SalesDefaultPricing.tsx` embedded twice (`pages/settings/CatalogPage.tsx:277,281`) as `domain="installation"` / `domain="maintenance"` | `GET/PUT /sales/pricing/defaults` |
| `/finance/approvals` (`App.tsx:257`) | `pages/finance/FinanceApprovals.tsx` → `pages/sales/workspace/ApprovalWorkspace.tsx` | zombie flow — see §4.7 |

Sidebar (`components/layout/Sidebar.tsx:215-227`): group «المبيعات» with 4 children → `/sales`, `/sales/calls`, `/sales/quotes`, and `/settings/catalog?tab=installation`.

Section gate: `auth/permissions.ts:97-98` — `sales` unlocked for `operations_manager | sales_manager | sales_rep | customer_service`, plus admins (`isAdminUser`) and anyone with a `sales.*` permission grant (`SECTION_MODULE_MAP.sales = ['sales']`, `permissions.ts:40`). `defaultPathForUser` falls back to `/sales` (`permissions.ts:160`).

---

### 4.2 The request workspace

Container: `pages/sales/SalesRequests.tsx`. Presentational pieces in `pages/sales/workspace/`. The prop contract is documented in `workspace/types.ts`.

**Data + derivation.** One `useQuery(['sales-requests', filters.status, debouncedSearch, limit])` (`SalesRequests.tsx:503-518`) → merged with an optimistic `overrides` map (`:545-564`) → `toRowVM` (`:148-188`) → client-side `rep` filter (`:580-585`) → `sortRows` (`:336-345`).

**Stat cards** (`SalesRequests.tsx:1015-1051`). Server-supplied `counts` + `statusOptions`. An «الكل» card sums all counts; then one card per status. `ACTIVE_FILTER_STATUSES` (`:110-116`) always renders `pending_review / approved_working / approved / rejected / cancelled` even at zero; legacy statuses only render when `count > 0` (`:1032`). Cards are `<Box component="button">` with `aria-pressed`, 4px inline-start accent, `:focus-visible` outline (`StatFilterCard`, `:380-454`). Clicking toggles `filters.status` (which feeds both the query key *and* a redundant client-side filter at `:582`).

**Filter bar** (`workspace/RequestFilterBar.tsx`). Search (debounced 350 ms in the container, `SalesRequests.tsx:494-497`), status select, rep select (derived client-side from loaded rows, `:572-578`), clear button, and the table/kanban `ToggleButtonGroup`. `viewMode` is component state only — **not** persisted to URL or localStorage despite `types.ts:28-30` claiming it is.

**Table** (`workspace/RequestTable.tsx`). 12 columns, 6 visible by default (`SalesRequests.tsx:284-299`), `TableSortLabel` sorting, a column-visibility `Menu`, rows are `role="button" tabIndex={0}` with Enter/Space handlers and `:focus-visible` (`RequestTable.tsx:170-190`). Logical alignment via `cellAlign()` (`:39-43`) mapping `'start'→'left'` and letting `dir=rtl` mirror it.

**Kanban** (`workspace/RequestKanban.tsx`). Native HTML5 drag (`draggable` + `onDragStart/onDragOver/onDrop`), no dnd library. `KANBAN_STATUSES = ['pending_review','approved_working','approved','rejected']` (`SalesRequests.tsx:96-101`); funnel lanes get an Arabic ordinal prefix (`:605-606`). Board scrolls in its own `overflowX:auto` container (`RequestKanban.tsx:248-257`). Cards: `role="button"`, `aria-label`, Enter/Space, `:focus-visible` (`:51-72`).

**Drag-to-status validation.** Three layers:
1. `canDropTo` (`SalesRequests.tsx:905-923`) — hard-blocks `pending_finance | finance_approved | approved | finance_rejected` as drop targets; then `canDragTransition`; then `rejected` requires manager.
2. `canDragTransition` (`salesFormat.ts:257-269`) — forward-only along `SALES_DRAG_FUNNEL = ['pending_review','approved_working']`; same-column drop is a no-op; `rejected`/`cancelled` always allowed from an active stage; terminal sources are locked; `finance_rejected` may only go to `quoted`/`pending_review`.
3. Visual: illegal target column gets a dashed red border + «وجهة غير صالحة» text (`RequestKanban.tsx:132,159-161,191-194`), and `onDragOver` doesn't `preventDefault()` so the browser refuses the drop.

A legal drop does **not** mutate silently — `handleMoveRequest` (`SalesRequests.tsx:878-903`) maps the target status back to an action kind and opens `ActionDialog`, so reject still demands a note.

**Optimistic status update** (`applyStatus`, `SalesRequests.tsx:739-782`): write override → `POST …/status` → replace override with the server record → toast + `query.refetch()`. On failure it rolls the override back; a `409` toasts «transitionBlocked» (warning), `403` and everything else toast the same generic `statusError` (`:768-775` — the 403 branch is a no-op duplicate).

**Detail Drawer** (`workspace/RequestDetailPanel.tsx`). MUI `Drawer anchor="left"` — MUI flips this to the visual right under `theme.direction: 'rtl'` (`theme/index.ts:141`). Explicitly clears the global purple `backgroundImage` override (`:170-174`) and paints a status-colored `borderInlineStart` accent. Contents: header (customer, request number, status chip, «جاهز للتعاقد» chip, contract link chip, print chip) → `StatusStepper` → show/hide-empty toggle → sections (`DetailSection` / `SpecBlock` / `PricingBlock` / `NotesBlock`) → issued quotes card (clickable rows reopen the QuoteBuilder in edit mode, `SalesRequests.tsx:1137-1142`) → status-history timeline → sticky action bar. Route-addressable via `?request=` with `{ replace: true }` (`:627-640`).

**`RequestActionBar` primary-button state machine** (`workspace/RequestActionBar.tsx:71-142`). Exactly three mutually-exclusive states, evaluated in this order:

| Condition | Button rendered | Target |
|---|---|---|
| `Boolean(request.contractId)` | outlined «عرض العقد» (`t.sales.workspace.detail.contractLinkLabel`) | `RouterLink to={"/contracts?contractId=" + contractId}` (`:104`) — **broken, see §4.8** |
| `!contractId && status === 'approved_working' && !readyToContract` | contained «إنشاء عرض سعر» | `onAction({kind:'buildQuote'})` → opens `QuoteBuilderDialog` |
| `!contractId && status === 'approved_working' && readyToContract` | contained «إنشاء العقد» | `onAction({kind:'buildContract'})` → opens `ContractWizard` |

Any other status (`pending_review`, `rejected`, `cancelled`, legacy finance states) renders **no** primary button — only the «الإجراءات» dropdown. That dropdown is always present because `buildActions` (`SalesRequests.tsx:646-723`) always emits at least `approveWorker`, `reject`, `delete`, plus `markReady` (only when `approved_working && !readyToContract && !contractId`) and `reopen`⊕`cancel`. Disabled items stay listed with `disabledReason` as secondary text (`RequestActionBar.tsx:185-189`) — good affordance.

**Role gate.** `MANAGER_ROLES = {system_admin, admin, operations_manager, sales_manager}` (`SalesRequests.tsx:90`) drives `canApproveReject`, which gates `approveWorker`, `reject`, `markReady`, `delete`, and the `rejected` drop target. Frontend-only: the backend re-checks via `_is_sales_manager`.

---

### 4.3 The ContractWizard

`pages/installations/ContractWizard.tsx` (1,092 lines). Lives under `installations/` but is consumed by `pages/sales/SalesRequests.tsx:59,1177` and by the unrouted `pages/installations/InstallationContractRequests.tsx:38,197`. Uses the `t.sales.installMod.*` i18n block.

**Steps** (`:493`): `w.steps.customer` → `site` → `elevators` → `contract`, in an MUI `Stepper alternativeLabel` inside a white `Dialog` (not a Drawer, avoiding the gradient gotcha — `:536`), `fullScreen` on `xs`, header scrolls horizontally on narrow phones (`:550`).

**Edit-in-place.** On open (`:336-375`) it fetches `customersApi.getById(request.customerId)`, `sitesApi.getById(request.siteId)`, and `elevatorsApi.getAll({siteId, pageSize:200})`. Steps 1 and 2 reuse the real module dialogs — `CustomerDialog` and `SiteDialog` — passed `customer={null}` / `site={null}` plus a `prefill` (`customerToPrefill` `:173-193`, `siteToPrefill` `:197-220`), while `onSave` is wired to **`customersApi.update` / `sitesApi.update`** (`:379-387`). Net effect: create-mode UI, update-mode persistence, no duplicate records. Step 3 uses `ElevatorDialog` with `elevatorsApi.create({...data, siteId})` (`:389-390`) and specs prefilled from the request (`elevatorPrefill`, `:222-240`).

Two prefill quirks: an address shorter than 5 chars is dropped so the customer form's zod rule can't silently block save (`:186-188`); site `elevatorCount`/`floorsCount` fall back to the request's technical spec (`:509-517`).

**Gates.** Steps 1 and 2 require `customerSaved` / `siteSaved` before Next (`:467-477`, buttons also `disabled` at `:957,969`). Elevators are optional (`:479-482`). Step 4 shows a review summary (`:718-752`) then the contract form.

**What it sends** (`build.mutationFn`, `:394-414`) → `salesApi.buildContract(request.id, payload)`, camelCase, sparse (only non-empty keys):
- always `startDate`
- optional `endDate`, `totalValue` (Number), `currency`, `contractNumber`, `notes`
- if `contractType === 'maintenance'`: `coverageType`, `visitFrequency`, `visitsPerYear` (Number), `emergencyCallIncluded` (bool, always sent)
- else: `projectName`, `projectCode`
- **no** `customerId` / `siteId` overrides — deliberate, since the request already points at the edited records (`:395-397`).

`onSuccess` (`:415-424`): clear field errors → `setFeedback(...)` → `refetch()` → `onClose()` → `closeDrawer()` → `onBuilt(data ?? request)`, which pops `ContractDocumentDialog` for Excel/PDF export. `onError` maps server field errors inline via `useApiErrors` (`:426-430`), keyed camelCase against the step-4 inputs.

---

### 4.4 API layer contract

`AdminPortal/src/api/client.ts` snake-cases every request body **and query-param** key (`client.ts:95,100`) and camel-cases responses (`:110`). Backend models are `CamelModel` with `populate_by_name`, so snake_case bodies bind fine.

**`salesApi`** (`api/index.ts:372-498`):

| Method | Path | Payload / params | Status |
|---|---|---|---|
| `getContractRequests` | `GET /technicians/sales/contract-requests` | `{status, contractType, group, search, mine, offset, limit}` | ✔ (`backend/app/technicians/controllers/sales.py:315`) — but `contractType` is **alias-only** (`sales.py:320`), see §4.8 |
| `updateContractRequestStatus` | `POST …/{id}/status` | `{status, note, quoteAmount, surveyDate}` | ✔ `sales.py:684` / `SalesContractStatusIn` (`app/sales/schema.py:249-258`) |
| `createContractRequest` | `POST …/contract-requests` | full request body | ✔ `sales.py:435` |
| `updateContractRequest` | `POST …/{id}/update` | partial spec/price/notes | ✔ `sales.py:1136` |
| `financeDecision` | `POST …/{id}/finance-decision` | `{decision, note}` | ⚠️ endpoint exists (`sales.py:770`) but requires `status == "pending_finance"` (`:796`) and **nothing produces that status anymore** (`sales.py:779` comment). Zombie. |
| `buildContract` | `POST …/{id}/build-contract` | contract fields | ✔ `sales.py:828` — but the JSDoc at `api/index.ts:396` says *"Requires status == finance_approved"*; the backend actually requires `approved_working` (`sales.py:862`). Stale comment. |
| `markReadyToContract` | `POST …/{id}/ready-to-contract` | — | ✔ `sales.py:1359` |
| `downloadContractDocument` | `GET …/{id}/contract-document.{xlsx\|pdf}` | — | ✔ `sales.py:1051,1070` |
| `deleteContractRequest` | `DELETE …/{id}` | — | ✔ `sales.py:1104` |
| `getContractRequestHistory` | `GET …/{id}/history` | — | ✔ `sales.py:601` |
| `getNewCalls` | `GET …/new-calls` | `dueToday` pinned raw onto the URL to dodge the snake-case transform (`api/index.ts:445-466`) | ✔ `sales.py:1774` |
| `getNewCall` / `getCallDetail` | `GET …/new-calls/{id}` | — | ✔ `sales.py:1943` (two names, one endpoint) |
| `createNewCall` | `POST …/new-calls` | — | ✔ `sales.py:1863` |
| `updateNewCall` | `POST …/new-calls/{id}` | — | ✔ `sales.py:1989` |
| `logCallInteraction` | `POST …/new-calls/{id}/interactions` | — | ✔ `sales.py:1960` |
| `getPeriodicCalls` | `GET …/periodic-calls` | — | ✔ `sales.py:2075` — **no caller left** (`/sales/periodic` redirects to `/sales/calls`) |
| `getPeriodicCall` | `GET …/periodic-calls/{id}` | — | ✔ `sales.py:2184` — no caller |
| `updatePeriodicCall` | `POST …/periodic-calls/{id}` | — | ✔ `sales.py:2198` — no caller |

**`quotesApi`** (`api/index.ts:533-544`):

| Method | Path | Payload | Status |
|---|---|---|---|
| `list` | `GET /sales/quotes` | `{requestId, status}` → `request_id`, `status` | ✔ (`backend/app/sales/controllers/quotes.py:158`, param `request_id` has no alias so the transform matches) |
| `get` | `GET /sales/quotes/{id}` | — | ✔ `quotes.py:176` |
| `create` | `POST /sales/quotes` | `{requestId, lineItems, discountPct, vatPct, paymentTerms, validUntil, notes, terms, currency, templateOverrides}` | ✔ `quotes.py:313` |
| `update` | `PATCH /sales/quotes/{id}` | same shape | ✔ `quotes.py:474` |
| `send` | `POST /sales/quotes/{id}/send` | `{phone}` | ✔ `quotes.py:560` |
| `setStatus` | `POST /sales/quotes/{id}/status` | `{status}` | ✔ `quotes.py:657` |
| `downloadDocument` | `GET /sales/quotes/{id}/document.{xlsx\|pdf}` | — | ✔ `quotes.py:251,273` |

**`pricingApi`** (`api/index.ts:667-676`): `GET/PUT /sales/pricing/defaults` (✔ `app/sales/controllers/pricing.py:100,123`), `POST /sales/pricing/calculate` (✔ `:197`). `saveDefaults` puts `domain` on the URL string manually rather than in a params object (`api/index.ts:671`) — same alias-avoidance trick as `dueToday`.

**Casing summary.** No camel/snake body mismatches found — the interceptor plus `CamelModel` covers it. The one real casing hazard is FastAPI `Query(alias=…)` params: `contractType` (`sales.py:320`) can never bind because the client snake-cases it. `dueToday` (`sales.py:1783`) hits the same trap and is worked around explicitly; `contractType` is not (no current caller passes it, so it is latent).

**Note.** `BuildContractDialog.tsx:52-56` hand-writes snake_case (`start_date`, `total_value`, …). Harmless (snake→snake is idempotent through `camelToSnake`) but inconsistent with every other caller — and the file is dead anyway (§4.7).

---

### 4.5 State management

- **react-query** everywhere; no Redux/Zustand in sales.
- **Query keys**: `['sales-requests', status, search, limit]`, `['sales-request-quotes', id]`, `['sales-request-history', id]` (`SalesRequests.tsx:504,522,534`); `['approval-workspace', …]` (`ApprovalWorkspace.tsx:489`); `['sales-quotes']` (`SalesQuotes.tsx:163`); `['sales-new-calls', …]`, `['sales-new-call', id]` (`SalesNewCalls.tsx:1785,1714`); `['sales-pricing-defaults']` (`SalesNewCalls.tsx:1728`) and `['sales-default-prices', domain]` (`SalesDefaultPricing.tsx:143`).
- **Invalidation is inconsistent.** `SalesQuotes` and `SalesDefaultPricing` use `queryClient.invalidateQueries` properly (`SalesQuotes.tsx:206,220`; `SalesDefaultPricing.tsx:224`). `SalesRequests` and `ApprovalWorkspace` only call `query.refetch()` on their own handle (`SalesRequests.tsx:763,803,836,1168,1183`). Consequence: building a contract or saving a quote from `/sales` never invalidates `['sales-quotes']`, so `/sales/quotes` serves stale data until remounted.
- **Optimistic updates**: only in `SalesRequests` and only for status, via the hand-rolled `overrides` map (`:491,545-564,739-782`) rather than react-query's `onMutate`/`setQueryData`. Overrides self-expire when the server status catches up (`:551-564`). Deletion also prunes the map (`:796-800`).
- **Pagination** is "grow the limit, offset always 0" (`SalesRequests.tsx:506,1116`) — every "load more" re-fetches the entire window. Kanban shows only the loaded pool.
- **Prefetch**: `usePricingPrewarm` warms `['sales-pricing-defaults']` when a lead is opened so the create-request dialog opens without a spinner (`SalesNewCalls.tsx:1721-1733`).
- **Loading**: `TableSkeleton rows={8} columns={6}` for the initial load (`SalesRequests.tsx:1065`, `ApprovalWorkspace.tsx:738`); `ListSkeleton rows={3}` for the drawer's quotes card (`RequestDetailPanel.tsx:330`); a bespoke 3-row circle+2-line skeleton for the history timeline with `aria-busy`/`aria-live` (`RequestDetailPanel.tsx:416-426`); `Skeleton variant="text"` inside stat cards (`ApprovalWorkspace.tsx:406`); a translucent `CircularProgress` overlay for refetches over an already-rendered table (`RequestTable.tsx:204-217`). Matches the project's skeleton-vs-spinner convention.
- **Empty / error**: dedicated centered cards with icon + title + body, and the error card carries a retry button (`SalesRequests.tsx:1066-1090`, `ApprovalWorkspace.tsx:739-763`). Kanban columns have their own per-column empty text (`RequestKanban.tsx:201-204`).
- **Feedback**: `Snackbar` + `Alert` with `autoHideDuration` in `SalesRequests` (`:1208-1219`), `SalesQuotes`, `SalesNewCalls`, `ContractWizard`, `SalesDefaultPricing`. `ContractWizard` is the exception that also uses the global `ToastProvider` + `useApiErrors` for field-level server errors (`ContractWizard.tsx:305-306,426-430`) — the rest of sales does not wire the validation-error envelope.

---

### 4.6 RTL / i18n / a11y compliance

**Good.** Zero physical margin/padding/border/text-align in the whole `pages/sales/` tree (verified by regex over `marginLeft|marginRight|paddingLeft|paddingRight|borderLeft|borderRight|ml:|mr:|pl:|pr:|textAlign:'left'|'right'`). Everything uses `borderInlineStart`, `marginInlineStart/End`, `textAlign:'start'`, and `px`/`mx` symmetric shorthands. Numbers/dates go through `toLocaleString('ar-SA')` and `salesFormat`'s `Intl` helpers. Icons carry `aria-hidden="true"` almost universally. Exactly one `IconButton` in the tree lacks `aria-label` and it is a `collapsible`-only branch that is currently never enabled (`workspace/DetailSection.tsx:70` — actually *has* `aria-label={section.title}`, so the tree is clean). Touch targets: `minHeight: 44`/`minWidth: 44` on buttons, menu items and icon buttons throughout. `:focus-visible` outlines on stat cards, table rows, kanban cards and clickable quote rows.

**Hardcoded Arabic user-facing strings** (CLAUDE.md §13). These are real violations; most are `placeholder` text and generated file names.

- `components/layout/Sidebar.tsx:216` — `text: 'المبيعات'`; `:222` `'طلبات المبيعات'`; `:223` `'العملاء والاتصالات'`; `:224` `'عروض الأسعار'`; `:226` `'تسعيرات افتراضية'` (the whole sidebar is like this, not just sales).
- `pages/sales/BuildContractDialog.tsx` — **entirely unlocalized**: `:46` `'تاريخ بداية العقد مطلوب'`, `:60` `'تعذر إنشاء العقد'`, `:68` `إنشاء العقد`, `:71-72` body copy, `:77`, `:86`, `:94`, `:95`, `:102`, `:103`, `:109`, `:111` labels/placeholders, `:120` `إلغاء`, `:122` `'جارٍ الإنشاء…'` / `'إنشاء العقد'`. (Dead file — §4.7.)
- `pages/installations/ContractWizard.tsx:86-88` `COVERAGE_OPTIONS` labels `'شاملة'/'جزئية'`; `:91-95` `FREQUENCY_OPTIONS` labels `'شهرية'/'كل شهرين'/'ربع سنوية'/'نصف سنوية'`; placeholders `:791` `"مثال: 50000"`, `:803` `"مثال: SAR"`, `:813` `"يُولَّد تلقائيًا"`, `:866` `"مثال: 12"`, `:897` `"مثال: تركيب مصعد برج السلام"`, `:907` `"يُولَّد تلقائيًا"`, `:921` `"ملاحظات إضافية..."`.
- `pages/sales/workspace/ActionDialog.tsx:177` — `placeholder="اكتب ملاحظاتك هنا..."`.
- `pages/sales/QuoteBuilderDialog.tsx:111-112,123` — Arabic keyword/label literals `'موفر'`, `'انفرتر'`, `'تردد'`, `'بطارية'`, `'طوارئ'`, `'بطارية طوارئ'`; `:211` `'سكك 16'`, `'سكك16'`, `'ثقيل'`; `:415` filename `` `عرض سعر ${who}.${format}` ``; placeholders `:464` `'مثال: 3'`/`'أدخل القيمة'`, `:493`, `:563`, `:566`, `:569`, `:582`, `:583`, `:676`.
- `pages/sales/ContractDocumentDialog.tsx:64` — filename `` `عقد ${who}.${format}` ``.
- `pages/sales/SalesQuotes.tsx:233` — filename `` `عرض سعر ${…}` ``.
- `pages/sales/SalesNewCalls.tsx:1029,1254,1272,1281` — placeholders.
- `pages/sales/SalesDefaultPricing.tsx:653,662` — placeholders.
- `pages/sales/CreateSalesRequestDialog.tsx` — ~28 hardcoded placeholders: `:693,729,742,758,770,773,776,783,793,803,858,868,901,904,907,910,913,1028,1038,1044,1051,1075,1109,1126,1177,1180,1183,1186,1189`.
- `pages/sales/quoteTemplateTables.ts` — 65 Arabic literals (Excel template cell text; arguably data, not UI copy, but it is user-visible in the exported document).

**Other a11y / contrast issues.**
- `workspace/DetailSection.tsx:99` — addon chips render `bgcolor: "#fff"` with `color: colors.success.dark` **on a `#fff` card** → invisible chip boundary. Looks like a botched find/replace that stripped an `alpha(...)` tint.
- `workspace/ActionDialog.tsx:129` — the approve-summary box is `backgroundColor: "#fff"` inside a white dialog → no visual grouping. Same pattern.
- `workspace/RequestDetailPanel.tsx:233,243` — header chips `bgcolor: 'white'` on a white header.
- `ContractDocumentDialog.tsx:100,108` — `ExcelIcon`/`PdfIcon` inside `startIcon` lack `aria-hidden="true"` (every other sales icon has it).
- `ContractDocumentDialog.tsx:88` — `String(request.stopsCount)` bypasses `toLocaleString('ar-SA')`, violating CLAUDE.md §4.4.
- `RequestKanban` has no keyboard equivalent for moving a card between lanes (Enter/Space opens the drawer). Acceptable because the drawer's action menu is the keyboard path, but it is undocumented.
- `RequestActionBar.tsx:162` reuses a **column** label (`t.sales.workspace.columns.actions`) as the dropdown *button* label.

**i18n structure** (`i18n/ar.ts:653-1920`, the `sales:` block, ~1,270 lines). 16 depth-2 groups:

| Group | Line | Usages | Consumer |
|---|---|---|---|
| `common` | 654 | 44 | shared (home/refresh/close/noPhone/notSpecified) |
| `requests` | 666 | 32 | `CreateSalesRequestDialog` (`createRequest.*`) + `spec.*` field labels |
| `quotes` | 831 | 39 | `SalesQuotes` toasts |
| `periodicCalls` | 873 | **1** | `SalesNewCalls.tsx:1542` only |
| `defaultPricing` | 887 | 24 | `SalesDefaultPricing` |
| `contractDoc` | 921 | 1 (aliased `cd`) | `ContractDocumentDialog` |
| `quoteBuilder` | 934 | 43 | `QuoteBuilderDialog` |
| `workspace` | 1019 | **250** | the request workspace; 11 sub-groups: `view, filters, status, stepper, columns, detail, actions, dialog, approve, kanban, toast` |
| `periodicWs` | 1274 | **1** | `SalesNewCalls.tsx:1455` only — ~105 lines for one leaf |
| `callsWs` | 1379 | 142 | `SalesNewCalls` |
| `quotesWs` | 1551 | 35 | `SalesQuotes` + one print chip in the request drawer |
| `pricingWs` | 1619 | 19 | `SalesDefaultPricing` |
| `financeMod` | 1650 | 38 | `pages/finance/FinanceApprovals.tsx` only (zombie flow) |
| `installMod` | 1713 | 23 | `ContractWizard` + unrouted `InstallationContractRequests` |
| `actionBar` | 1913 | 2 | one leaf each for FinanceApprovals + the unrouted installation page |
| `print` | 1917 | 13 | `quotePrint.ts` |

---

### 4.7 Dead code

**Files that exist but are unreachable:**

| File | Status |
|---|---|
| `pages/sales/BuildContractDialog.tsx` (128 lines) | **Dead.** Zero importers — superseded by `ContractWizard`. Also the only fully-unlocalized sales file. |
| `pages/installations/InstallationContractRequests.tsx` (~230 lines) | **Dead.** Not imported in `App.tsx`; no route. Its only entry point was `/installations/sales-requests`, now a redirect to `/sales` (`App.tsx:298`). It is the sole consumer of `t.sales.actionBar.installHint` and a co-consumer of `t.sales.installMod`. |
| `pages/finance/FinanceApprovals.tsx` | **Alive but zombie.** Still routed at `/finance/approvals` (`App.tsx:257`) and still in the sidebar («اعتماد طلبات التعاقد»). It filters on `pending_finance / finance_approved / finance_rejected` (`:77,83,89`) and calls `salesApi.financeDecision` (`:152`) — but `backend/app/technicians/controllers/sales.py:779` states *"Nothing enters `pending_finance` anymore"*, and `SalesRequests.tsx:92-95` confirms *"there is no finance step on the request"*. The page will show only legacy rows, and the sole actionable bucket is permanently empty. |
| `pages/sales/SalesDefaultPricing.tsx` | **Alive, relocated.** Not routed under `/sales` any more; embedded twice into `pages/settings/CatalogPage.tsx:277,281`. |

**Unreachable code paths inside live files:**

- The entire **`approve` action kind**. `RequestActionKind` still declares `'approve'` (`workspace/types.ts:113`), `ACTION_ICON` maps it (`RequestActionBar.tsx:46`), `ActionDialog` implements a full guarded approve-confirmation UI — value summary, accepted-quote summary, «سيتم إنشاء عقد» warning, manager-only alert (`ActionDialog.tsx:93,120-148,201,208`) — and `SalesRequests` builds `approveContext` for it (`:929-940`) and picks an `approveSuccess` toast (`:865-866`). **None of it can fire**: `buildActions` only ever emits `approveWorker` (`SalesRequests.tsx:656`), and `ACTION_TARGET` has no `approve` key (`:135-142`) so even a synthetic dispatch bails at `:860`. The `ApproveConfirmContext` type, `t.sales.workspace.approve.*` (except `managerOnly`, reused as a disabled-reason), and `quotesQuery`-derived accepted-quote lookup are all dead weight.
- `DIALOG_META` (`ActionDialog.tsx:54-61`) has no entry for `approveWorker`, `markReady` or `delete`, so «اعتماد» opens a dialog titled with the generic `t.sales.workspace.actions.confirm`.
- `RequestActionKind` members `'contact'` and `'siteSurvey'` are in `ACTION_TARGET` (`SalesRequests.tsx:136-137`) and `DIALOG_META`, but `buildActions` never emits them, and `canDragTransition` cannot reach `contacted`/`site_survey` (they're not in `SALES_DRAG_FUNNEL`). Dead.
- `salesFormat.allowedTargets()` (`salesFormat.ts:239-241`) — exported, never called.
- `salesApi.getPeriodicCalls` / `getPeriodicCall` / `updatePeriodicCall` (`api/index.ts:482-489`) — no callers after `/sales/periodic` became a redirect.
- `RequestTableProps.onAction` is **required** (`workspace/types.ts:311`) and passed by both containers, but `RequestTable` never destructures or uses it (`RequestTable.tsx:112-120`).
- `DetailPanelProps.canApproveReject` is required, threaded through, then explicitly discarded (`RequestDetailPanel.tsx:142,148 → void _canApproveReject`).
- `DetailSection`'s `collapsible` / `defaultCollapsed` / `headerExtra` props are never passed `true`/non-default by any caller (`RequestDetailPanel.tsx:297-298` hardcodes `false`).
- `t.sales.periodicWs` (~105 lines, `ar.ts:1274-1378`) is referenced by exactly one leaf (`SalesNewCalls.tsx:1455`); `t.sales.periodicCalls` (`ar.ts:873`) by exactly one (`SalesNewCalls.tsx:1542`).
- `salesFormat.STATUS_ORDER` still lists `contacted/site_survey/quoted/pending_finance/finance_approved/finance_rejected` and `STATUS_COLOR`/`STATUS_SEVERITY`/`REQUEST_STATUS_EDGES` carry all of them — deliberately, to avoid trapping legacy rows, but it means six of eleven statuses are historical only.

---

### 4.8 Risks / bugs

**B1 — "عرض العقد" navigates to a nonexistent route (high).** `workspace/RequestActionBar.tsx:104` and `workspace/RequestDetailPanel.tsx:231` link to `/contracts?contractId=…`. `App.tsx` has no top-level `contracts` route: the real page is `customers/contracts` (`:234`), and `contracts` only exists nested under `maintenance` as a redirect (`:301`). `/contracts` therefore falls through to the catch-all `<Route path="*" element={<Navigate to="/" replace />} />` (`App.tsx:320`) — the user is dumped on the dashboard. Note `ContractWizard.tsx:1076` gets it right (`to="/customers/contracts"`). Also: nothing in `pages/maintenance/Contracts.tsx` reads a `contractId` search param, so even after the path is fixed the deep-link won't select the contract.

**B2 — "تحميل المزيد" 422s on the 4th click (high).** `PAGE = 30` (`SalesRequests.tsx:87`) and `setLimit(prev => prev + PAGE)` (`:1116`) drives `limit` to 30 → 60 → 90 → **120**, but the backend caps it at `Query(50, ge=1, le=100)` (`backend/app/technicians/controllers/sales.py:326`). The 4th click returns 422, `query.isError` flips, and the workspace replaces the whole table with the error card — losing everything already loaded. `ApprovalWorkspace.tsx:79,791` is identical. `SalesNewCalls.tsx:93` (`PAGE = 50`) hits the same wall at the 5th click against `le=200` (`sales.py:1785`).

**B3 — StatusStepper renders an unlabeled middle step (medium).** `STEPPER_STATUSES = ['pending_review','approved_working','approved']` (`salesFormat.ts:115-119`) but `STEP_LABEL` (`workspace/StatusStepper.tsx:11-17`) only maps `pending_review / contacted / site_survey / quoted / approved` — there is no `approved_working` key. Step 2 of every request's stepper renders `undefined` → blank caption (`:60,98`). Related: the `effectiveIndex` fallback comment says *"up to quoted"* but `STEPPER_STATUSES.length - 2` is now index 1 = `approved_working` (`:33`).

**B4 — the ContractWizard success toast can never be seen (medium).** `build.onSuccess` (`ContractWizard.tsx:415-424`) calls `setFeedback(...)` and then `onClose()`. `SalesRequests` renders the wizard conditionally — `{contractRequest ? <ContractWizard … /> : null}` (`:1176-1188`) — so `onClose` sets `contractRequest = null`, unmounting the wizard *and* its own `Snackbar` (`:1061-1089`) in the same commit. `t.sales.installMod.toast.built` and the «فتح العقود» link action are therefore unreachable. (The user still gets `ContractDocumentDialog` via `onBuilt`, so it degrades rather than fails silently.)

**B5 — the wizard dead-ends on a request with no customer/site (medium).** `handleSaveCustomer` throws when `request.customerId` is null (`ContractWizard.tsx:380`), and the "edit customer" button is `disabled={… || !customerRecord}` (`:598`). If the fetch at `:352-357` never populates `customerRecord`, the button stays disabled, `customerSaved` stays false, and Next is permanently disabled (`:957`) — no error surfaces, the wizard just cannot advance. Same for site (`:384,641,969`). The backend does reject a site-less request (`sales.py:894-898`), but the UI gives the user no way to find that out.

**B6 — server-side search misses the column the table shows (medium).** `GET /contract-requests` filters on `contact_name | contact_phone | request_number | site_name` (`sales.py:376-382`), yet `customerName` — the table's first, boldest, sortable column and the kanban card title — is sourced from the joined `customer.name` (`sales.py:263`). Typing the displayed customer name into the search box can return nothing. The client-side layer does not compensate (search is server-only; only `rep` is filtered client-side, `SalesRequests.tsx:583`).

**B7 — a sales user sees a nav item they are not allowed to open (medium).** `Sidebar.tsx:226` renders «تسعيرات افتراضية» with `section: 'sales'` but `path: '/settings/catalog?tab=installation'`. The target is `SectionRoute section="settings"` (`App.tsx:316`), and `canAccessSection(user,'settings')` returns `false` for everyone except admins (`auth/permissions.ts:110-111`, and `SECTION_MODULE_MAP.settings = []` so no grant can unlock it, `:44`). A `sales_manager`/`sales_rep` sees the link and gets bounced.

**B8 — `contractType` filter can never bind (low, latent).** `sales.py:320` declares `Query(None, alias="contractType")`, but `client.ts:100` snake-cases every query key → `contract_type`, which the alias does not accept. `salesApi.getContractRequests` advertises the param (`api/index.ts:373`); no sales page passes it today, so it is latent. This is exactly the trap already documented and worked around for `dueToday` (`api/index.ts:446-455`).

**B9 — cross-page cache staleness (low).** `SalesRequests` never invalidates `['sales-quotes']` after `QuoteBuilderDialog.onSaved` (`:1167-1170`) or after a contract build; it only refetches its own key. Navigating to `/sales/quotes` shows pre-save data until the page remounts. Symmetrically, `SalesQuotes`' accept/reject never invalidates `['sales-requests']` or `['sales-request-quotes', id]`.

**B10 — quotes list is silently capped and `total` is wrong (low).** `SalesQuotes.tsx:164` calls `quotesApi.list()` with no `limit`, so the backend default `50` applies (`quotes.py:164`), with no pagination UI. Worse, the endpoint returns `"total": len(items)` (`quotes.py:173`) — the page size, not the row count — so any total displayed is a lie once ≥50 quotes exist.

**B11 — `approved`/`cancelled` are unreachable from the kanban but presented as lanes (low).** `KANBAN_STATUSES` includes `approved` (`SalesRequests.tsx:96-101`) while `canDropTo` hard-blocks it (`:911-913`). Correct by design (contracts are built, not dragged) but the column reads as an ordinary funnel stage with an Arabic ordinal (`:606`) and gives no explanation when a drop is refused beyond the generic «وجهة غير صالحة». `cancelled` is filterable via a stat card but has no lane at all.

**B12 — `applyStatus` 403 branch is a no-op (cosmetic).** `SalesRequests.tsx:771-775` — the `403` case and the `else` case set the identical `statusError` toast, so a permission failure is indistinguishable from a network error.

**B13 — duplicated view-model layer (maintainability).** `toRowVM`, `buildSections`, `defaultColumns`, `sortValue` and `sortRows` are copy-pasted between `SalesRequests.tsx:148-345` and `ApprovalWorkspace.tsx:140-331`, with two behavioural divergences already: `sortValue('status')` sorts by funnel index in one (`SalesRequests.tsx:318`) and alphabetically by label in the other (`ApprovalWorkspace.tsx:316`); `buildSections`' notes group includes `generalNotes` in the workspace copy (`ApprovalWorkspace.tsx:259`) but deliberately drops it in the sales copy (`SalesRequests.tsx:263-275`).

**B14 — manager-role sets disagree (low).** `SalesRequests.tsx:90` uses `{system_admin, admin, operations_manager, sales_manager}`; `ApprovalWorkspace.tsx:446` uses `{system_admin, admin, operations_manager}` — `sales_manager` is missing. Currently harmless because the value is discarded downstream (`RequestDetailPanel.tsx:148`), but it is a live footgun if anyone starts honouring it.

**B15 — `ContractWizard` reset effect keyed on an object (low).** `useEffect(… , [open, request])` (`ContractWizard.tsx:336-375`) resets `activeStep`, `customerSaved`, `siteSaved` and refetches. `request` is an object; it is stable today only because `SalesRequests` snapshots it into state once (`:823`). Any future change that passes a freshly-derived request (e.g. from `mergedItems`) would reset the wizard mid-flow on every list refetch.
## 5. mobile-worker — field sales app

Scope: `C:\Dev\ElevatorProject\mobile-worker\src\screens\workstation\sales\*` plus the navigation/gating and API-client surface that feeds it. All backend citations are to `C:\Dev\ElevatorProject\backend\app\technicians\controllers\sales.py` (the router mounted at `/technicians/sales`) and `C:\Dev\ElevatorProject\backend\app\sales\schema.py`.

---

### 5.1 How the rep reaches sales

| Entry point | File:line | Gate |
| --- | --- | --- |
| Bottom tab «المبيعات» → `SalesRequestsScreen` | `C:\Dev\ElevatorProject\mobile-worker\src\navigation\RootNavigator.tsx:145` | `visibility.showSales` |
| `showSales` resolution | `C:\Dev\ElevatorProject\mobile-worker\src\navigation\roleTabs.ts:37` | `canAccessSalesRep(profile)` |
| Role predicate | `C:\Dev\ElevatorProject\mobile-worker\src\screens\visits\taskUtils.ts:29` | roles ∩ `{sales, sales_rep, sales_representative, sales_manager, admin}` |
| Manager scope predicate | `C:\Dev\ElevatorProject\mobile-worker\src\screens\visits\taskUtils.ts:37` | roles ∩ `{sales_manager, operations_manager, admin}` |
| Workstation hub card «المبيعات» → route `SalesRequests` | `C:\Dev\ElevatorProject\mobile-worker\src\screens\workstation\WorkstationHub.tsx:51` | `canAccessSalesRep` |
| Dashboard «المبيعات» section (KPI cards + top-3 offers) | `C:\Dev\ElevatorProject\mobile-worker\src\screens\dashboard\DashboardScreen.tsx:945,1047` | `canAccessSalesRep` |

Gating is **frontend-only for tab visibility**; the server independently enforces `_ensure_sales_access` on every route (`sales.py:206`), with role set `SALES_ROLES = {admin, operations_manager, sales_rep, sales_manager, customer_service}` (`sales.py:40`). Note the app's `canAccessSalesRep` accepts a bare `"sales"` role that the backend's `SALES_ROLES` does not — such a user would see the tab and get 403 on every request.

Stack registrations: `RootNavigator.tsx:319-324` (`SalesOfferCreate`, `NewCallCreate`, `NewCallDetail`, `PeriodicCalls`, `PeriodicCallCreate`, `SalesRequests`). Param types at `RootNavigator.tsx:75-80`.

---

### 5.2 Screen inventory

| Screen / tab | File | Purpose | Endpoints | What the rep can do |
| --- | --- | --- | --- | --- |
| `SalesRequestsScreen` | `...\sales\SalesRequestsScreen.tsx` | Shell: purple header + 3 chips (`offers` / `contracts` / `execution`) with badge counts | via `fetchSalesTabCounts` (`SalesShared.tsx:46`) | Switch tabs only. **Calls is not one of the tabs** (`SalesRequestsScreen.tsx:33-37`) |
| `OffersTab` | `...\sales\OffersTab.tsx` | العروضات — the offer pipeline list | `GET /technicians/sales/contract-requests?group&mine&sort&offset&limit[&search]` (`OffersTab.tsx:99`) | Create offer (`:148`), open/edit offer (`:179`), filter by `all/review/working/rejected` (`:162-165`), sort, search, paginate |
| `ContractsTab` | `...\sales\ContractsTab.tsx` | العقود — offers that became contracts | same endpoint with `group=approved` (`ContractsTab.tsx:72-74`) | Read-only list + `DetailSheet` + tap-to-call; managers toggle عقودي/الكل (`:128-136`) |
| `ExecutionTab` | `...\sales\ExecutionTab.tsx` | متابعة التنفيذ — installation project progress | `GET /technicians/sales/execution?sort&mine&offset&limit[&search]` (`ExecutionTab.tsx:83`) | Read-only progress bars + `DetailSheet` + call customer; manager scope toggle |
| `SalesOfferCreateScreen` | `...\sales\SalesOfferCreateScreen.tsx` | إدخال/تعديل طلب المبيعات — the offer form | `GET /sales/pricing/defaults` (`:260`), `GET .../contract-requests/{id}` (`:175`), `POST .../contract-requests` or `.../{id}/update` (`:426`), `GET .../lookup-phone` via `lookupPhone` | Fill/edit full elevator spec, auto-price, payment split, save. View-only once locked (`:135`, `:515`) |
| `OfferWorkPanel` (embedded in the offer screen) | `...\sales\OfferWorkPanel.tsx` | Call log + quote export + "customer ready" signal | `GET/POST .../contract-requests/{id}/calls` (`:97`,`:123`), `POST .../ready-to-contract` (`:151`), `GET /sales/quotes/{quoteId}/document.pdf` (`:182`) | Register a call with outcome+note, share the official quote PDF, flag ready-to-contract |
| `CallsTab` | `...\sales\CallsTab.tsx` | الاتصالات (leads list) | `GET/POST /technicians/sales/periodic-calls[/{id}]` (`:101`,`:152`) | **Orphaned** — imported by nothing (see §5.9) |
| `NewCallsTab` | `...\sales\NewCallsTab.tsx` | اتصالات الجدد | `GET /technicians/sales/new-calls` (`:85`) | **Orphaned** — imported by nothing |
| `NewCallDetailScreen` | `...\sales\NewCallDetailScreen.tsx` | Lead detail + call timeline | `GET .../new-calls/{id}` (`:77`), `lookupPhone` (`:86`), `POST .../contract-requests/{offerId}/calls` (`:112`) | Call the lead, open/create the offer, edit the lead, register a call **against the offer** — reachable only from the two orphaned tabs |
| `NewCallCreateScreen` | `...\sales\NewCallCreateScreen.tsx` | Register / edit a new-customer call | `GET/POST .../new-calls[/{id}]` (`:80`,`:144`) | Name/phone/address/dates/3 notes + outcome (create) or status (edit) |
| `PeriodicCallsScreen` | `...\sales\PeriodicCallsScreen.tsx` | الاتصالات الدورية (full screen) | `GET .../periodic-calls` (`:94`), `POST .../periodic-calls/{id}` (`:146`) | Filter chips from server, scope toggle, soft-delete, open editor. **No navigation entry exists** (registered at `RootNavigator.tsx:322` but nothing calls `navigate('PeriodicCalls')`) |
| `PeriodicCallCreateScreen` | `...\sales\PeriodicCallCreateScreen.tsx` | Add/edit a follow-up customer | `GET/POST .../periodic-calls[/{id}]` (`:63`,`:119`) | Name/phone/address, type فرد/شركة, source, classification, next-call date, note |
| `SalesShared` | `...\sales\SalesShared.tsx` | `SearchBar`, `SearchSortBar`, `DetailSheet`, `ShowMoreButton`, `DuplicatePhoneBanner`, `lookupPhone`, `fetchSalesTabCounts` | `GET .../lookup-phone` (`:19`), 4× count probes (`:48-53`) | — |

#### Endpoint map (client constants)

All sales paths live in one block: `C:\Dev\ElevatorProject\mobile-worker\src\config\api.ts:168-199`.

| Constant | Path | Used by |
| --- | --- | --- |
| `CONTRACT_REQUESTS` / `CREATE_CONTRACT_REQUEST` | `/technicians/sales/contract-requests` | OffersTab, ContractsTab, SalesShared, Dashboard, offer create |
| `CONTRACT_REQUEST_DETAIL` | `/technicians/sales/contract-requests/{id}` | offer edit load |
| `UPDATE_CONTRACT_REQUEST` | `.../{id}/update` | offer edit save |
| `CONTRACT_REQUEST_STATUS` | `.../{id}/status` | **declared but never called** from the app |
| `OFFER_CALLS` | `.../{id}/calls` | OfferWorkPanel, NewCallDetail |
| `OFFER_READY` | `.../{id}/ready-to-contract` | OfferWorkPanel |
| `QUOTE_DOCUMENT_PDF` | `/sales/quotes/{quoteId}/document.pdf` | OfferWorkPanel |
| `PRICING_DEFAULTS` | `/sales/pricing/defaults` | offer form |
| `PRICING_CALCULATE` | `/sales/pricing/calculate` | **declared but never called** (price is computed client-side) |
| `NEW_CALLS` / `CREATE_NEW_CALL` / `NEW_CALL_DETAIL` / `NEW_CALL_UPDATE` | `/technicians/sales/new-calls[...]` | NewCallsTab, NewCallCreate, NewCallDetail |
| `NEW_CALL_INTERACTIONS` | `.../new-calls/{id}/interactions` | **declared but never called** (calls now go through `OFFER_CALLS`) |
| `PERIODIC_CALLS` / `CREATE_PERIODIC_CALL` / `PERIODIC_CALL_DETAIL` / `PERIODIC_CALL_UPDATE` | `/technicians/sales/periodic-calls[...]` | CallsTab, PeriodicCalls*, `fetchSalesTabCounts` |
| `EXECUTION` | `/technicians/sales/execution` | ExecutionTab |
| `LOOKUP_PHONE` | `/technicians/sales/lookup-phone` | all three create forms + NewCallDetail |

---

### 5.3 The offer creation flow (`SalesOfferCreateScreen`)

**Form state** — 30 string fields, `FormState` at `SalesOfferCreateScreen.tsx:56-88`, defaults at `:90-99` (payment split pre-seeded 40/25/30/5).

| Section | Field (label) | Control | Source of options | Line |
| --- | --- | --- | --- | --- |
| بيانات العميل والمصعد | اسم العميل | `Field` | — | `:519` |
| | نوع العميل | `EditableDropdown` | hardcoded `['شركة','فرد','جهة حكومية','مقاول']` | `:520` |
| | رقم الجوال | `Field` phone-pad | — (triggers duplicate lookup) | `:521` |
| | العنوان | `Field` multiline | — | `:523` |
| | تاريخ التسجيل | `DateField` | native picker, `YYYY-MM-DD` | `:524` |
| | عدد المصاعد / الوقفات | numeric | — | `:526-527` |
| | الطوابق / المداخل | numeric | — | `:530-531` |
| | نوع المصعد | dropdown | pricing category `elevator_type`; also auto-fills both door types to `تلسكوبيك` | `:533`, `:306-313` |
| | الحمولة | dropdown numeric | `capacity` | `:534` |
| | نوع الماكينة | dropdown | `machine_type` | `:535` |
| | إضافات | `MultiSelect` chips | `addon` | `:536` |
| الأبواب والأبعاد والسعر | نوع الباب (خارجي) / مقاس الباب / الباب الداخلي | dropdowns | `door_external` / `door_size` / `door_internal` | `:542-544` |
| | عرض البئر / طول البئر / مقاس الكابينة / حفرة البئر / ارتفاع الدور الأخير | free text | — | `:546-552` |
| | مكان الأثقال | dropdown | hardcoded `['خلفي','جانبي']` | `:554` |
| | السعر حسب النظام + «استخدم سعر النظام» | computed + button | `systemPrice` memo `:295-303`; `applySystemPrice` `:318` | `:557-570` |
| | السعر | numeric | manual override | `:571` |
| | المندوب | text, prefilled from the logged-in worker | `:232-244` | `:573` |
| | ملاحظة 1/2/3 | text | — | `:574-576` |
| | نسب الدفعات 1..4 | numeric, blur auto-fills the *next* field with the remainder to 100 | `setPaymentPct` `:328`, `autoFillNextPayment` `:340-354` | `:580-585` |
| ملاحظات المندوب | ملاحظات المندوب | multiline | — | `:592` |

**Price computation** is entirely client-side: `PRICED` maps 6 categories to form keys (`:41-48`), `priceMap` normalizes labels lowercase (`:285-292`), `systemPrice` sums the 6 selected option prices + all selected addons (`:295-303`). `/sales/pricing/calculate` is never used.

**Validation before POST** (`:356-374`):
1. `customerName` non-empty, else `appAlert('تنبيه','اسم العميل مطلوب.')`.
2. `paymentPct1..4` must sum to 100 ± 0.01, else an alert quoting the current sum.
3. **`contactPhone` is NOT validated client-side** — but the backend hard-requires it (`sales.py:456`, `detail="customerName and contactPhone are required"`), so an offer saved without a phone surfaces a raw English detail string inside an Arabic error alert (`SalesOfferCreateScreen.tsx:435`).

**Payload** (`:385-421`) — camelCase, matching `SalesContractRequestIn` (`schema.py:139-196`, `CamelModel` with `alias_generator=to_camel`, `extra="ignore"` at `schema.py:74-83`): `customerName, customerType, contactPhone, addressText, registerDate?, elevatorsCount?, elevatorType, stopsCount?, floorsCount?, entrancesCount?, capacity, machineType, addons[], doorExternal, doorSize, doorInternal, shaftWidth, shaftLength, cabinSize, pitDepth, overheadHeight, counterweightPosition, systemPrice, manualPrice, currency, paymentPct1..4, note1..3, repName, repNotes, selections{}`.
`selections` has **no** schema field and is silently discarded (`extra="ignore"`). Same body is POSTed to `/update` in edit mode (`:423-425`), where `SalesContractRequestUpdate` (`schema.py:199-246`) *does* cover the counts/prices/addons — but not `contract_type`, `city`, `region`, `site_name`.

**What the backend materializes** (`sales.py:435-568`):
1. `contract_type` defaults to `installation` (`:443-446`).
2. `site_name` falls back to the customer name, `address_text` falls back to the site name (`:453-455`) — the app never sends either.
3. Customer: looked up by **exact string equality** on `Customer.contact_phone` (`:461-466`); if none, a new `Customer` is created with `customer_type` defaulting to `"company"` (`:467-479`); if found, its name/contact/email are overwritten (`:481-484`).
4. Site: a **new `Site` is created unconditionally on every offer** with `next_site_code(db, customer)` (`:486-503`) — even when the customer already existed.
5. `CustomerContractRequest` with `status="pending_review"`, `source="worker_sales_app"`, `instructions_acknowledged=True`, `created_by_user_id=current_user.id`, plus the whole spec and price block (`:505-556`); `AuditLog` `sales_contract_request_created_from_worker_app` (`:558-566`).
6. Response is `_request_payload` (`sales.py:243-311`); the app only reads `saved.requestNumber` for the success dialog (`:441`).

---

### 5.4 The rep's view of the pipeline

Backend truth: `STATUS_LABELS` (`sales.py:48-64`) and `REQUEST_STATUS_EDGES` (`sales.py:92-109`). The **finance stages were retired** — `pending_finance` / `finance_approved` / `finance_rejected` no longer exist as live statuses and migration `sales_reqfin_0032` folded their rows away (`sales.py:57-61`, `:104-106`). Live funnel: `pending_review → approved_working → approved`, with `rejected` / `cancelled` branches; `contacted`, `site_survey`, `quoted` are legacy labels kept for historical rows.

| App concept | App location | Backend mapping |
| --- | --- | --- |
| Group chip «العروض» (`all`) | `OffersTab.tsx:162` | `status != 'approved'` (`sales.py:355-358`) |
| «قيد المراجعة» (`review`) | `OffersTab.tsx:163` | `status == 'pending_review'` (`sales.py:359-361`) |
| «المعتمدة» (`working`) | `OffersTab.tsx:164` | `status == 'approved_working'` (`sales.py:362-364`) |
| «المرفوضة» (`rejected`) | `OffersTab.tsx:165` | `status == 'rejected'` (`sales.py:367-368`) |
| Contracts tab | `ContractsTab.tsx:72` (`group='approved'`) | `status == 'approved'` (`sales.py:369-370`) |
| Editable window | `OffersTab.tsx:59`, `SalesOfferCreateScreen.tsx:106` — `{pending_review}` | `_EDITABLE_REQUEST_STATUSES = {"pending_review"}`, 409 otherwise (`sales.py:1160-1166`) — mirrored exactly |
| Work panel visible | `SalesOfferCreateScreen.tsx:138` — `['approved_working','approved']` | — (client-only) |
| Actions allowed | `SalesOfferCreateScreen.tsx:142` — `approved_working` | call POST gate `sales.py:1313-1317` (409), ready gate `sales.py:1374-1378` (409) — mirrored |
| Status pill colours | `OffersTab.tsx:43-55` and `DashboardScreen.tsx:95-107` | still contain the three retired `*finance*` keys — dead entries |

**readyToContract — "customer signed"**: the rep taps «العميل جاهز للتعاقد — إبلاغ المدير» (`OfferWorkPanel.tsx:220-225`) → `POST .../ready-to-contract` (`:151`). Server side `mark_offer_ready_to_contract` (`sales.py:1359-1391`) checks owner-or-manager, requires `status == 'approved_working'` for non-managers, sets `ready_to_contract = True`, writes an `AuditLog`, and **does not change status and does not emit any notification**. The flag is read back into `_request_payload.readyToContract` (`sales.py:254`), rendered by the app (`SalesOfferCreateScreen.tsx:219,489`; `OfferWorkPanel.tsx:90,214-218`) and consumed by AdminPortal (`AdminPortal/src/pages/sales/workspace/RequestActionBar.tsx:74`, `RequestDetailPanel.tsx:217`). Column: `backend/app/maintenance/models/contract.py:190`.

---

### 5.5 Leads / calls in the app

The backend treats اتصالات الجدد and الاتصالات الدورية as **one lead table** (`CustomerCallLog`) behind two views: `_leads_scope_query` / `_leads_list_response` are shared (`sales.py:1626-1772`), `/new-calls` orders by `created_at desc` and `/periodic-calls` orders soonest-due-first.

| | `/new-calls` (`sales.py:1774`) | `/periodic-calls` (`sales.py:2075`) |
| --- | --- | --- |
| Query params the app sends | `status`, `mine`, `search`, `offset`, `limit` (`NewCallsTab.tsx:81-84`) | `filter`, `mine`, `sort`, `search`, `offset`, `limit` (`CallsTab.tsx:95-100`; `PeriodicCallsScreen.tsx:91-93`) |
| Response keys the app reads | `items`, `total`, `hasMore` (`NewCallsTab.tsx:94-97`) | `items`, `total`, `hasMore`, **`filters`** (`CallsTab.tsx:108-112`) |
| Extra keys the server returns but the app ignores | `counts`, `statusOptions`, `outcomeOptions` (`sales.py:1815-1824`) | — |

The periodic endpoint's docstring is explicit that the wire shape is frozen for this app: *"The response shape is unchanged (items/total/offset/limit/hasMore/filters) so the mobile worker keeps working"* (`sales.py:2090-2093`). The app's dependency on `filters` is real — `CallsTab.tsx:111` and `PeriodicCallsScreen.tsx:106` replace their local fallback chip list with the server's `PERIODIC_FILTERS` (`sales.py:180-190`). `CallsTab`'s `sort` handling also relies on the "no `sort` param = soonest-due" contract (`CallsTab.tsx:98-99` vs `sales.py:2103-2119`).

Local fallback filter lists diverge: `CallsTab.tsx:51-60` includes `due` while `PeriodicCallsScreen.tsx:51-59` omits it — only matters for the first frame before the server list arrives.

Item payload consumed: `_call_payload` (`sales.py:1415-1449`) supplies `customerName, phone, address, customerType, source, sourceLabel, status, statusLabel, classification, note (= register_note), nextCallDate, callCount, lastCallAt`; list responses additionally stamp `lastCallerName` (`sales.py:1621`).

Lead status vocabulary is `CALL_STATUS_LABELS` (`sales.py:126-133`): `new, interested, following, not_interested, converted, deleted`. Soft delete = `POST /periodic-calls/{id}` with `{status:'deleted'}` (`CallsTab.tsx:152-156`, `PeriodicCallsScreen.tsx:146-150`).

Call registration is **offer-first**: `NewCallDetailScreen` no longer posts to `/new-calls/{id}/interactions`; it resolves the customer's offer by phone via `lookupPhone` and posts to `.../contract-requests/{offerId}/calls` (`NewCallDetailScreen.tsx:84-91, 112`). `CallsTab`'s create button also opens the offer form rather than a call form (`CallsTab.tsx:181-187`).

---

### 5.6 Coupling risks (backend field/shape the app depends on)

1. **`contractNumber` does not exist on the wire.** `ContractsTab.tsx:30` types it and `:141` / `:198` render `item.contractNumber || item.requestNumber`. `_request_payload` (`sales.py:243-311`) emits `contractId` but never `contractNumber` → the العقود tab always shows the `CR-SALES-…` request number, never the real contract number. Silent, permanent fallback.
2. **Retired finance statuses hardcoded in the app.** `OffersTab.tsx:50-52`, `DashboardScreen.tsx:100-102` colour-map `pending_finance` / `finance_approved` / `finance_rejected`; `NewCallDetailScreen.tsx:150` branches on them to show "تم إرسال الطلب للمالية — لا يمكن تسجيل مكالمات جديدة." Those statuses were removed server-side (`sales.py:57-61`) and migrated away, so that message is now unreachable and the `sentToFinance` copy is misleading for `approved` (which *is* still reachable and means "contract built", not "sent to finance").
3. **`group=finance` still exists server-side** (`sales.py:365-366`) with no client using it — dead bucket on both sides.
4. **`selections` is sent and discarded.** `SalesOfferCreateScreen.tsx:382-383,420` builds it; `SalesContractRequestIn` has no such field and `extra="ignore"` drops it (`schema.py:82`). Whatever it was meant to persist does not.
5. **`callDate` / `nextCallDate` are dropped on new-call edit.** `NewCallCreateScreen.tsx:135-136` sends them to `NEW_CALL_UPDATE`, but `NewCallUpdateIn` (`schema.py:348-357`) has neither field and `update_new_call` (`sales.py:2006-2019`) only applies `status, register_note, worker_note_1/2, phone, address, customer_name`. Editing a lead's next-call date is a no-op that reports success.
6. **`lookup.periodic` is always `[]`** (`sales.py:1858`), so `DuplicatePhoneBanner`'s "N متابعة" clause (`SalesShared.tsx:249`) can never render.
7. **Phone matching is fuzzy on both sides but inconsistently.** `lookup-phone` matches on the **last 9 digits with `ILIKE '%…%'`** (`sales.py:1839`), while offer creation dedupes the Customer by **exact `contact_phone` string equality** (`sales.py:461-466`). `NewCallDetailScreen.tsx:87` then takes `lookup.requests[0]` (newest by `created_at`) as "the" offer for the lead — it can bind to a rejected/stale offer, or to a different customer whose number shares the last 9 digits.
8. **Tab-badge vs list-count mismatch.** `fetchSalesTabCounts` counts offers with `group=active` (`SalesShared.tsx:49`) while `OffersTab` reports its count from `group=all` (`OffersTab.tsx:112`) — the badge changes value the moment the tab is opened. Contracts/execution badges are pinned to `mine=true` regardless of the `mine` argument (`SalesShared.tsx:50,52`, documented at `:42-45`).
9. **Manager-only mutation surface not reflected in the UI.** `update_periodic_call` (`sales.py:2205-2208`) and `update_new_call` (`sales.py:2002-2003`) 403 for non-owners, but `CallsTab`/`PeriodicCallsScreen` show the delete button on every row including the "كل العملاء" scope (`CallsTab.tsx:245-250`, `PeriodicCallsScreen.tsx:247-252`) → predictable 403 alert on another rep's lead.

---

### 5.7 RTL / i18n

- **Convention followed everywhere.** All 13 sales files use `useIsRTL()` + `const styles = useMemo(() => makeStyles(isRTL), [isRTL])`, including the small local sub-components (`SalesShared.tsx:58-59`, `OffersTab.tsx:254-255`, `SalesOfferCreateScreen.tsx:614-615,625-626,644-645`, `NewCallCreateScreen.tsx:236-237`, `PeriodicCallCreateScreen.tsx:196-197,215-216`). `flexDirection: isRTL ? 'row-reverse' : 'row'` and `textAlign: isRTL ? 'right' : 'left'` are applied consistently; `TextInput`s pass `textAlign={isRTL ? 'right' : 'left'}` (e.g. `SalesOfferCreateScreen.tsx:633`).
- **Hardcoded Arabic is the project convention here**, not a violation: `src/i18n/dictionary.ts` is a 1000-line AR→EN map applied globally by a JSX-runtime patch, so a literal `<Text>الاتصالات</Text>` renders English when the language flips. Consequence: any sales string missing from `dictionary.ts` silently stays Arabic in English mode — this is untested for most of the sales copy.
- **Not RTL-aware:** `Ionicons name="chevron-back"` is used as a *forward* affordance in `ContractsTab.tsx:174` («التفاصيل») and as the back button in every header (`SalesRequestsScreen.tsx:85`, `SalesOfferCreateScreen.tsx:461`, …) with no `rtl` flip — correct for Arabic, backwards in LTR.
- `DetailSheet`'s value column is pinned `textAlign: 'left'` (`SalesShared.tsx:315`) while its label uses the RTL branch — Arabic values render left-aligned inside an RTL row.
- Numbers: `toLatinDigits(...toLocaleString('ar-SA'))` is used for prices/dates (`OffersTab.tsx:205`, `ContractsTab.tsx:143,164,209`) — locale is hardcoded `ar-SA` even in English mode.
- `EditableDropdown` uses its own `TEAL = '#14B8A6'` (`src\components\common\EditableDropdown.tsx:15`) while every sales screen defines `TEAL = '#7C3AED'` — the dropdown's accents are teal inside a purple screen.

---

### 5.8 Loading / error / offline / OTA

**Loading.** Skeletons everywhere, per the project's skeleton convention: `SkeletonList` in all four list surfaces (`OffersTab.tsx:226`, `ContractsTab.tsx:185`, `ExecutionTab.tsx:185`, `CallsTab.tsx:258`, `NewCallsTab.tsx:215`, `PeriodicCallsScreen.tsx:202`, `OfferWorkPanel.tsx:269`), `SkeletonForm` for edit-mode form hydration (`SalesOfferCreateScreen.tsx:472`, `NewCallCreateScreen.tsx:181`, `PeriodicCallCreateScreen.tsx:156`), `SkeletonDetail` for lead detail (`NewCallDetailScreen.tsx:137`). Spinners are reserved for in-button busy states + the price box (`SalesOfferCreateScreen.tsx:561`). Lists debounce search/filter changes 350 ms and refetch on `useFocusEffect` (e.g. `OffersTab.tsx:122-132`). Pricing defaults are deferred behind `InteractionManager.runAfterInteractions` to protect the navigation animation (`SalesOfferCreateScreen.tsx:252-277`).

**Errors.** Every fetch routes non-OK through `handleUnauthorizedResponse` (401 refresh/logout, `src\utils\authSession.ts`) then throws an Arabic message; failures land in `console.error` + an empty list (`OffersTab.tsx:113-116`) or an `appAlert` toast for mutations (`SalesOfferCreateScreen.tsx:445-447`). Missing-token paths call `clearSessionAndRedirectToLogin` in the create/edit screens but merely `return` silently in the list tabs (`OffersTab.tsx:82`, `ContractsTab.tsx:65`) — a token-less list renders as "empty", not "signed out". `lookupPhone` swallows all errors and returns `null` (`SalesShared.tsx:24-26`), so duplicate detection fails open.

**Offline.** None. There is no NetInfo check, no request queue, and no cached read in any sales screen — offline simply yields the empty state. (Offline support exists only in `NowScreen`/`MapScreen`.) For a field rep entering an offer in a basement, an offer save that fails is lost: the form is not persisted anywhere before the POST.

**OTA.** `app.json` declares `updates.url` + `"runtimeVersion": "1.0.0"` as a literal (`mobile-worker\app.json:77-81`) — bare workflow, so the runtime version must be bumped by hand and the app rebuilt for any native change; JS-only edits ship with `eas update`. Everything in this slice is JS-only **provided the native modules already exist in the installed binary**:
- `expo-sharing` — declared (`package.json:39`), used at `OfferWorkPanel.tsx:20,197,203`.
- `expo-file-system/legacy` — imported at `OfferWorkPanel.tsx:19` but **not a declared dependency**; it resolves only transitively through `expo`'s own `expo-file-system: ~19.0.22`. It works today, but an `expo` dependency reshuffle would break the quote-PDF download with no signal in `package.json`.
- `@react-native-community/datetimepicker` (via `DateField`) and `expo-linear-gradient` are native and already in the shipped binaries.

So: any change confined to these 13 files ships OTA. Adding a new picker, camera, or file-system capability to the sales flow does not.

---

### 5.9 Risks and bugs visible in the code

**Dead / unreachable surface (highest-impact finding).** The whole leads module is orphaned in the current build:
- `CallsTab.tsx` and `NewCallsTab.tsx` are imported by nothing — `SalesRequestsScreen.tsx:22-24` imports only Offers/Contracts/Execution and `TABS` (`:33-37`) has no `calls` entry.
- `PeriodicCallsScreen` is registered (`RootNavigator.tsx:322`) but no code calls `navigate('PeriodicCalls')`.
- `NewCallDetail` / `NewCallCreate` / `PeriodicCallCreate` are reachable only from those orphans.
Net effect: the rep cannot open any lead list, cannot register a call except from inside an approved offer, and `SalesTabCounts.calls` (`SalesShared.tsx:51`) is fetched and shown on the dashboard KPI grid (`DashboardScreen.tsx:1027-1034`) for a screen that cannot be opened. Roughly 60 KB of maintained-looking screen code is unreachable.

**Data-integrity risks.**
1. **Site proliferation.** Every offer creates a brand-new `Site` (`sales.py:486-503`) even for an existing customer. A rep re-entering a botched offer for the same building leaves orphan sites with distinct site codes.
2. **Customer dedupe is exact-string.** `sales.py:461-466` — `0501234567` and `+966501234567` produce two `Customer` rows for the same person, while `lookup-phone` (last-9 ILIKE) will happily flag both as duplicates on the form.
3. **Zeroed price on early submit.** `SalesOfferCreateScreen.tsx:408-409` sends `systemPrice` (the memo) and `manualPrice: form.manualPrice ? Number(...) : systemPrice`. Pricing defaults load asynchronously and deferred (`:252-277`); if the rep saves before they arrive (or if `/sales/pricing/defaults` fails — the catch is silent, `:270-272`), `systemPrice` is `0` and an offer is persisted at `0 SAR` with no warning. In edit mode this can overwrite a previously-correct `systemPrice` with `0`.
4. **Payment percentages are never re-validated on edit save relative to what the manager already quoted** — the app re-sends all four every time (`:411-414`).

**Correctness / UX bugs.**
5. `contractNumber` never arrives → العقود always shows `CR-SALES-…` (§5.6 #1).
6. Editing a lead's dates is a silent no-op (§5.6 #5).
7. `contactPhone` unvalidated client-side → English 400 detail leaks into an Arabic alert (`SalesOfferCreateScreen.tsx:435`).
8. `OfferWorkPanel.markReady` sets local `ready=true` optimistically and tells the rep "تم إبلاغ مدير المبيعات بأن العميل جاهز للتعاقد." (`:161-162`) — but the endpoint sends **no notification at all** (`sales.py:1359-1391`), it only sets a boolean the manager will see *if* they open the request in AdminPortal. The reassurance the rep gets is stronger than what the system actually does.
9. `OfferWorkPanel` "إرسال عبر واتساب" and "تنزيل العرض" both call the identical `onShareQuote` (`:243,248`) — the WhatsApp-branded button just opens the OS share sheet; there is no WhatsApp-specific path and no `WhatsAppMessage` row is created for this send (relevant to the project rule that every send path is tracked).
10. `readyToContract` prop is only read into state at mount (`OfferWorkPanel.tsx:90`); the parent refetch that changes it will not reset the panel because there is no `useEffect` sync — stale after a background change.
11. `ExecutionTab` renders `progress` from the server unclamped into a `%` width after `Math.max/min` (`:150`) but `completedTasks/totalTasks` unguarded — `0/0 مهمة` is displayed for freshly-created projects.
12. `ContractsTab.tsx:211` passes `{ dateStyle: 'long' } as any` to `toLocaleDateString` alongside no other options — works, but the `as any` hides that RN's Hermes Intl support for `dateStyle` is version-dependent; on a device without full ICU this throws inside the render of the detail sheet.
13. All seven screens that migrated to `appAlert`/`confirmDialog` still import `Alert` from `react-native` and never use it (`SalesOfferCreateScreen.tsx:6`, `OfferWorkPanel.tsx:5`, `CallsTab.tsx:5`, `NewCallCreateScreen.tsx:6`, `NewCallDetailScreen.tsx:5`, `PeriodicCallCreateScreen.tsx:6`, `PeriodicCallsScreen.tsx:5`) — dead imports.
14. `OffersTab` fires `onEndReached` *and* renders a `ShowMoreButton` for the same `onShowMore` (`:145,223`); guarded by `loadingMore` so it does not double-fetch, but it does mean the footer button is decorative on most scrolls.
15. `SalesRequestsScreen.loadCounts` has `useCallback(..., [])` with no deps while reading nothing reactive — fine today, but it silently ignores a mid-session role change (`:48-54`).

**Accessibility.** Only two `accessibilityLabel`s exist in the whole slice (`SalesShared.tsx:136,201`). Header back buttons, the tap-to-call rows, status pills, filter chips, and the delete buttons have no labels; the 42×42 back button and the ~28 px-tall chips are below the 44×44 touch-target bar in the project standard.
## 6. Tests, documentation drift & deploy state

*Read-only analysis. No pytest run — every claim below comes from reading the test source against the current controller code. No files were committed, pushed, stashed or modified.*

---

### 6.1 Part A — Test inventory

Eleven `test_sales_*.py` files live in `C:\Dev\ElevatorProject\backend\tests\integration\`. **68 test functions total** — which exactly matches the "Sales suite: 68/68 pass" claim in `docs/SALES_SYSTEM_ANALYSIS.md` §5.

| File | Fns | What it pins |
|---|---|---|
| `test_sales_approval_pipeline.py` | 12 | The whole build-contract trigger. Happy path for `installation` (one `Contract` + one `InstallationProject`, entered `contract_number`/dates/`total_value`/`notes`/`projectName`, no `MaintenanceContract`) and for `maintenance` (`coverage_type`/`visit_frequency`/`visits_per_year`/`emergency_call_included`, no project). Role gates: `finance_manager` / `installation_manager` / `sales_rep` all 403. Guards: 409 unless `approved_working`, 400 without `startDate`, idempotent on `request.contract_id`. Confirmed customer/site override: targets those ids, resyncs the request's denormalized `site_name/city/region/address_text`, falls back to request ids when omitted, 404 on unknown customer or site. Plus `TestRetiredFinancePipeline`: `pending_finance`/`finance_approved`/`finance_rejected` → 400 on the generic status endpoint; `finance-decision` 403 for a rep and always 409 for a finance manager. |
| `test_sales_authz.py` | 4 | Shared-pool reads / owner-or-manager writes on `POST /{id}/status`: non-owner rep 403, owner 200 (`cancelled`), manager (admin) 200 (`approved_working`), non-owner rep can still GET detail + see the row in the list. |
| `test_sales_history.py` | 2 | `GET /{id}/history` is AuditLog-backed: CREATE + 2 STATUS_CHANGE = 3 entries, newest-first, correct `oldStatus`/`newStatus` pairs, `description == "sales_contract_request_status_update"`, timestamps non-increasing, `userName` resolved. Unknown id → 404. |
| `test_sales_leads.py` | 18 | The unified leads module. `customerType` filter (company/individual), `counts` object key set + per-status tallies + `deleted` excluded + counts ignore the status filter but respect the customerType scope, `hasNextCall`, exact `/new-calls` response key set, `/periodic-calls` shape regression (has `filters`, no `counts`) + create→list roundtrip + `filter=company`, and 6 `dueToday` tests (list narrowing, counts tally, ignores status filter, composes with status filter, respects customerType). |
| `test_sales_lifecycle.py` | 4 | Create → `pending_review` + appears in list; status persists across a *fresh* GET (proves the explicit `db.commit()`); admin can set `approved_working`; `approved` → 403 through the generic endpoint. |
| `test_sales_lifecycle_contract.py` | 3 | Two negative invariants: `approved` via `/status` is 403 **and** leaves zero `Contract` rows for the site; accepting a quote (installation *and* maintenance) creates NO `Contract`, no child rows, and does not force the request to `approved`. |
| `test_sales_quote_approval.py` | 4 | The request-level gate is the only gate: quote for an approved request starts `draft`; quote for a `pending_review` request → 409; a rep cannot self-approve (403) so quoting stays locked (409); `POST /quotes/{id}/decision` → 404/405 (route removed). |
| `test_sales_quote_messaging.py` | 6 | Send tracking + audit. Success → exactly one `WhatsAppMessage` row (`template_name="sales_quote"`, `status="sent"`, `direction="outbound"`, non-empty body); provider 500 → row persists with `status="failed"` **and** endpoint returns 502 **and** the quote is not flipped to `sent`. AuditLog rows for `CREATE`, `SEND_WHATSAPP` (with channel + phone), `SEND_WHATSAPP_FAILED` (`success: False`), `STATUS_CHANGE` (old + new). |
| `test_sales_quotes.py` | 5 | Server-side totals: client-sent `subtotal`/`vatAmount`/`total` are ignored and recomputed from line items; discount applied *before* VAT. Initial status is `draft` for small, large and discounted quotes (no amount/discount threshold); `needsFinance` absent from the payload. |
| `test_sales_transitions.py` | 5 | `REQUEST_STATUS_EDGES`: `rejected → quoted` is 409 and the row is unmutated; `pending_review → approved_working → pending_review` succeeds. `QUOTE_STATUS_EDGES`: bogus statuses (`pending_finance`, `manager_approved`, `no_such_status`) → 400; `draft → accepted` OK; `rejected → accepted` → 409. |
| `test_sales_validation.py` | 5 | Pydantic contract: `systemPrice="abc"` / `floorsCount=-5` / `requestedStartDate="not-a-date"` → 422; blank money string → `null`, not an error; `populate_by_name` — camelCase (worker) and snake_case (AdminPortal) bodies persist identical typed values. |

**Other sales-touching tests found outside the eleven:**

| File | Fns | Relevance |
|---|---|---|
| `tests\integration\test_quote_number.py` | 3 | `next_quote_number` — `QUOTE{customer_number}-{seq}`, global sequence across customers, legacy `Q-…` numbers ignored. Tests the helper directly, **not** through `POST /sales/quotes`. |
| `tests\unit\test_catalog_category_guards.py` | 12 | Guards for the catalog keys that `POST /sales/pricing/calculate` matches on: system keys not renamable, key regex, domain validation, `SalesDefaultPrice` columns + `(domain, …)` uniqueness, `_load_rows` domain filter. |
| `test_executive_reports.py` | 1 (sales) | `test_sales_renewals_marked_unavailable` — the executive sales report window. |
| `test_department_role_scoping.py` | — | `sales_manager` → `{sales}` WhatsApp department scoping only. |

---

### 6.2 Coverage map

| Sales behavior | Verdict | Test(s) / gap |
|---|---|---|
| Request create — wire contract | **COVERED** | `test_sales_lifecycle::TestCreateAndList::test_create_then_list`; all 5 of `test_sales_validation` |
| Request create — Customer + Site upsert, last-9-digit phone dedupe (`_phone_norm`), `created_by_user_id` stamping, `request_number` format | **NOT COVERED** | no test asserts the upsert or the dedupe key at all |
| Request list — `group` (all/review/working/finance/rejected/approved), `sort`, `search`, `mine`, pagination, `counts`, `statusOptions` | **NOT COVERED** | only an unfiltered list read exists. `counts`/`statusOptions` are asserted for **leads**, never for **requests** |
| Status transitions (edge map) | **COVERED** | `test_sales_transitions::test_illegal_request_transition_is_rejected`, `::test_legal_request_transition_succeeds`; `test_sales_lifecycle::test_status_persists_across_fresh_session` |
| `approved` is endpoint-only (via `/status`) | **COVERED** | `test_sales_lifecycle::test_approved_not_settable_via_generic_status_endpoint`; `test_sales_lifecycle_contract::test_approve_via_status_endpoint_is_forbidden` |
| `approved` via the `/update` side channel | **NOT COVERED** | see §6.3 finding — `sales.py:1255` lets a manager set `approved` with no contract, bypassing `ENDPOINT_ONLY_STATUSES` **and** the edge map |
| Approval #1 manager-only + owner-or-manager writes | **COVERED** | all 4 of `test_sales_authz`; `test_sales_quote_approval::test_rep_cannot_unlock_quoting_by_approving_request` |
| `_ensure_sales_access` rejects a non-sales role | **NOT COVERED** | no test logs in as e.g. `technician` and asserts 403 |
| Retired finance statuses dead | **COVERED** | `test_sales_approval_pipeline::TestRetiredFinancePipeline` (2 fns) |
| Build-contract → Contract + child materialization | **COVERED** | all 12 of `test_sales_approval_pipeline` |
| Build-contract → request site/customer write-back | **COVERED** | `::test_build_with_explicit_site_resyncs_request_site_fields` |
| Build-contract → `_link_calls_to_contract` (lead → `converted`, real name, customer link) | **NOT COVERED** | `sales.py:1483`; the audit's `linked_calls` count is never asserted |
| Build-contract → `_open_contract_invoice` (draft `Invoice`, 15% VAT, due +30d) | **NOT COVERED** | `sales.py:1518`; also completely undocumented |
| Contract created with `status='draft'` (no auto-visits) | **NOT COVERED** | `services.py` sets it; asserted nowhere — this is doc §6 leftover #7, still unverified |
| Request history endpoint | **COVERED** | both `test_sales_history` fns |
| Request update `POST /{id}/update` + the `pending_review`-only edit lock | **NOT COVERED** | `sales.py:1136-1269` — 133 lines of partial-update logic, zero tests |
| `DELETE /contract-requests/{id}` | **NOT COVERED** | `sales.py:1104`; and the gate is weaker than documented (see §6.3) |
| `ready-to-contract` flag | **NOT COVERED** | `sales.py:1359` — the signal the whole AdminPortal action bar toggles on |
| Calls inside an offer (`GET`/`POST /{id}/calls`, `canRegister`, lead create-or-match) | **NOT COVERED** | `sales.py:1278-1356` |
| Quote create — server-side totals, discount-before-VAT | **COVERED** | `test_sales_quotes::TestServerSideTotals` (2) |
| Quote initial status = `draft`, no threshold | **COVERED** | `test_sales_quotes::TestInitialStatus` (3); `test_sales_quote_approval::test_quote_for_approved_request_is_draft` |
| Quote creation gate (request must be approved) | **PARTIAL** | 409 path covered by `test_quote_blocked_for_unapproved_request` + `test_rep_cannot_unlock_quoting_by_approving_request`. **Gaps:** `approved` (post-build) as a legal source status is never asserted; the `requestId`-less bypass (`if req is not None and …`) is only exercised incidentally |
| Quote-level approval removed | **COVERED** | `test_sales_quote_approval::test_quote_decision_endpoint_is_gone` |
| Quote status edges | **COVERED** | `test_sales_transitions::TestQuoteStatusEdges` (3) |
| Quote send via WhatsApp + tracked row (sent / failed→مراجعة + 502) | **COVERED** | `test_sales_quote_messaging::TestQuoteSendTracking` (2) |
| Quote audit logging (create / send / failed send / status) | **COVERED** | `test_sales_quote_messaging::TestQuoteAuditLogging` (4) |
| Quote accept creates no Contract | **COVERED** | `test_sales_lifecycle_contract::TestAcceptQuoteCreatesNoContract` (2) |
| Quote versioning, `superseded_by_id` fan-out, `req.active_quote_id`, `req.manual_price` write-back | **NOT COVERED** | `quotes.py:349-362, 405-416` |
| Quote numbering (`QUOTE{customer}-{seq}`) | **PARTIAL** | `test_quote_number.py` (3) pins the helper directly; the `create_quote` branch that falls back to the legacy `Q-…` when there is no customer is untested |
| `PATCH /sales/quotes/{id}` | **NOT COVERED** | `quotes.py:474` |
| Quote & contract document exports (`.xlsx` / `.pdf`) | **NOT COVERED** | `quotes.py:251/273`, `sales.py:1051/1070`, `app/sales/quote_document.py` (482 lines), `app/sales/contract_document.py` (176 lines) |
| Leads — `/new-calls` list, filters, `counts`, `dueToday` | **COVERED** | 15 of the 18 `test_sales_leads` fns |
| Leads — `/periodic-calls` shape regression + create + company filter | **COVERED** | `test_sales_leads::TestPeriodicListRegression` (3) |
| Leads — `POST /new-calls`, `POST /new-calls/{id}/interactions`, `POST /new-calls/{id}` update, `GET /new-calls/{id}` | **NOT COVERED** | only the *periodic* create path is exercised |
| Pricing — `GET`/`PUT /sales/pricing/defaults`, `POST /pricing/calculate`, `PRICING_EDIT_ROLES` | **PARTIAL** | `tests\unit\test_catalog_category_guards.py` covers the key/domain guards and `_load_rows`; no HTTP test of any of the three endpoints |
| `GET /lookup-phone`, `GET /execution` | **NOT COVERED** | `sales.py:1827`, `sales.py:2231` |
| `expire_stale_quotes` scheduler | **NOT COVERED** | `app/_shared/scheduler.py:640` |

**Shape of the gap:** the pipeline that *creates money* (approve → build-contract → Contract) is well covered — 12 focused tests. Everything the sales rep actually touches all day (edit an offer, log a call inside it, flag ready-to-contract, delete a request, re-quote) has **zero** tests, and the two silent fan-outs at build time (lead conversion, draft invoice) are unpinned.

---

### 6.3 Tests that are stale vs. the current controller

None of the eleven files fails against today's code as far as reading can determine, but five carry prose or assertions that no longer describe reality:

1. **`test_sales_transitions.py` module docstring, lines 11-13** — *"the generic status endpoint must NOT be able to set a finance_* state (those belong to finance_decision only); **finance_decision itself still works**."* The **quote** `finance_decision` endpoint no longer exists — `test_sales_quote_approval::test_quote_decision_endpoint_is_gone` pins it removed. The test bodies are correct (they only assert 400 on bogus statuses); only the docstring lies.
2. **`test_sales_lifecycle_contract.py` module docstring, lines 4-6** — *"materialized by … the **installation-manager** build-contract step at the end of the **finance-gated** approval pipeline."* Build-contract is gated on `_is_sales_manager` (`sales.py:845`) and `installation_manager` is explicitly a 403 actor (`test_sales_approval_pipeline` fixture comment says so). Stale prose only.
3. **`test_sales_authz.py::test_non_owner_rep_is_forbidden`** posts `{"status": "contacted"}` — a status the docs classify as "legacy label only, not in the active path". It passes only because the owner check (`sales.py:697`) runs *before* status validation (`sales.py:701`). Harmless today; a dead target status in an authz test.
4. **`test_sales_quotes.py::test_small_undiscounted_quote_is_draft`** asserts `"needsFinance" not in body` — a negative assertion against a field removed with `sales_qmgr_0031`. Permanently trivially true.
5. **`test_sales_leads.py::TestNewCallsResponseShape`** asserts an *exact* key set on `/new-calls`. It matches `sales.py:1817-1826` today, but it is the most brittle assertion in the suite — any additive response key breaks it.

**Age skew worth flagging:** every sales test file was last touched on or before **2026-06-19** (`0bc1b08`), while `app/sales/` changed on **2026-07-30** (`f24a042` catalog-as-data + domain-scoped pricing, `8c0c22d` `SalesDefaultPrice.domain`). That July change is covered only by the new `tests\unit\test_catalog_category_guards.py`, never by the sales integration suite.

---

### 6.4 Part B — Documentation drift

#### `docs\SALES_SYSTEM_ANALYSIS.md` (175 lines, snapshot dated 2026-06-11)

| # | Doc statement | Status | Corrected fact |
|---|---|---|---|
| 1 | §5 heading: *"Changes made 2026-06-11 (this pass — **uncommitted**)"* | **WRONG** | All of it is committed. `0bc1b08` (2026-06-19) carries the controller edits, the `sales_reqfin_0032` migration and the rewritten tests. Nothing sales-related is uncommitted in any repo today (§6.5). |
| 2 | §3: `DELETE /contract-requests/{id}` — gate **"manager"** | **WRONG — authz gap** | `delete_sales_contract_request` (`sales.py:1104-1133`) calls **only** `_ensure_sales_access`. Any `SALES_ROLES` member — including `sales_rep` and `customer_service` — can hard-delete **any** request, regardless of owner or status. No test covers it. |
| 3 | §7 invariant: *"**`approved` is endpoint-only**: the generic status endpoint must keep refusing it."* | **INCOMPLETE — real hole** | True for `POST /{id}/status`. But `POST /contract-requests/{id}/update` (`sales.py:1248-1256`) does `if soft_status in ALLOWED_STATUS_TRANSITIONS: item.status = soft_status`, and `ALLOWED_STATUS_TRANSITIONS = set(STATUS_LABELS.keys())` **contains `approved`**. A sales manager can therefore set `approved` with no contract, bypassing both `ENDPOINT_ONLY_STATUSES` and `REQUEST_STATUS_EDGES` (that path does no edge validation at all). |
| 4 | §1/§2: *"quotes can only be created for approved requests — 409 otherwise"* | **IMPRECISE** | `create_quote` (`quotes.py:332`) accepts `approved_working` **or** `approved`; and a body with **no `requestId`** skips the gate entirely (`if req is not None and …`) — which is exactly what `test_sales_quotes.py` does. |
| 5 | §1: build-contract effects list (`Contract` + child + `contract_id` + lead→converted) | **INCOMPLETE** | It also calls `_open_contract_invoice` (`sales.py:982`, impl `:1518`) which creates a **draft `Invoice`** for `manual_price ?? system_price`, 15% VAT, due +30 days, best-effort. Documented nowhere and untested. |
| 6 | §2: *"Quote statuses: `draft → sent → accepted \| rejected \| expired`"* | **UNDERSTATED** | `QUOTE_STATUS_EDGES` (`quotes.py:43-49`) also allows `draft→accepted/rejected/expired`, `sent→draft`, `accepted→sent\|draft`, `rejected→draft`, `expired→draft\|sent`. |
| 7 | §2: `contacted`/`site_survey`/`quoted` are *"legacy labels only … not in the active path"* | **WRONG** | `quoted` is still actively **written** by live code: `quotes.py:413-414` sets `req.status = "quoted"` for any request not in `{approved_working, approved, rejected, cancelled}`. |
| 8 | §2 role sets (SALES / MANAGER / FINANCE) | **INCOMPLETE** | `INSTALLATION_ROLES` (`sales.py:83`) and `_ensure_installation_access` (`:226-232`) also exist and are **dead code** — defined, referenced nowhere in the repo. |
| 9 | §3 endpoint table | **INCOMPLETE** | Missing, all live today: `POST /{id}/update`, `GET\|POST /{id}/calls`, `GET /{id}/contract-document.xlsx\|.pdf`, `GET /lookup-phone`, `GET /execution`; and on the quote side `GET /quotes`, `GET /quotes/{id}`, `PATCH /quotes/{id}`, `GET /quotes/{id}/document.xlsx\|.pdf`, plus `GET\|PUT /sales/pricing/defaults` and `POST /sales/pricing/calculate`. |
| 10 | §4: *"`alembic/versions/sales_qmgr_0031_*` … (single head after)"* + `sales_reqfin_0032` | **STALE** | The chain continued: `sales_reqfin_0032` → **`sales_qovr_0033_quote_template_overrides`** → `cust_code_0034_add_customer_code`. 105 migration files in the tree. |
| 11 | §4: *"`src/pages/customers/dialogs/ContractWizard.tsx`"* | **WRONG PATH** | It is `AdminPortal\src\pages\installations\ContractWizard.tsx`. |
| 12 | §4: *"`src/pages/sales/SalesDefaultPricing.tsx` — default pricing"* | **STALE** | The `/sales/default-pricing` route now **redirects** to `/settings/catalog?tab=installation` (`App.tsx:255`). The component survives only as an embedded child of `src\pages\settings\CatalogPage.tsx` (rendered twice, `domain="installation"` and `domain="maintenance"`). |
| 13 | §4 backend file map (`app/sales/` = quotes router + services + schema) | **INCOMPLETE** | `app/sales/` now also holds `controllers/pricing.py` (261 lines), `contract_document.py`, `quote_document.py` (482 lines), `seed.py`, `models/` (quote, customer_call, call_interaction, default_price). |
| 14 | §4 AdminPortal file map | **INCOMPLETE** | Missing `BuildContractDialog.tsx`, `ContractDocumentDialog.tsx`, `CreateSalesRequestDialog.tsx`, `contractPrint.ts`, `quotePrint.ts`, `quoteTemplateTables.ts`, and `workspace/RequestKanban.tsx`, `RequestTable.tsx`, `StatusStepper.tsx`, `ActionDialog.tsx`, `SpecBlock.tsx`, `PricingBlock.tsx`, `NotesBlock.tsx`, `DetailSection.tsx`, `FieldGrid.tsx`. |
| 15 | §6 leftover #1 (FinanceApprovals page + route + sidebar badge + backend endpoint) | **STILL TRUE** | `FinanceApprovals.tsx` present, route `App.tsx:257`, `Sidebar.tsx:144-147` still polls `status=pending_finance` every 30 s, `salesApi.financeDecision` at `api/index.ts:392`, backend `POST /finance-decision` at `sales.py:770`. Not done. |
| 16 | §6 leftover #2: *"`InstallationContractRequests.tsx` (route already redirects to /sales)"* | **WRONG** | There is now **no route at all** — not even a redirect — and no import anywhere in `AdminPortal/src`. The file is fully orphaned. |
| 17 | §6 leftover #3 (`group=finance` filter) | **STILL TRUE** | `sales.py:365-366` still filters on the three retired statuses. |
| 18 | §6 leftover #5 (`pageHelpContent.ts` finance help) | **STILL TRUE** | `AdminPortal\src\pages\finance\pageHelpContent.ts:150-151` still describes `pending_finance → finance_approved → مدير التركيبات`. |
| 19 | §6 leftover #6: *"stale comment in `scheduler.py:607`"* | **TRUE, line moved** | Now `app\_shared\scheduler.py:640-647`. Comment still names `pending_finance / finance_approved / finance_rejected`. |
| 20 | §6 leftover #7 (`Contract` created `status='draft'`) | **STILL TRUE** | `services.py` `materialize_contract_from_request` hardcodes `status="draft"`. Still unconfirmed with ops, still untested. |
| 21 | §2: `expire_stale_quotes` daily at 03:00 | **ACCURATE** | `CronTrigger(hour=3, minute=0)`, `scheduler.py:1029-1036`. |
| 22 | §5: *"Sales suite: 68/68"* | **ACCURATE** | 68 test functions counted across the eleven files. |

**Behavior added since the snapshot that neither sales doc mentions at all:**
- Quote **versioning + supersede**: `create_quote` bumps `version` to `max+1` and stamps `superseded_by_id` on every prior *open* quote for the request; sets `req.active_quote_id` and overwrites `req.manual_price` with the new total (`quotes.py:349-362, 405-416`).
- **`Quote.template_overrides`** JSONB (migration `sales_qovr_0033`) — per-cell overrides for the Excel quotation template.
- **Connected quote numbers** `QUOTE{customer_number}-{global_seq}` with a legacy `Q-…` timestamp fallback.
- **Domain-scoped pricing**: `SalesDefaultPrice.domain`, catalog categories stored as data (`app/catalog/`), `_load_rows(domain)`, `DEFAULT_DOMAIN = "installation"`, `PRICING_EDIT_ROLES`.
- The **draft-invoice fan-out** at build-contract (row 5 above).

#### `docs\SALES_WORKFLOW.md` (46 lines)

Much shorter and mostly still correct — the four stages, the single approval, the manager-only gates and the retired-finance note all match the code.

| Doc statement | Status | Corrected fact |
|---|---|---|
| *"`approved` is never settable through the generic status endpoint — only build-contract sets it."* (line 45) | **INCOMPLETE** | Same hole as row 3 above: `POST /{id}/update` lets a manager set it. |
| Stage 4 description (wizard → contract terms → `Contract` + child + lead→`converted`) | **INCOMPLETE** | Omits the draft `Invoice` fan-out and the customer/site write-back onto the request row. |
| *"The legacy `finance-decision` endpoint and the AdminPortal FinanceApprovals page (`/finance/approvals`) still exist but are unreachable"* | **STILL TRUE** | Verified against `sales.py:770` and `App.tsx:257`. |
| *"`site_survey` / `quoted` / `contacted` are dropped from the mandatory path (kept only as legacy labels)"* | **WRONG for `quoted`** | `quotes.py:413-414` still writes it. |
| Whole doc | **INCOMPLETE** | Says nothing about deletes, calls-inside-an-offer, `/update`'s `pending_review` edit lock, contract-document export, or quote versioning. |

#### Other docs that describe sales (found via `grep -ril "sales" docs/`)

`docs\FINANCE_MODULE_MAP.md` is the **most drifted file in the repo** on sales:

| Line | Claim | Corrected fact |
|---|---|---|
| 17 | *"عروض أسعار + بوابة اعتماد مالي (`Quote`) تعمل فعلاً (`/sales/finance-approvals`)"* | Quote-level finance approval is **removed**. `/sales/finance-approvals` is a `<Navigate to="/sales/quotes">` (`App.tsx:250`). |
| 36 | `Quote` has `status`(…`/pending_finance/finance_approved`), `finance_by_user_id`, `finance_at` | Those columns are **gone** from `app\sales\models\quote.py`. Status set is `draft\|sent\|accepted\|rejected\|expired`. New columns: `version`, `superseded_by_id`, `template_overrides`. |
| 49 | *"`POST /sales/quotes/{id}/finance` (gate: discount > 5% OR total > 100k SAR; role `finance_manager`)"* | Endpoint **removed** — pinned dead by `test_sales_quote_approval::test_quote_decision_endpoint_is_gone`. No amount or discount threshold exists anywhere in `quotes.py`. |
| 58 | `pages/sales/SalesQuotesFinance.tsx` at `/sales/finance-approvals` | File does not exist in `AdminPortal/src`. |
| 64 | `quotesApi.financeDecision` | Gone. Only `salesApi.financeDecision` (the request-level legacy one) remains. |
| 80 | Roadmap item 5: relocate `SalesQuotesFinance.tsx` into `/finance/approvals` | There is no quote queue left to relocate. |

`docs\AUTHZ_USE_CASE_MAP.md`:
- §5.10 quote row (`GET/POST/PATCH /sales/quotes[/{id}]`, `/send`, `/status`, `document.xlsx/pdf` → `_ensure_sales_access`) — **accurate**, the only doc that lists the quote surface correctly.
- Same row for pricing lists `GET /sales/pricing/defaults` + `POST /pricing/calculate` — **misses `PUT /sales/pricing/defaults`**, which is gated more tightly (`PRICING_EDIT_ROLES = {admin, operations_manager, sales_manager}`, not plain `_ensure_sales_access`).
- Line 285 calls the request surface "contract-requests **CRUD**" — hides that DELETE has no manager/owner gate (row 2 above).

`docs\QUOTE_TEMPLATE_EXPORT.md` — **accurate**; the only sales doc that survives the comparison unscathed. Its endpoint list (`contract-document.xlsx|.pdf`, `PATCH /sales/quotes/{id}`), file map (`app/sales/quote_document.py`, `contract_document.py`, `ContractDocumentDialog.tsx`, `quoteTemplateTables.ts`) and the `markReadyToContract` reuse note all match the code.

`docs\FRONTEND_TESTING_CHECKLIST.md:96` — "Sales requests list (new calls اتصالات جديدة, **periodic**)": the periodic page is merged into `/sales/calls` (`App.tsx:252` redirect). Minor.

---

### 6.5 Part C — Git / deploy state

#### Raw command output

**backend** — `git -C c:/Dev/ElevatorProject/backend status --porcelain=v1`:
```
```
*(no output — 0 lines)*

`git -C c:/Dev/ElevatorProject/backend status -sb`:
```
## main...origin/main
```

`git -C c:/Dev/ElevatorProject/backend log --oneline -15`:
```
b0e4139 feat(work-orders): mark every reschedule path with S, via one shared rule
f8b7894 feat(work-orders): mark rescheduled work orders with an S, and fix the last legacy generator
fc82180 feat(maintenance): script to put work-order codes back into schedule order
7f1faf4 fix(maintenance): make the renumber dry run report what a real run would write
5659c51 feat(maintenance): script to renumber legacy WO-MV-* work orders
479ac61 fix(maintenance): generated visits get connected work-order numbers, not timestamps
09d108a fix(backend): ignore a FastAPI Query default leaking into the quote-state filter
fb9c58e feat(backend): find work orders awaiting a quote, real emergency distance, district continuity
8c0c22d fix(backend): add the domain column to the SalesDefaultPrice model
1df0305 feat(whatsapp): mark a conversation read when the operator reaches the newest message
f24a042 feat(backend): catalog categories as data, and pricing scoped by domain
06700ba fix(whatsapp): order the department inbox by real activity, not bot state
e9f5363 test(backend): pin free-text quote-line pricing
4213438 feat(finance): cap how many expense requests one worker can have in flight
769bb32 feat(finance): refuse an approval that overdraws the custody
```

**AdminPortal** — `git -C c:/Dev/ElevatorProject/AdminPortal status --porcelain=v1`:
```
```
*(no output — 0 lines)*

`git -C c:/Dev/ElevatorProject/AdminPortal status -sb`:
```
## main...origin/main
```

`git -C c:/Dev/ElevatorProject/AdminPortal log --oneline -15`:
```
ec1ff05 feat(admin): quote queue on the work-orders page, and explain who to assign
30a5b95 feat(admin): clear the unread badge when the thread is scrolled to the newest message
b4eb79e feat(admin): catalog & pricing settings page with per-domain tabs
a62ee51 fix(admin): hide the WhatsApp composer once the 24h window closes
fbb7c49 feat(admin): add a manual product line to the spare-parts quote
6b93a2f refactor(admin): move the contract stat cards above the filter bar
6b8881d feat(admin): reveal the typed password in the technician dialog
e96c351 fix(admin): allow editing a spare-parts quote after the work order closes
a61d58b feat(admin): warn and block an approval that overdraws the custody
18a0005 feat(admin): pick a real account as أمين العهدة and repair unlinked ones
49bdcdc feat(admin): preview invoice images instead of listing them as filenames
9cc1c46 change side bar
0588383 feat(admin): customer stat cards follow the active filters
ecc3194 feat(admin): decide expense requests with ✓/✕ icons and add edit/delete actions
20d4311 feat(admin): «طلبات المصروفات» button on the expenses page
```

**mobile-worker** — `git -C c:/Dev/ElevatorProject/mobile-worker status --porcelain=v1`:
```
```
*(no output — 0 lines)*

`git -C c:/Dev/ElevatorProject/mobile-worker status -sb`:
```
## feat/sales-offer-screen
```
`git rev-parse --abbrev-ref --symbolic-full-name '@{u}'`:
```
fatal: no upstream configured for branch 'feat/sales-offer-screen'
```
`git remote -v`:
```
```
*(no output — the repo has **no remote at all**)*

`git -C c:/Dev/ElevatorProject/mobile-worker log --oneline -15`:
```
08d305d fix(worker): pin the native layout direction so a build renders like the dev client
e51527c fix(worker): tapping any custody card centres that card, not the first one
a856afe feat(worker): focus the centred custody card like the AdminPortal day strip
c225ca6 feat(worker): one primary gradient for the custody cards, deepened when picked
a4d9cbb feat(worker): gradient custody cards that grow into the centre as you flick
08d8274 feat(worker): the centred custody card is the active one
193e385 fix(worker): give the active custody a real border and scroll it to the centre
72b3e8e fix(worker): stop the wallet and period chips from breaking under a built app
09f359e chore(worker): commit the working tree — app source, native android project, config
2897259 feat(worker): wallet carousel for عهد, request filter, paging, clearer approved state
a9af18b feat(worker): reach طلبات المصروفات from the dashboard, and pull to refresh it
dd34c09 feat(worker): hide any عهدة that cannot cover the amount being requested
5379c61 feat(worker): show receipts, payment state and عهدة standing on expense requests
fc584ba feat(worker): page the points detail, filter it by month, and reach the add button
b1cc6d7 fix(worker): literal runtimeVersion — policies are unsupported in bare workflow
```

**Monorepo root** (holds `docs/`, so it matters for Part B) — `git -C c:/Dev/ElevatorProject status -sb`:
```
## main...origin/main [ahead 5, behind 1]
```
porcelain: 0 lines. `origin/main..HEAD` = the 5 in the log above (`c0d34dc`, `cac7e9e`, `8a1eb78`, `bbcab56`, `99f1d72`); `HEAD..origin/main` = `6194b13 Updated package-lock.json`.

#### Repo state summary

| Repo | Branch | Upstream | Uncommitted files | Ahead | Behind | HEAD | HEAD date |
|---|---|---|---|---|---|---|---|
| `backend` | `main` | `origin/main` (`server-ELMS.git`) | **0** | 0 | 0 | `b0e4139` | 2026-08-01 08:13 |
| `AdminPortal` | `main` | `origin/main` (`ELMS.git`) | **0** | 0 | 0 | `ec1ff05` | 2026-08-01 00:11 |
| `mobile-worker` | `feat/sales-offer-screen` | **none** | **0** | n/a | n/a | `08d305d` | — |
| *(root, holds `docs/`)* | `main` | `origin/main` (`ElevatorProject.git`) | **0** | **5** | **1** | `c0d34dc` | — |

`origin/main` refs are local; the last `git fetch` was 2026-07-28 (backend) / 2026-07-29 (AdminPortal), so "0 ahead / 0 behind" reflects the last known remote state, not a live check. No fetch was performed (read-only, non-mutating only).

#### Classification of sales changes

| Class | Content |
|---|---|
| **Committed + pushed (backend)** | Everything. The whole sales subsystem — controller, `app/sales/`, all 11 test files, migrations `sales_qmgr_0031` / `sales_reqfin_0032` / `sales_qovr_0033` — is in `main` at or below `b0e4139`, which equals `origin/main`. Newest sales-path commits: `8c0c22d` (2026-07-30, `SalesDefaultPrice.domain`) and `f24a042` (2026-07-30, catalog-as-data + domain-scoped pricing). The 2026-06-11 "retire finance statuses" pass that `SALES_SYSTEM_ANALYSIS.md` §5 calls *uncommitted* landed in `0bc1b08` on 2026-06-19. |
| **Committed + pushed (AdminPortal)** | Everything. Sales-relevant tip commits: `b4eb79e` (catalog & pricing settings page with per-domain tabs — the change that retired the `/sales/default-pricing` route) and `ec1ff05` (quote queue on the work-orders page). HEAD `ec1ff05` equals `origin/main`. |
| **Committed, NEVER pushable (mobile-worker)** | All 69 commits on `feat/sales-offer-screen` (vs `master`), including the entire sales screen set (`OffersTab.tsx`, `OfferWorkPanel.tsx`, `SalesOfferCreateScreen.tsx`, `SalesRequestsScreen.tsx`, `ContractsTab.tsx`, `CallsTab.tsx`, `NewCall*`, `PeriodicCall*`, `ExecutionTab.tsx`, `SalesShared.tsx`). **The repo has no git remote configured** — this work exists only on this machine and there is nowhere to push it. Last touch to the sales screens: `09f359e` (2026-07-30). |
| **Committed, UNPUSHED (root / `docs/`)** | 5 commits ahead of `origin/main`, including `c0d34dc` which is the commit that first checked `docs/SALES_SYSTEM_ANALYSIS.md` and `docs/SALES_WORKFLOW.md` into git. Both sales docs are therefore **unpushed**, and the root is also 1 behind (`6194b13`) — a merge/rebase is pending before any push. |
| **Uncommitted anywhere** | **None.** All four repos report 0 lines from `status --porcelain=v1`. |

#### Two operational notes worth surfacing

1. **`mobile-worker` has no remote.** `MEMORY.md` records "each app is its OWN tracked git repo **with a GitHub remote**"; that is no longer true for `mobile-worker` — `git remote -v` is empty. Every sales screen the field reps use is single-copy on this workstation.
2. **The monorepo root is now a real repo, not a scaffold.** `MEMORY.md` says the root is "a throwaway scaffold", but it has `origin → ElevatorProject.git` and `c0d34dc` deliberately committed `docs/`, `scripts/`, `docker-compose.yml` and the customer app into it. The docs analysed in §6.4 live there and are 5 commits ahead / 1 behind.
