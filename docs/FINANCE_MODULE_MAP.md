# ELMS Finance Module — System Map & Build Plan

> Grounded reference for the Finance section in the AdminPortal sidebar.
> Unlike a generic finance template, every row here is checked against the **actual ELMS
> code** (✓ exists / ⚠️ partial / ❌ missing) with real file paths, so you can tick off
> what is already built and scope only the gaps.
>
> Status date: 2026-06-05. Owner: finance module planning.

---

## 0. الخلاصة (Arabic executive summary)

نظامك **ليس فارغاً مالياً** — لديك بالفعل عمود فقري كبير لكنه موزّع على وحدات متعددة وبعضه باسم غير دقيق:

- ✅ **نموذج فاتورة كامل** (`Invoice` + `InvoiceItem`) مع حالات (مسودة/مرسلة/مدفوعة/متأخرة) وضريبة 15%، وربط بأمر العمل والعقد. لكن **لا توجد شاشة إدارة فواتير مركزية** في الـ AdminPortal — فقط API.
- ✅ **عروض أسعار + بوابة اعتماد مالي** (`Quote`) تعمل فعلاً (`/sales/finance-approvals`)، وبوابة **اعتماد طلبات التعاقد** (`/finance` الحالية).
- ✅ **متجر قطع الغيار** بدورة كاملة: طلب → فاتورة (ZATCA المرحلة الأولى مع QR) → حالة دفع.
- ✅ **تجميع مالي على مستوى العميل** (`GET /customer-admin/customers/{id}/finance`) يجمع قطع الغيار + عقود الصيانة + تكاليف التركيب، ويظهر في تبويب «المالية» داخل ملف العميل.
- ⚠️ ينقص: **شاشة فواتير مركزية، سندات قبض، أعمار الديون (AR aging)، فوترة العقود الدورية الآلية، فوترة مراحل التركيب، التقارير المالية**.
- ❌ غير موجود إطلاقاً: **المشتريات والموردون (PO/AP)، المصروفات، دليل الحسابات/القيود، ZATCA المرحلة الثانية**.

**التوصية:** لا تبنِ من الصفر. اجعل «المالية» قسماً أبوياً في الشريط الجانبي بتبويبات، وابدأ بالمرحلة 1 (توصيل ما هو مبني أصلاً في شاشة واحدة) قبل الميزات الجديدة.

---

## 1. What already exists (verified inventory)

### Backend data models
| Concept | Model / table | File | Key fields |
|---|---|---|---|
| Invoice (AR) | `Invoice` / `invoices` | `backend/app/maintenance/models/billing.py` | `customer_id`, `contract_id`, `invoice_number`, `invoice_date`, `due_date`, `period_start/end`, `subtotal`, `vat_rate`(15), `vat_amount`, `total_amount`, `amount_paid`, `payment_date`, `status`(draft/sent/paid/partially_paid/overdue/cancelled), `balance_due` (prop) |
| Invoice line | `InvoiceItem` / `invoice_items` | same | `item_type`(service/part/labor/other), `related_work_order_id`, `quantity`, `unit_price`, `discount_amount`, `total` |
| Contract value | `Contract` / `contracts` | `backend/app/maintenance/models/contract.py` | `total_value`, `currency`, `billing_cycle`(monthly/quarterly/yearly/per_visit), `contract_type`, `status` |
| Maint. coverage | `MaintenanceContract` | same | `coverage_type`, `visit_frequency`, `visits_per_year`, `include_parts`, `emergency_call_included` |
| Sales request + pay schedule | `CustomerContractRequest` | same module | `system_price`, `manual_price`, `payment_pct_1..4`, `contract_id` (set on approval) |
| Quote | `Quote` / `quotes` | `backend/app/sales/models/quote.py` | `line_items`(JSON), `subtotal`, `discount_pct/amount`, `vat_pct/amount`, `total`, `payment_terms`(JSON), `status`(…/pending_finance/finance_approved), `finance_by_user_id`, `finance_at` |
| Store order | `CustomerOrder` / `customer_orders` | `backend/app/customer_app/model.py` | `invoice_id`, `subtotal`, `shipping`, `tax`, `total`, `payment_status`, `payment_method` |
| Store payment | `PaymentTransaction` / `payment_transactions` | same | `customer_order_id`, `provider`(company_invoice), `status`, `amount`, `reference` |
| Payment webhook | `PaymentWebhookEvent` | same | provider/event stubs (no live gateway) |
| Work-order cost | `WorkOrder` | `backend/app/work_orders/models/work_order.py` | `labor_cost`, `parts_cost`, `total_cost`, `is_billable`, `contract_id` |
| Parts used | `WorkOrderSparePart` | same | `quantity_used`, `unit_price`, `total_price` |
| Installation cost | `InstallationTask` | `backend/app/installations/model.py` | `planned_cost`, `actual_cost`, `phase`, `currency` |
| Parts catalogue / stock | `SparePart`, `SparePartStock` | `backend/app/work_orders/models/spare_part.py` | `unit_price`, `quantity_available/reserved`, `reorder_point` |
| Default pricing | `SalesDefaultPrice` | `backend/app/sales/models/default_price.py` | per-option `price` used by sales auto-quote |

