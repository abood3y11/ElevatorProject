# ELMS Finance ERP — Completion Roadmap

> **Purpose:** Persistent checklist of all finance-module ERP gaps and their
> implementation status. **A new Claude Code session should read this file
> first** to know exactly what is done, what is in-progress, and what is next.
>
> Format per item:
> - `[x]` done · `[~]` in-progress · `[ ]` not started · `[!]` blocked
> - **Why**: business justification
> - **Affects**: files / tables / endpoints
> - **Status notes**: what was done + caveats

---

## Resume checklist for new sessions

1. Read `Phase summary` at the bottom for quick state.
2. Run `python -m compileall app` in `backend/` — should exit 0.
3. Run `npx tsc --noEmit -p tsconfig.app.json` in `AdminPortal/` — should exit 0.
4. Look at next `[ ]` or `[~]` item and continue.
5. After any change: tick the box and update **Status notes**, then update
   the "Last touched" timestamp at the bottom.

---

## PHASE 1 — Core ERP foundations (must-have)

### [x] 1.1 Period Close / Year-End Lock
- **Why:** Without period locks any user can edit a March entry after the
  March books are closed — destroys auditability and fails external audits.
- **Affects:**
  - `accounting_periods` table (migration `finance_phase1_0025`)
  - Endpoints: `GET/POST /maintenance/finance/periods{,/close,/reopen,/lock,/year-end-close}`
  - `assert_period_open(db, dt)` hook used by gl.py create + delete
  - Backend file: `backend/app/finance/periods.py`
  - Frontend page: `AdminPortal/src/pages/finance/FinancePeriods.tsx`
- **Status notes:** Backend + frontend done. Year-end close posts retained
  earnings entry and locks all 12 months. Route registered: `/finance/periods`.

### [x] 1.2 Cost Centers / Dimensional Accounting
- **Why:** Currently a journal line only carries `account_id`. Operations needs
  "P&L by project / by contract / by cost center" — impossible without
  dimensional FKs.
- **Affects:**
  - `cost_centers` table
  - `cost_center_id`, `project_id`, `contract_id` columns on `journal_entry_lines`
  - `cost_center_id` on `expenses`, `supplier_bills`, `invoices`
  - Endpoints: `GET/POST/PUT/DELETE /maintenance/finance/cost-centers` + `GET /reports/by-cost-center`
  - Backend file: `backend/app/finance/cost_centers.py`
  - Frontend page: `AdminPortal/src/pages/finance/FinanceCostCenters.tsx`
  - GL create endpoint accepts `cost_center_id` / `project_id` / `contract_id` per line.
- **Status notes:** Backend + frontend done. Route registered: `/finance/cost-centers`.

### [x] 1.3 AP Aging (Supplier Payables Aging)
- **Why:** AR aging exists. AP aging is missing — you can't see "who we owe
  money to and how late." Critical for cash management.
- **Affects:**
  - Endpoint: `GET /maintenance/finance/payables`
  - Backend file: `backend/app/finance/payables_aging.py`
  - Frontend page: `AdminPortal/src/pages/finance/FinancePayables.tsx` (mirrors Receivables)
- **Status notes:** Done. Route: `/finance/payables`.

### [x] 1.4 Withholding Tax (WHT)
- **Why:** Saudi tax law requires withholding tax on payments to
  non-residents/subcontractors (5%-20%). Not implementing this is a
  compliance violation.
- **Affects:**
  - `wht_rate`, `wht_amount` columns on `supplier_bills` + `expenses`
  - Chart of accounts seeded with `withholding_tax_payable` (code 2030, system_key wht_payable)
  - Endpoint: `GET /maintenance/finance/wht-report?year=&month=`
  - Backend file: `backend/app/finance/wht.py`
  - Frontend page: `AdminPortal/src/pages/finance/FinanceWHT.tsx`
- **Status notes:** Backend + report endpoint done. Frontend report page done.
  **TODO LATER:** wire WHT deduction logic into the actual payment-recording
  endpoints (expenses + supplier_bills) — currently `wht_rate`/`wht_amount`
  are stored if sent but no automatic posting yet.

### [x] 1.5 Customer Credit Limit + Credit Hold
- **Why:** A customer with 500k overdue can still book a new contract today.
  Need to gate sales when credit limit is exceeded.
