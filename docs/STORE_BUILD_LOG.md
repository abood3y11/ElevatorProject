# المتجر — سجل البناء والمخاطر المفتوحة

> Store build log. Phases 1–5, what each one changed, what it proved, and what
> is still dangerous. Written 2026-09-05. Nothing here is deployed.

The plan's own instruction governed the whole build: **treat the store as
unwritten code, not as working code.** That was right. Reading it suggested it
worked; running it once, for real, found four defects in an afternoon.

---

## The shape now

Everything the store decides lives in `backend/app/commerce/`:

| File | Owns |
| --- | --- |
| `totals.py` | The ONE totals function. Reads the company's own VAT rate and shipping policy. |
| `status.py` | The order lifecycle as a transition table, not a free-text string. |
| `invoicing.py` | When an invoice stops being a draft and starts being a receivable. |
| `stock.py` | The ONE stock writer. Reserve → issue → release, with a ledger and a lock. |
| `payments.py` | The ONE way money lands on an invoice, and it always leaves a receipt. |
| `reconcile.py` | Asks, out loud, whether the numbers still agree. |
| `trade.py` | B2B. The only place that deliberately crosses a tenant boundary. |
| `controller.py` | The wholesale endpoints. |

Migrations `store_0001` … `store_0004`. Tests in `tests/test_commerce_*.py`.
End-to-end proofs in `scripts/verify/` — see that folder's README.

---

## Phase 1 — an order that is real

Checkout had **never executed**. Five signals said so: `invoice_id` NULL on 20
of 20 orders although the code sets it, every cart still `active`, every order
still `processing`.

* One totals function; `store_support.calculate_totals` (15% VAT and a 75-riyal
  flat rate hardcoded for every company that will ever use this system) deleted.
* The invoice subtotal now includes shipping, and shipping is a real invoice
  LINE. This is why `subtotal + vat != total` on 20 of the 23 existing invoices.
* The invoice is created `draft` and promoted at dispatch.
* The VAT rate is snapshotted onto the order, so re-checking last month's
  arithmetic does not depend on this month's rate.

**Found only by running it:**

1. `CustomerOrder.vat_rate` and the four `spare_parts` trade columns existed in
   the database via migration but **not on the ORM models**. The migration is
   half the job.
2. Invoice lines were written **twice** — a loop I added duplicated one already
   further down the same method.
3. `parse()` rejected its own enum members: `str(OrderStatus.CANCELLED)` is
   `"OrderStatus.CANCELLED"`, not `"cancelled"`.
4. **The delivery worker's path bypassed everything.** It assigned
   `order.status = "delivered"` directly — no validation, no invoice promotion.
   That is the path that actually happens in operation, so goods left the
   warehouse and the invoice stayed a draft forever.

Also: four `from_thread.run` broadcast sites ran **after** `db.commit()` and
unguarded, so a socket problem reported failure for a change that had already
succeeded — the operator retries, and the second attempt is refused by a state
machine because it already happened.

---

## Phase 2 — stock that cannot lie

Not one of the 139 `spare_part_stock` rows had moved since the day it was
created, and the store never touched stock at all: two customers could buy the
same last unit.

* `reserve` → `issue` → `release`, each taking `SELECT … FOR UPDATE`.
* `spare_part_stock_movements`: every change appends a row, so
  `SUM(quantity_delta)` reproduces the shelf.
* Placing an order reserves; dispatch issues **once** however many times the
  order is nudged forward; cancelling releases, or restocks if it had shipped.
* The one bare `quantity_available -= qty` in work-order completion is gone. It
  read one arbitrary row of the five parts that have several, and both its check
  and its decrement were guarded by `if stock:` — so a part with no stock row
  completed successfully having deducted nothing.
* The storefront stopped saying "متوفر بطلب توريد" at zero stock, because
  checkout now refuses that order.

**Proved with two real threads racing for the last unit.** Exactly one wins.

---

## Phase 3 — money that reconciles

Two invoices are marked paid. **Neither has a receipt.** `PaymentRecord` is what
the GL posting, the bank reconciliation, the statements of account and the
executive cash reports are all built from — so money collected through the
mark-paid buttons was money finance could not see.

* `record_invoice_payment` is now the only way money lands on an invoice. It
  caps overpayment, derives the status from the numbers, and always writes the
  receipt. Both mark-paid shortcuts go through it.
* `reconcile.py` + `GET /customer-admin/orders/reconciliation` + a «مطابقة
  الأرصدة» tab: every way an invoice can disagree with itself.

**It reports; it does not repair.** The breaks it finds today are seeded mock
rows — of 23 invoices, 20 have `subtotal + vat != total`, 22 have lines that do
not sum, 12 are recorded as paid MORE than they are worth. Rewriting invented
numbers to look consistent would destroy the evidence that the seeder produces
nonsense, and would teach everyone the screen is always green.

---

## Phase 4 — B2B, one direction

The platform owner sells wholesale to the elevator companies that use ELMS.

* `trade_accounts` lives in the **seller's** tenant: the seller decides who may
  buy. Invited ≠ active; there is no discovery and no self-signup.
* The buying company is a `customers` row in the seller's books — which is what
  a wholesale buyer actually is, and it makes the invoice, the statement of
  account and the credit control work with no new code.
* Wholesale orders reuse the whole Phase 1–3 pipeline. Only the price, the
  minimum order quantity and `buyer_company_id` differ.

**The dangerous part** is that this is the only code that crosses a tenant
boundary, where RLS is the *only* enforcement (2,035 query sites, no chokepoint).
Three rules, and they must hold for anything added here later:

1. One function opens a session as another company: `trade._seller_session`.
2. Every crossing first requires an ACTIVE trade account naming the caller.
3. **No endpoint ever accepts a buyer company id.** It is always
   `current_user.company_id`, which is read from the database, not the token. A
   `buyerCompanyId` parameter would be an authorisation bypass with a helpful
   name.

Verified with the negative cases: no account → nothing, invited → nothing,
suspended → nothing, and the buyer's purchase list excludes all 20 consumer
orders.

---

## Phase 5 — the identity on the document

**Every tenant's tax invoice was issued under one hardcoded VAT number.**
`ZATCA_SELLER_NAME` and `ZATCA_VAT_NUMBER` are process-wide environment
variables, defaulting to `300000000000003`. A tax invoice carrying a VAT number
that does not belong to its issuer is a false document, and it is the platform
owner's registration it gets filed against.

`load_config_for_company` now takes the gateway settings from the environment
(they belong to the deployment) and the legal identity from `companies` (it
belongs to the tenant). It **refuses** rather than falling back: issuing under
the wrong VAT number is worse than not issuing.

Also closed: `spare_parts.inventory_item_id` now has a UI, so the warehouse
bridge is something a human can actually do rather than a dead column.

---

## Round two — the open items, closed

The list below replaces the seven "still open" items. Six are resolved; two
remain, and both are stated as what they are rather than as work left undone.

### Resolved

**The test suite is green.** It was 6 failures + 25 errors, all pre-existing.
Now: **577 passed, 31 skipped, 0 failed, 0 errors.** Every one was a stale test,
and two of them were hiding real bugs:

* `POST/GET/PUT /maintenance/plans` all did `return plan` — a raw SQLAlchemy
  object with no `response_model`. FastAPI cannot serialize one, so all three
  endpoints raised `PydanticSerializationError` and 500'd. Only `list_plans`
  worked, because it built its dicts by hand. That hand-built shape is now
  `_plan_payload`, shared by all four.
* `order_has_been_issued(db, None)` compiled to `customer_order_id IS NULL`,
  which matches every movement belonging to NO order — a counter sale, a
  work-order consumption. Any of those would answer "has THIS order shipped?"
  with yes, and the goods would never leave the shelf.

The stale ones were stale in an instructive way: each asserted behaviour that
had been *deliberately* changed. `get_days_late` returning None for a
late-assigned job (the two-deadline split), a pricing unique without
`company_id` (the tenancy migration), `installation_supervisor` missing from the
installation roles, `TeamVisitDistributor.max_daily_visits` (deprecated into
`UnifiedAssignmentService`), a PUT that could change a contract's status (the
lock that stopped unrelated edits flipping a contract to draft), and a DELETE
without a mandatory reason.

`tests/test_maintenance_api.py` was worse than stale: its `db` fixture came from
the application's own `SessionLocal`, which is bound to `APP_DATABASE_URL` — the
**dev database**, as the `elms_app` role, with no rollback. It wrote test users
and contracts into real data, and once RLS arrived could not insert at all. It
now uses conftest's transactional session, and conftest binds a test company so
`company_id NOT NULL` is satisfiable at all.

Two suites also stopped shouting: `test_tenant_isolation` ERRORed 13 times on
every run because `ELMS_APP_DB_PASSWORD` was unset. The refusal is right — as
the superuser every check would pass vacuously — but 13 errors on every run
teaches everyone to ignore the summary, and an ignored summary is where a real
failure hides. It **skips**, loudly, with the command to run it properly.

**Every company issues under its own VAT registration.** `load_config_for_company`
takes the gateway settings from the environment and the legal identity from
`companies`, refusing rather than falling back. The console validates the number
(15 digits, starts and ends with 3) — and refuses a mistyped one instead of
*silently clearing* the company's registration, which the first version did.
Proof: `scripts/verify/verify_tax_identity.py`.

**Over-commitment is visible.** `reconcile.check_stock` surfaces shelves where
`reserved > available` (a promise the shop can no longer keep — reachable
because a technician must be able to take a part for a stuck lift) and any
negative balance (which means something wrote stock without going through
`app.commerce.stock`). Both appear on «مطابقة الأرصدة».

**The wholesale gates are real.** `RoleChecker` genuinely raises 403 — it is
`require_permission` that is in shadow mode, and no wholesale endpoint uses it.
The seller-side endpoints moved off `require_operations` (which admits
customer_service and sales_manager) onto `require_trade_manager`: admin,
operations_manager, finance_manager, store_manager. Deciding who may buy at
trade prices is a commercial decision.

**The empty catalogue explains itself.** The products tab now says why nothing is
published rather than looking broken.

**The warehouse bridge is usable.** `spare_parts.inventory_item_id` has an API
and a picker in the product editor.

### Not resolved, and why

**The catalogue is still empty, and I did not fill it.** The 129 hidden products
have names like «لوحة تحكم ELV-CONTROL-003» and prices in an arithmetic sequence
(1034, 1171, 1308, … +137 each). They are fabricated. Publishing them would put
invented prices in front of customers, which is the exact thing Phase 0 removed.
The create screen is ready and the empty state explains itself; the real
products are yours to enter.

**`users.email` is globally unique across tenants.** This is correct, not
leftover: login is by email with no tenant selector, so it must resolve to
exactly one user. The cost is real — one person cannot hold accounts at two
companies — and changing it means redesigning login, which is not a change to
make as a side effect of a store build.

**One unexplained test failure.** A single run reported `1 failed` and my own
`tail -1` truncated the name before I saw it. Four consecutive runs since have
been clean (577 passed). I could not reproduce or identify it, so it is recorded
here rather than declared fixed.