### Backend endpoints & services
- **Invoices:** `backend/app/maintenance/controllers/invoices.py` — `GET /maintenance/invoices` (filters: customer, contract, status, date), `GET /{id}`, `POST` (create draft from contract + items), `POST /{id}/mark-paid`, `DELETE` (draft only). Repo: `backend/app/maintenance/repository.py` (`InvoiceRepository`, incl. `list_overdue()` — aging source).
- **Quotes:** `backend/app/sales/controllers/quotes.py` — list/get/create/send + `POST /sales/quotes/{id}/finance` (gate: discount > 5% OR total > 100k SAR; role `finance_manager`).
- **Contract materialization:** `backend/app/sales/services.py` `materialize_contract_from_request(...)` (request → Contract + MaintenanceContract/InstallationProject; idempotent).
- **Store checkout/orders/payments:** `backend/app/customer_app/services/checkout.py` `place_order()` creates `CustomerOrder` + `Invoice` + `PaymentTransaction` atomically. ZATCA Phase‑1 PDF/QR: `backend/app/customer_app/services/invoice_support.py`.
- **Central per-customer finance:** `GET /customer-admin/customers/{id}/finance` → `CustomerAdminService.get_customer_finance()` in `backend/app/customers/service.py`. Plus reconcile endpoints: mark store order paid, update installation task planned/actual cost.

### Frontend (AdminPortal)
| UI | File | Route | Does |
|---|---|---|---|
| Contract-request finance approval | `pages/finance/FinanceApprovals.tsx` | `/finance` | Approve/reject requests at `pending_finance`. **This is all the current `/finance` does.** |
| Quote finance approval | `pages/sales/SalesQuotesFinance.tsx` | `/sales/finance-approvals` | Approve/reject quotes over threshold |
| Installation cost dashboard | `pages/installations/InstallationPaymentsFinance.tsx` | `/installations/finance` | Planned vs actual task cost, burn vs progress, per-phase variance |
| Customer finance tab | `pages/customers/dialogs/FinanceTab.tsx` | (modal) | Per-customer: spare-part orders, contracts, installation tasks, summary cards, mark-paid / edit actual cost |
| Spare-parts store | `pages/customers/StoreManagementPage.tsx` | `/store` | Orders, invoices (PDF), payment status, delivery |
| Maintenance contracts | `pages/customers/Contracts.tsx` | `/customers/contracts` | Contract CRUD (value, cycle) |

API client: `customerAdminApi.getCustomerFinance`, `updateCustomerFinanceOrderPayment`, `updateCustomerFinanceInstallationTask`; `salesApi.financeDecision`; `quotesApi.financeDecision`. Types: `CustomerFinanceResponse`, `CustomerFinanceSummary` (`sparePartsTotal/Paid`, `maintenanceTotal`, `installationPlanned/Actual`, `grandTotal`, `paidOrRecorded`, `balanceDue`), `CustomerAdminStoreInvoice`, `Contract`, `Quote`, `PaymentTerm` (`types/index.ts`).

Sidebar: top-level item `id:'finance', text:'المالية', path:'/finance'` (`components/layout/Sidebar.tsx:228`), badge = `financePendingCount`. It is a **flat link**, not yet an expandable section.

