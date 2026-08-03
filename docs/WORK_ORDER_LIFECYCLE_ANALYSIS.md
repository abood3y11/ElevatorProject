# Work-order lifecycle — full analysis

**Date:** 2026-08-03 · **Scope:** every path that creates, dates, numbers or renumbers a maintenance work order.

---

## 1. The model we want

> Only the **current month** holds scheduled work orders. When a month arrives, its
> work orders are generated — each with a work-order code and a visit number.
> Renewing, adding to, or updating a contract changes the **term**, not the schedule.

Everything below is measured against that sentence.

---

## 2. What actually happens today

Seven different places create a maintenance work order. They do not agree with each other.

| # | Path | Trigger | How far ahead it generates | Generator used |
|---|------|---------|---------------------------|----------------|
| 1 | `generate_monthly_maintenance_visits` | cron, 1st of month 01:00 | current month only ✅ | `VisitScheduler` |
| 2 | `catch_up_current_month_maintenance_visits` | every API boot | current month only ✅ | `VisitScheduler` |
| 3 | `_apply_contract_renewal` («إضافة» / «تجديد») | operator | **the whole added term** ❌ | `generate_visits_for_period` |
| 4 | `update_contract_term` («تحديث») | operator | **the whole term** ❌ | `generate_visits_for_period` |
| 5 | `generate_renewal_visits` («زيارة تجديد») | daily cron | 1 extra visit per expiring contract | own code |
| 6 | `POST /contracts/{id}/generate-visits` | operator | whole term ❌ | `generate_visits_for_period` |
| 7 | `crud.create_work_order` / emergency | operator | single, ad-hoc | own code |

**Two independent generators exist for the same job**, and they disagree on all three rules that matter:

| Rule | `VisitScheduler` (paths 1–2) | `generate_visits_for_period` (paths 3–4, 6) |
|------|------------------------------|---------------------------------------------|
| Which elevators | operational only (`Elevator.status.in_(operational)`) | **every elevator at the site**, no status filter |
| Duplicate check | elevator + month, **any** `visit_type` | elevator + month, `visit_type='preventive'` only |
| Visit date | `max(start_date, today)` for the current month | steps monthly from `period_start` |

---

## 3. The problems

### P1 — Renewal generates the whole term upfront *(the root cause)*

`_apply_contract_renewal` calls the generator for `[base, new_end]`. Renew by 12 months and you get **12 scheduled work orders immediately**. CUS408 was renewed on 2026-07-23 and instantly received visits dated through **2027-07-23**.

This is the single biggest divergence from the model. It is also why «تحديث» and the gap-fill felt like they were "inventing" work — they were following the same rule.

**Evidence:** 194 work orders scheduled beyond the current month predate today's changes; all originate from renewals.

### P2 — Far-future visits cannot carry a visit number

`_number_is_settled` deliberately stores `visit_number = NULL` for a future visit whose ordinal has not caught up with the cadence, because generating month-by-month would shift it later. So a work order generated a year ahead shows **no visit number at all**.

**Evidence:** **119** future scheduled work orders currently have `visit_number IS NULL`.

This is the direct cause of the "visit number is wrong / missing" reports. In the wanted model the problem disappears: a visit generated in its own month is always settled.

### P3 — The work-order code is assigned at creation and never reclaimed

`next_work_order_number` returns `max(existing tail) + 1` for the elevator. Delete a work order and the month is free again but the code is not: the replacement takes the next number, not the freed one.

**Evidence:** CUS408 — `WO408-1-1-2` was deleted, the regenerated August job became **`WO408-1-1-14`**. Only a manual `resequence_work_order_codes` run reclaimed it.

### P4 — Code order and schedule order drift apart

The code's last segment records *creation* order; `visit_number` records *schedule* order within the term. Generating out of order makes them disagree.

**Evidence:** CUS855 held `WO855-1-1-40` dated 24 Aug ranked above `-41` dated 1 Aug.

Partly fixed: «تحديث» and renewal-visit generation now resequence the elevators they touch. **Not** fixed for manual deletes or `VisitScheduler`.