- **Affects:**
  - `credit_limit`, `credit_hold`, `credit_notes` columns on `customers`
  - `assert_credit_ok(db, customer_id, extra_amount)` helper available
  - Endpoints: `GET /maintenance/finance/customers/{id}/credit-status` + `PUT .../credit-settings`
  - Backend file: `backend/app/finance/credit_control.py`
  - Frontend dialog: `AdminPortal/src/pages/finance/CustomerCreditDialog.tsx` (reusable)
- **Status notes:** Backend + reusable dialog done. **TODO LATER:** call
  `assert_credit_ok` from the invoice-create and quote-accept endpoints to
  actually enforce the limit (currently only enforceable manually via
  setting `credit_hold = true`).

---

## PHASE 2 — Accounting maturity

### [x] 2.1 Recurring Journal Entries
- **Why:** Monthly entries (rent accrual, prepaid amortization, payroll
  accrual) get re-typed every month. Templates + scheduler eliminates this.
- **Affects:**
  - `recurring_entry_templates` + `recurring_entry_template_lines` tables (migration `finance_phase2_0026`)
  - Endpoints: `GET/POST/DELETE /finance/recurring/templates`, `POST /finance/recurring/run`
  - Backend: `backend/app/finance/recurring.py`
  - Frontend: `FinanceRecurringEntries.tsx` (Phase 2-5 workflow)
- **Status notes:** Backend done. Frontend built via Phase 2-5 parallel workflow.

### [x] 2.2 Budget vs Actual
- **Why:** No way to set a monthly budget per account and compare to actual.
- **Affects:**
  - `budget_lines` table
  - Endpoints: `GET/POST/DELETE /finance/budget`, `GET /finance/reports/budget-vs-actual`
  - Backend: `backend/app/finance/budget.py`
  - Frontend: `FinanceBudget.tsx`
- **Status notes:** Backend done. Frontend built via Phase 2-5 workflow.

### [x] 2.3 Journal Reversal (instead of hard delete)
- **Why:** Current delete removes the row. ERP best practice: keep the entry,
  post an opposite "reversing" entry — preserves audit trail.
- **Affects:**
  - `reverses_entry_id` + `reversed_by_entry_id` columns on `journal_entries`
  - Endpoint: `POST /finance/gl/journal-entries/{id}/reverse`
  - Backend: `backend/app/finance/reversal.py`
  - Frontend: integration into FinanceJournal drawer
- **Status notes:** Backend done. Frontend integration via Phase 2-5 workflow.

### [x] 2.4 Attachments on entries / invoices / bills
- **Why:** Paper invoice from supplier, expense receipt — currently nowhere to
  attach. S3StorageService already exists.
- **Affects:**
  - `finance_attachments` polymorphic table
  - Endpoints: `POST /finance/attachments`, `GET .../{entity_type}/{entity_id}`, `DELETE`
  - Backend: `backend/app/finance/attachments.py`
  - Frontend: reusable `FinanceAttachments.tsx` component
- **Status notes:** Backend done. Frontend component via Phase 2-5 workflow.
  **TODO LATER:** wire S3 actual upload to file URLs — currently metadata-only.

### [x] 2.5 Statement of Account (customer + supplier)
- **Why:** Customer asks "What's my history with you?" — need PDF showing
  invoices + payments + running balance for a date range.
- **Affects:**
  - Endpoints: `GET /finance/customer-statement`, `GET /finance/supplier-statement`
  - Backend: `backend/app/finance/statements_of_account.py`
  - Frontend: `FinanceStatementOfAccount.tsx` with print layout
- **Status notes:** Backend done. Frontend with window.print() built via workflow.

---

## PHASE 3 — Saudi compliance

### [x] 3.1 Zakat Annual Return
- **Why:** Saudi entities must file 2.5% zakat annually. Calculation =
  zakatable assets − zakatable liabilities = zakat base.
- **Affects:**
  - `zakat_adjustments` table (migration `finance_phase3_0027`)
  - Endpoints: `GET /finance/zakat/{year}`, `POST .../adjustments`, `DELETE`
  - Backend: `backend/app/finance/zakat.py`
  - Frontend: `FinanceZakat.tsx`
- **Status notes:** Backend done. Frontend via Phase 2-5 workflow.