---

## 2. Proposed Finance module — sidebar tabs & what each does

Restructure the flat `/finance` link into an **expandable section** `المالية` with child routes `/finance/*`. Each tab below lists: purpose, the four-unit integration, the data it uses, and build status.

| # | Tab (AR / route) | What it does | Units it touches | Data source | Status |
|---|---|---|---|---|---|
| 1 | **لوحة المالية** `/finance` | Company-wide KPIs: total AR, collected, overdue, revenue by unit & period, balance due. The landing tab. | All 4 | Aggregate `Invoice` + `CustomerOrder` + contract values. Per-customer aggregation exists; needs a **company-level** version. | ✅ **scaffolded** (Phase 1) — `GET /maintenance/finance/overview`; KPIs + collection donut + status breakdown + unit cards |
| 2 | **الفواتير** `/finance/invoices` | List + **search (number/customer)** + filter + **archive/unarchive + delete row actions** + show-archived toggle; create; detail/edit drawer: full draft edit, send/cancel, partial payment+history, pull billable items. **The revenue hub.** | All 4 | `Invoice`/`InvoiceItem` (+ `is_archived`, migration `finance_misc_0018`) + `/maintenance/invoices` (search, include_archived, /archive, /unarchive) | ✅ **built**. TODO: source-type filter, ZATCA PDF, aggregate totals |
| 3 | **سندات القبض/الصرف** (ledger) | Every registered payment (invoice receipt, supplier-bill/expense voucher) is persisted with amount/date/method/reference and shown as history. | All 4 | `payment_records` table (Alembic `finance_pay_0017`) + `GET /maintenance/finance/payments`; created on each record-payment / mark-paid | ✅ **built** — ledger + per-record history in the invoice & expense drawers |
| 4 | **ذمم العملاء (الأعمار)** `/finance/receivables` | Outstanding balance per customer + aging buckets (current/1‑30/31‑60/61‑90/90+); collections follow-up. | All 4 | `GET /maintenance/finance/receivables` (per-invoice balance bucketed by due-date) | ✅ **scaffolded** (Phase 1) — KPIs + bucket summary + per-customer aging table |
| 5 | **الاعتمادات المالية** `/finance/approvals` | Move the existing two approval queues here: contract-request gate + quote gate. | Contracts, Sales | `FinanceApprovals.tsx` + `SalesQuotesFinance.tsx` (relocate) | ✅ exists (relocate) |
| 6 | **فوترة العقود** `/finance/contract-billing` | Contracts due this cycle → generate recurring invoices; renewals; payment-percentage schedules. | Contracts, Maintenance | `Contract.billing_cycle`, `CustomerContractRequest.payment_pct_*` | ⚠️ data exists, no automation |
| 7 | **فوترة مراحل التركيب** `/finance/installation-billing` | Tie installation phases / payment % to invoices (advance → progress → handover milestone billing). | Installations | `InstallationTask.phase` + `payment_pct_*`; link to `Invoice` | ⚠️ partial (no invoice link yet) |
| 8 | **أوامر المتجر والمدفوعات** `/finance/store-payments` | Spare-parts order payment status + invoices, in the finance lens. | Spare parts | `CustomerOrder`/`PaymentTransaction`/`CustomerAdminStoreInvoice` | ✅ exists (surface) |
| 9 | **المصروفات** `/finance/expenses` | Operating costs. List + KPIs + create (**ZATCA QR scan** prefills payee/amount/date/tax-id) + row-click edit drawer + mark-paid + delete + payment history. | Maintenance, Installations | `expenses` table (+ `tax_number`, migration `finance_misc_0018`) + `/maintenance/finance/expenses` | ✅ **built** |
| 10 | **المشتريات والموردون** `/finance/purchasing` | 3 internal tabs, **row-click drawers**: Suppliers (edit/activate/delete), Purchase Orders (view, **edit-draft items**, status flow, delete), Supplier Bills/AP (record payment partial+method, **payment history**, delete). | Spare parts | `suppliers`/`purchase_orders`/`purchase_order_items`/`supplier_bills` + `/maintenance/finance/*` (PUT for draft PO edit) | ✅ **built** (migration `finance_ap_0016`) |
| 11 | **الضريبة والفوترة الإلكترونية** `/finance/tax` | VAT config, ZATCA status, tax reports. Phase‑1 QR works; Phase‑2 signing missing. | All 4 | `invoice_support.py` (Phase 1) | ⚠️ Phase 1 only |
| 12 | **التقارير المالية** `/finance/reports` | **Profit (revenue − cost)** summary + **monthly revenue-vs-cost chart** (pulls invoices + expenses + supplier bills) + contract billing + installation cost. | All 4 | `GET /maintenance/finance/reports` (adds `profit` + `monthly`) | ✅ **built** — profit KPIs + ComposedChart + tables. TODO: VAT return |
| 13 | **الإعدادات المالية** `/finance/settings` | Numbering, payment terms, tax rate, company VAT/CR profile, (later) GL account mapping. | All 4 | `SalesDefaultPrice`, company invoice profile | ⚠️ partial |