### P5 — `VisitScheduler`'s duplicate check ignores `visit_type` *(latent)*

Its dedupe matches **any** visit in the month, including a «زيارة تجديد» (`renewal_reminder`). A renewal visit in month M will therefore **suppress that month's real contracted visit**.

**Evidence:** 0 cases today — every renewal-visit month happened to already hold its preventive visit. It will fire the first time a renewal visit lands in a month before the cron runs for it.

### P6 — A cancelled visit blocks its month forever

Neither dedupe filters by status. Once a month holds a cancelled preventive visit, no generator will ever fill that month again — the month looks empty in the UI but is "taken" as far as generation is concerned.

### P7 — `visit_number` and the code can never be equal

`visit_number` restarts per term («تجديد» moves `start_date`); the code is a unique lifetime sequence per elevator. On CUS408 they sit permanently one apart. This is by design and cannot be "fixed" without reusing codes — but nothing in the UI explains it.

### P8 — Two elevator filters

`visit_generation.py:100` takes every elevator at the site; `VisitScheduler` takes operational ones only. A decommissioned elevator gets visits from one path and not the other.

---

## 4. The fix

Ordered. Each step is independently shippable.

### Step 1 — Stop generating beyond the current month ✅ DONE

* `_apply_contract_renewal`: extends the term and reactivates; **generates nothing**. Tail generation and the gap fill removed. `generate_visits` kept in the signature so both callers and their payloads keep working.
* `update_contract_term` («تحديث»): corrects dates, renumbers, cancels out-of-term visits; **generates nothing**.
* `POST /generate-visits`: clamped to the **current month**, intersected with the contract term.
* `app/scripts/fill_contract_visit_gaps.py`: deleted.

Contracts now carry a term; the schedule is produced only by paths 1–2.

Also done, separately: **WhatsApp intake no longer opens tickets.**
`whatsapp_intake_open_ticket_enabled` (default **off**) gates
`dept_intake._create_maintenance_work_order`. The flow still collects
everything, still answers the customer, and flags the conversation
`needs_operations_review` so operations open the ticket from the chat. The
**emergency bot is not gated** — someone trapped in a cabin always gets a job
raised.

### Step 2 — One generator ✅ DONE

Keep `VisitScheduler` (it already owns the "current month" semantics and the operational-elevator filter). Reduce `generate_visits_for_period` to a single-month call used by the scheduler, or delete it. This removes P8 and the whole class of "the two paths disagree" bugs.

### Step 3 — Fix the duplicate rule ✅ DONE

In the surviving generator: dedupe on `visit_type = 'preventive'` **and** `status != 'cancelled'`. Fixes P5 and P6 together.

### Step 4 — Codes follow the schedule automatically ✅ DONE

Call the scoped `resequence(elevator_ids=…)` after **every** mutation that changes a month's contents — including manual delete and monthly generation, not just the two paths wired today. Fixes P3 and P4.

### Step 5 — Say what the numbers mean ✅ DONE

In the work-order detail: label the code as the elevator's permanent identifier and the visit number as "visit N of the current contract term". P7 stops being a surprise.

### Step 6 — Clean up what exists — script ready, run pending

Remove scheduled work orders dated beyond the current month so the estate matches the model.

| Set | Count |
|-----|-------|
| Scheduled beyond this month (total, now) | 1,972 |
| — created by my full-term sweep today | 1,805 |
| — pre-existing, from renewals | ~194 |
| Of those, carrying no visit number | 119 |

Safe to delete: none are assigned, started or completed. Backup: `/root/pre_gapfill_20260803.sql`.

---

## 5. What this changes for operations

* The distribution screen shows one month — the month you are working.
* Every work order has a real visit number, because it is generated in its own month.
* Codes stay in schedule order because each month is appended in order.
* Renewing becomes cheap and reversible: it moves a date, it does not manufacture a year of work.

## 6. Open question

A renewal today gives the customer a visible year of scheduled visits. Under this model that disappears until each month arrives. If the customer or sales needs to *see* the planned year, that should be a **projection** (computed from term + cadence, shown read-only) rather than real work-order rows.