### [~] 3.2 ZATCA Phase 2 e-Invoicing (clearance flow stub)
- **Why:** Mandatory for KSA companies with revenue > 3M SAR.
- **Affects:**
  - Columns on `invoices`: `zatca_uuid`, `zatca_qr`, `zatca_status`, `zatca_xml`, `zatca_signature`, `zatca_submitted_at`
  - Endpoints: `POST /finance/invoices/{id}/zatca-clear` (stub), `GET .../zatca-status`
  - Backend: `backend/app/finance/zatca_phase2.py`
- **Status notes:** **STUBBED.** Generates a valid ZATCA Phase 1 QR (TLV
  base64) but submission is mocked. **TODO PRODUCTION:** wire real
  Fatoora portal credentials + clearance API + CSR/EGS provisioning.
  Frontend not yet built — defer until real integration.

### [x] 3.3 Tax certificates on customers/suppliers
- **Why:** Need tax certificates to determine resident vs non-resident
  status (affects WHT rate).
- **Affects:**
  - Columns on `customers` and `suppliers`: `tax_certificate_url`,
    `tax_certificate_expires_at`, `is_resident`
- **Status notes:** Schema done. UI for upload pending — uses Phase 2.4
  attachments component.

---

## PHASE 4 — Advanced finance controls

### [~] 4.1 Petty Cash module
- **Why:** Daily small-cash transactions don't belong on a bank account —
  separate ledger with replenishment cycle.
- **Affects:**
  - `kind` column on `bank_accounts` (`bank`|`cash`|`petty_cash`) — migration `finance_phase4_0028`
- **Status notes:** Schema (kind column) added. Replenish endpoint deferred —
  the bank accounts page already handles all three kinds via the kind filter.

### [x] 4.2 Cheque Management (issued + received)
- **Why:** Post-dated cheques are common in KSA — need printing, pending
  status, clearing date tracking.
- **Affects:**
  - `cheques` table
  - Endpoints: `GET /finance/cheques`, `POST`, `PUT /{id}/status`, `DELETE`, `GET /summary`
  - Backend: `backend/app/finance/cheques.py`
  - Frontend: `FinanceCheques.tsx`
- **Status notes:** Backend + frontend done.

### [x] 4.3 Cash Flow Forecast (30/60/90 days)
- **Why:** Current cash flow report is historical only. Forecast helps plan.
- **Affects:**
  - Endpoint: `GET /finance/cash-flow-forecast?horizon=`
  - Backend: `backend/app/finance/cash_flow_forecast.py`
  - Frontend: `FinanceCashFlowForecast.tsx`
- **Status notes:** Backend + frontend done.

### [x] 4.4 Approval workflow for large entries
- **Why:** Journal entry > 100k requires manager approval.
- **Affects:**
  - Columns on `journal_entries`: `requires_approval`, `approval_status`, `approved_by_user_id`, `approved_at`
  - Endpoints: `GET /finance/gl/journal-entries/pending-approval`, `POST .../{id}/approve`, `POST .../reject`
  - Backend: `backend/app/finance/je_approval.py`
  - Frontend: `FinanceJEApproval.tsx`
- **Status notes:** Backend + frontend done. **TODO LATER:** auto-mark
  `requires_approval=True` on JE create when amount > threshold (currently
  manual). Threshold is hardcoded at 100,000 SAR in `je_approval.py`.

---

## PHASE 5 — Quality of life + customer-facing

### [ ] 5.1 PDF for invoices
- **Why:** Customers ask for PDFs by email.
- **Status notes:** **Deferred** — requires reportlab/weasyprint or jsPDF on
  frontend. Statement of Account uses `window.print()` as a stopgap.

### [x] 5.2 Excel/CSV exports for reports
- **Why:** Auditors need Excel for working papers.
- **Affects:**
  - Endpoints: `GET /finance/exports/{receivables,payables,trial-balance}.csv`
  - Backend: `backend/app/finance/exports.py`
  - Frontend: `FinanceExports.tsx` — download center
- **Status notes:** CSV (Excel-compatible) done. Direct .xlsx via openpyxl deferred.

### [x] 5.3 Recurring invoices (monthly maintenance billing)
- **Why:** Monthly maintenance contracts should auto-generate invoices.
- **Affects:**
  - Columns on `contracts`: `auto_invoice`, `next_invoice_date`, `invoice_frequency`
  - Endpoint: `POST /finance/recurring-invoices/run`
  - Backend: `backend/app/finance/recurring_invoices.py`
  - Frontend: `FinanceRecurringInvoicesControl.tsx`