> **General Ledger (accounting core) — ✅ BUILT (Alembic `finance_gl_0021`):** دليل الحسابات (Chart of Accounts, seeded standard Saudi chart) + القيود اليومية (double-entry Journal) + القوائم المالية (Trial Balance, Income Statement, Balance Sheet). A `/gl/sync` posts balanced قيود from invoices/payments/expenses/bills (idempotent). Pages: `FinanceAccounts.tsx`, `FinanceJournal.tsx`, `FinanceStatements.tsx`. Endpoints under `/maintenance/finance/gl/*`. Verified live: trial balance + balance sheet balance to zero.
> **Also built (2026-06-06):** ✅ **Cash-flow statement** (3rd tab in القوائم المالية), ✅ **VAT return** (الإقرار الضريبي — output − input VAT), ✅ **Fixed Assets + straight-line depreciation** (الأصول الثابتة, Alembic `finance_fa_0022`; "تشغيل الإهلاك" posts Dr مصروف الإهلاك / Cr مجمع الإهلاك). Sidebar finance section = 12 children.
> **Also built (2026-06-06):** ✅ **Bank accounts + reconciliation** (البنوك والتسوية, Alembic `finance_bank_0023`): register + bank transactions + tick-and-tie reconciliation (book vs reconciled vs statement balance). Sidebar finance = 13 children.
> **Still optional/future:** ZATCA Phase 2 e-invoice signing, spare-parts COGS/inventory valuation, HR/Payroll, linking bank transactions to GL/payment records (currently a standalone reconciliation ledger).

---

## 3. Integration matrix — how each tab serves the four units

```
                       Contracts   Installations   Maintenance   Spare parts
Invoices (#2)             ●  rev        ●  rev         ●  rev         ●  rev
Receipts (#3)            ● in         ● in           ● in           ● in
Receivables/Aging (#4)   ●            ●              ●              ●
Contract billing (#6)    ● recurring  –              ● per-visit    –
Installation billing(#7) –            ● milestone    –              –
Store payments (#8)      –            –              –              ● order pay
Expenses (#9)            –            ● labor/parts  ● labor/parts  ● restock use
Purchasing/AP (#10)      –            ● buy units    ● buy parts    ● buy stock
Reports (#11/#12)        ● profit     ● profit/proj  ● WO margin    ● COGS
```

