# Sales Offer + Call Workflow (single-approval model)

Authoritative spec for the sales flow. Worker enters a lean offer; the sales
manager approves it once and later builds the contract directly. The finance
and installation approval stages are RETIRED (migration `sales_reqfin_0032`
folded any legacy rows into the simplified statuses).

## Stages

| # | Stage | Status | Actor | Allowed |
|---|-------|--------|-------|---------|
| 1 | Worker submits offer | `pending_review` | sales_rep | Enter minimal contact (phone + quick name) + elevator spec/price. Editable. No calls, no quote. |
| 2 | **Approval — approve the worker's offer** | `pending_review → approved_working` | **admin / operations_manager / sales_manager** | Unlocks the working phase. |
| 3 | Working phase | `approved_working` | sales_rep | Register calls **inside the offer** (call log) + generate the quote → **download PDF** or **send via WhatsApp** to the customer. Spec locked. Worker signals the customer signed via *ready-to-contract* (flag only, no status change). |
| 4 | **Build contract** | `approved_working → approved` | **admin / operations_manager / sales_manager** | The manager confirms/edits the real customer + site data in the onboarding wizard and enters the contract terms; the operational `Contract` (+ `MaintenanceContract` / `InstallationProject` child) is created HERE — the single trigger. Originating call lead → `converted` (تم التعاقد). |

`approved` renders as **معتمد مبدئيًا**. `rejected` / `cancelled` remain
reachable from any open stage (manager); terminal states reopen only to
`pending_review`.

## Notes

- The finance pipeline statuses (`pending_finance` / `finance_approved` /
  `finance_rejected`) are retired: the generic status endpoint rejects them,
  no UI produces them, and migration `sales_reqfin_0032` remapped existing
  rows (`finance_approved → approved`, `pending_finance → approved_working`,
  `finance_rejected → rejected`).
- The legacy `finance-decision` endpoint and the AdminPortal FinanceApprovals
  page (`/finance/approvals`) still exist but are unreachable in practice
  (nothing enters `pending_finance`); remove them together when convenient.
- `site_survey` / `quoted` / `contacted` are dropped from the mandatory path
  (kept only as legacy labels so old rows still render). Quoting now happens
  inside `approved_working` as a worker action.
- The standalone Calls tab is unchanged; calls registered from inside an offer
  also surface there.

## Permissions

- Worker edits the offer spec only in `pending_review`.
- Worker registers calls + generates/sends the quote only in `approved_working`.
- Approval (`pending_review → approved_working`): admin / operations_manager /
  sales_manager (MANAGER_ROLES).
- Build contract (`approved_working → approved`): MANAGER_ROLES via
  `POST /technicians/sales/contract-requests/{id}/build-contract`.
- `approved` is never settable through the generic status endpoint — only
  build-contract sets it.