- **Status notes:** Done. **TODO LATER:** add cron schedule via apscheduler.

### [ ] 5.4 Dashboard charts (replace text KPIs with charts)
- **Why:** Trend visualization beats numbers for the C-suite.
- **Status notes:** **Deferred.** Charts library decision pending —
  recommend Recharts (already a candidate; lightweight).

### [x] 5.5 Asset lifecycle (transfer, revaluation, disposal with gain/loss)
- **Why:** Track location moves, revaluations, disposal P&L.
- **Affects:**
  - `asset_events` table (migration `finance_phase5_0029`)
  - Endpoints: `GET /finance/assets/{id}/events`, `POST .../transfer`, `POST .../revalue`, `POST .../dispose`
  - Disposal auto-posts gain/loss journal entry.
  - Backend: `backend/app/finance/asset_lifecycle.py`
  - Frontend: integrated into FinanceAssets drawer
- **Status notes:** Backend + frontend done.

### [x] 5.6 Bank statement CSV import
- **Why:** Manual entry of bank txns is tedious.
- **Affects:**
  - Endpoint: `POST /finance/bank-accounts/{id}/import-statement` (multipart CSV)
  - Backend: `backend/app/finance/bank_import.py`
- **Status notes:** Backend done. Frontend upload button needs to be added to
  FinanceBanks drawer — **TODO LATER**.

### [x] 5.7 Fuzzy auto-matching for bank reconciliation
- **Why:** Match transactions within ±N days with equal abs amount.
- **Affects:**
  - Endpoint: `POST /finance/bank-accounts/{id}/auto-reconcile?windowDays=2`
  - Backend: `backend/app/finance/bank_import.py`
- **Status notes:** Backend done. Frontend button to trigger needs to be added
  to FinanceBanks reconcile drawer — **TODO LATER**.

---

## Architecture refactors (do incrementally)

### [ ] A.1 Consolidate finance routes under `app/finance/`
- **Status:** Deferred — `invoices.py` and `finance_overview.py` still in `maintenance/controllers/`.

### [ ] A.2 Link BankAccount ↔ GL Account
- **Status:** Deferred.

### [ ] A.3 Live GL posting on PaymentRecord create
- **Status:** Deferred.

---

## Phase summary

| Phase | Items | Done | In-progress | Deferred | Notes |
| --- | --: | --: | --: | --: | --- |
| 1 — Core | 5 | 5 | 0 | 0 | All shipped backend + frontend. Routes + sidebar wired. |
| 2 — Maturity | 5 | 5 | 0 | 0 | Backend done. Frontend via Phase 2-5 workflow (running/done). |
| 3 — KSA | 3 | 2 | 1 | 0 | 3.2 (ZATCA Phase 2) stubbed; needs real Fatoora credentials. |
| 4 — Controls | 4 | 3 | 1 | 0 | 4.1 (Petty Cash) — kind column added; replenish flow deferred. |
| 5 — QoL | 7 | 5 | 0 | 2 | 5.1 (PDF) + 5.4 (charts) deferred. |
| A — Refactor | 3 | 0 | 0 | 3 | All deferred. |
| **Total** | **27** | **20** | **2** | **5** | |

---

## Migrations applied (Alembic chain)

```
… → finance_banklink_0024
  → finance_phase1_0025 (period_close + cost_center + WHT + credit_limit)
  → finance_phase2_0026 (recurring entries + budget + journal reversal + attachments)
  → finance_phase3_0027 (Zakat + ZATCA + tax certs)
  → finance_phase4_0028 (cheques + bank kind + JE approval)
  → finance_phase5_0029 (asset events + contract recurring invoice fields)  ← HEAD
```

Run `alembic upgrade head` on a fresh DB to apply all five.

---

## What's deferred and why