The governing rule (same as the chat's, now validated against your code): **every money event in the four units must end as either an `Invoice` (revenue) or an Expense / Supplier bill (cost), and surface in Receivables/Reports.** Today the revenue path exists (Invoice) but the cost path (Expenses, AP) does not — that is your biggest structural gap.

---

## 4. Gaps, ranked by structural importance

1. **No central Invoices admin UI** — the model and endpoints exist; this is pure frontend + maybe a list endpoint. Highest value-to-effort.
2. **No company-level finance dashboard / reports** — only per-customer aggregation exists.
3. **No receipts / formal payment-in records** — only `amount_paid` on invoice + store `PaymentTransaction`.
4. **No AR aging UI** — query helper exists, no screen.
5. **No automated contract / installation milestone billing** — fields exist (`billing_cycle`, `payment_pct_*`, phases) but nothing generates invoices from them.
6. **No cost side at all** — Expenses and Purchasing/Supplier (AP) are entirely absent; work-order labor/parts costs are recorded but never expensed or reported as margin.
7. **No spare-parts COGS / inventory valuation** — parts have a sell price, no cost basis.
8. **ZATCA Phase 2** (cryptographic signing / portal integration) — only Phase‑1 QR today.
9. **No GL / chart of accounts / journal** — optional unless full accounting is required.

---

## 5. Recommended build phases

**Phase 1 — Consolidate what exists (mostly UI wiring, low risk, high trust):**
- ✅ Turn `/finance` into an expandable section with children (done — `Sidebar.tsx`: `finance-overview` + `finance-invoices` + `finance-receivables` + `finance-approvals`). `/finance` now lands on the Overview; approvals moved to `/finance/approvals`.
- ✅ Build **Invoices** admin page (#2) on `/maintenance/invoices` (done — `AdminPortal/src/pages/finance/InvoicesPage.tsx` + `invoicesApi`; backend serializer enriched with `customer_name`/`contract_number`). TODO: ZATCA PDF for maintenance invoices, text search, source-type filter, aggregate totals endpoint.
- ✅ Build **Finance Overview** (#1) and **Receivables/Aging** (#4) — done via new company-level controller `backend/app/maintenance/controllers/finance_overview.py` (`/maintenance/finance/overview` + `/receivables`) + `financeApi`; pages `FinanceOverview.tsx`, `FinanceReceivables.tsx`. Shared UI in `pages/finance/financeShared.tsx`.
- TODO (remaining Phase 1): relocate **Quote** approvals (#5) under the section, surface **Store payments** (#8), and add revenue-by-period to Overview.

**Phase 2 — Close the revenue automation + reporting gaps:**
- ✅ **Partial payments** (#3 lite) — `record-payment` endpoint + drawer form (no Receipt ledger yet).
- ✅ **Bill from units** (#6/#7 lite) — `/billables` pulls completed billable work orders + installation phases into a new invoice.
- ✅ **Financial reports** (#12) — `FinanceReports.tsx` (contract billing + installation cost).
- TODO: recurring contract billing automation, installation milestone *state* (avoid double-billing), `Receipt` ledger/history.
- **Expenses** (#9): new model + UI — **needs Alembic migration** (the cost side; not yet started).

**Phase 3 — Full cost & compliance (largest, only if needed):**
- ✅ **Expenses** (#9) + **Purchasing / Suppliers / AP** (#10) — built end-to-end (Alembic `finance_ap_0016`: `suppliers`, `purchase_orders`, `purchase_order_items`, `supplier_bills`, `expenses`).
- ✅ **Profit reporting** — `/finance/reports` now returns `profit` (revenue − expenses − supplier bills) + `monthly` revenue/cost/profit series; Reports page shows profit KPIs + a monthly ComposedChart.
- TODO: **spare-parts COGS / inventory valuation**, **ZATCA Phase 2** (signing), optional **GL / Chart of Accounts / Journal**, VAT return report.

---

## 6. Implementation notes (follow existing patterns)

- **Sidebar:** convert the `finance` entry (`Sidebar.tsx:228`) from a flat `path` item into one with `children: NavItem[]` (same shape as the `installations` / `sales` sections already use), each child `{ id, text, icon, section:'finance', path:'/finance/...' }`. Keep the `financePendingCount` badge on the Approvals child.
- **Routing:** add `/finance/*` routes in `App.tsx` guarded by `<SectionRoute section="finance">` (the section + `finance_manager` role gating already exists).
- **API:** add a `financeApi` object in `api/index.ts`; reuse `CustomerFinanceResponse`/`CustomerFinanceSummary` types and extend for company-level totals.
- **Backend:** per CLAUDE.md, edit backend first when state changes, add Alembic migrations for any new table (`Receipt`, `Expense`, `PurchaseOrder`/`SupplierBill`), and add tests for billing-generation logic.
- **UI:** reuse the installations module's design language (`StatCard`, gradient cards, RTL logical props) for consistency; Arabic UI labels, English identifiers.

---

*Tick the Status column as you build. When a tab moves to ✓, note its PR/commit here so this file stays the single source of truth for finance scope.*