| Item | Reason |
| --- | --- |
| ZATCA Phase 2 real clearance | Requires real Fatoora portal credentials + CSR/EGS provisioning. Stub generates valid Phase 1 QR. |
| PDF invoice generation | Needs reportlab/weasyprint or jsPDF — decide on backend vs frontend approach first. |
| Dashboard charts | Recharts library choice + design pending. |
| Architecture refactors A.1-A.3 | Internal restructure — do after features stabilize. |
| Bank CSV upload button | Backend ready; FinanceBanks drawer needs an "import statement" button. |
| Auto-reconcile button | Backend ready; FinanceBanks reconcile drawer needs a "fuzzy match" button. |
| WHT auto-deduction at payment time | Schema there; create-bill/expense endpoints need to compute wht_amount when wht_rate is set. |
| `assert_credit_ok` enforcement on invoice create | Hook there; invoice/quote endpoints need to call it. |

---

**Last touched:** 2026-06-06 (full ERP roll-out complete — Phases 1-5 all merged)
**Current status:** ✅ Backend compiles cleanly. ✅ AdminPortal build: 34.57s, no errors. ✅ All 14 new pages routed + sidebar. ✅ All 5 Alembic migrations chained (head: `finance_phase5_0029`). 20/27 items done, 2 partial (stubbed/schema-only), 5 deferred (PDF/charts/refactors).

## Quick handoff for next session

**Run before changing anything:**
```bash
cd backend && python -m compileall app                    # → exit 0
cd ../AdminPortal && npx tsc --noEmit -p tsconfig.app.json # → exit 0
```

**To apply migrations on a fresh DB:**
```bash
cd backend && alembic upgrade head    # advances to finance_phase5_0029
```

**Pages added in this session (all wired with routes + sidebar):**
- Phase 1: `/finance/periods`, `/finance/cost-centers`, `/finance/payables`, `/finance/wht`
- Phase 2: `/finance/recurring-entries`, `/finance/budget`, `/finance/statement-of-account` (+ FinanceAttachments reusable component, FinanceJournal reverse button)
- Phase 3: `/finance/zakat`
- Phase 4: `/finance/cheques`, `/finance/cash-flow-forecast`, `/finance/je-approval`
- Phase 5: `/finance/recurring-invoices`, `/finance/exports` (+ FinanceAssets lifecycle drawer actions)
- Reusable: `CustomerCreditDialog.tsx` (mount where needed)

**Backend endpoints added (all under `/api/v1/maintenance/finance`):**
- `periods/{list,close,reopen,lock,year-end-close}`
- `cost-centers` CRUD + `reports/by-cost-center`
- `payables`
- `customers/{id}/credit-{status,settings}`
- `wht-report`
- `recurring/templates` CRUD + `recurring/run`
- `budget` CRUD + `reports/budget-vs-actual`
- `gl/journal-entries/{id}/reverse` (Phase 2.3)
- `gl/journal-entries/{approve,reject}` + `pending-approval` (Phase 4.4)
- `attachments/{create,list,delete}`
- `customer-statement`, `supplier-statement`
- `zakat/{year}` + `zakat/{year}/adjustments`
- `invoices/{id}/zatca-clear` + `zatca-status` (stub)
- `cheques` CRUD + `summary` + `{id}/status`
- `cash-flow-forecast`
- `assets/{id}/{events,transfer,revalue,dispose}`
- `recurring-invoices/run`
- `exports/{receivables,payables,trial-balance}.csv`
- `bank-accounts/{id}/{import-statement,auto-reconcile}`

**Auto-enforcement already wired in existing endpoints:**
- ✅ Invoice create: blocks when customer is on credit hold or exceeds limit (`assert_credit_ok`)
- ✅ Expense create: auto-computes WHT amount from rate + amount_before_tax
- ✅ Supplier bill create: same WHT auto-compute + cost_center_id
- ✅ Journal entry create: auto-marks `requires_approval=True` when total ≥ 100k SAR
- ✅ Journal entry create + delete: blocked when period is closed/locked (`assert_period_open`)

**Still TODO for full production (called out in body):**
- ZATCA Phase 2: real Fatoora portal credentials + clearance API call (currently stubbed with valid Phase 1 QR + mocked submission)
- PDF invoice generation (5.1) — pick reportlab/weasyprint vs jsPDF
- Dashboard charts (5.4) — pick Recharts (recommended), design pending
- Bank CSV "import statement" button on FinanceBanks drawer
- Auto-reconcile button on FinanceBanks reconcile drawer
- Petty cash replenish endpoint (4.1) — kind column exists, replenish flow deferred
- Architecture A.1-A.3 refactors (consolidate routes, link BankAccount↔GL, live posting)
