# ELMS — Roadmap

> Split by feasibility. The **top** half is what we can build **right now** in the existing
> backend (software only, no new hardware, no external dependencies we don't already have).
> The **bottom** half is the **hard / longer-term** work — mainly IoT hardware integration —
> which needs physical devices, vendor cooperation, or accumulated telemetry before it's realistic.
>
> Entity spine everything hangs off: **Customer (C1) → Site (S1-2) → Elevator (ELV1-2-3) → Contract (CON1-2-1) → Work Order (WO1-2-3-7)**.

---

# PART A — Do now (backend, software only)

These reuse data and modules we already have. No hardware. Ordered by priority.

## A1. Production hardening (do first — protects what already works)
- **Observability** — there is currently no Sentry/metrics/structured logging (only stdlib `logging`).
  - Add Sentry (error tracking) to `backend/app/main.py`.
  - Add structured JSON logging.
  - Expose `/metrics` (prometheus-client) and alert on the existing `/api/v1/health`.
- **API security hardening** — no rate limiting exists today.
  - Add `slowapi` rate limits on `/auth/login` (brute force) and `/webhooks/whatsapp`.
  - Verify the Meta webhook signature in `whatsapp/controllers/webhook.py`.
  - Confirm prod `JWT_SECRET_KEY` is not the docker-compose placeholder.
- **Backup & disaster recovery** — automated nightly Postgres backup off the VPS + a documented restore drill (`docs/VPS_OPERATIONS_GUIDE.md`).
- **2FA + admin audit viewer** — MFA for admin/finance users; an admin-facing UI over the existing `AuditLog`.

## A2. SLA engine + escalation
`MaintenanceContract.response_time_sla_minutes` is stored but **not enforced**.
- Add an SLA clock to emergency/breakdown work orders.
- On breach: notify supervisor, optionally reassign, surface in dashboard.
- Hooks: `work_orders/services/emergency.py`, `_shared/scheduler.py`.

## A3. Heuristic predictive maintenance (v1 — no IoT needed)
We already store full work-order history per elevator.
- Scoring job that flags elevators trending toward failure from **visit history + breakdown frequency + age + brand**.
- Suggest bringing forward the next preventive visit.
- Hook: `_shared/scheduler.py` + dashboard surface.
- (This is the realistic precursor to true sensor-based prediction in Part B.)

## A4. Multi-channel notifications
Today: WhatsApp + Expo push only — single-channel risk for emergencies.
- Add **SMS fallback** (KSA SMS gateway) for emergency/critical events.
- Add **email** for invoices/contracts.
- Reuse the existing message-row tracking pattern (every send creates a row).

## A5. Analytics & BI depth
Deepen the dashboard from counts → real KPIs:
- MTBF / MTTR per elevator and per brand.
- Technician productivity, SLA compliance %, contract renewal/churn rate.
- Revenue per site / per contract type.
- Hook: `dashboard/` module.

## A6. Business automation
- **Contract renewal automation** — at 30/7/1 days (already notified), auto-generate a renewal quote through the sales pipeline.
- **Statutory inspection auto-scheduling** — auto-schedule mandatory inspections from `compliance/` cert expiry + a regulator-ready audit export.
- **Spare-parts reorder signals** — link parts consumption to stock levels; warn before dispatch stockouts.

## A7. Customer-experience (backend support)
- Live ETA endpoint for the customer tracking screen (GPS already captured).
- In-app emergency button wired to the existing auto-work-order/emergency path.
- Self-book maintenance request endpoint.

## A8. Quality
- **Incident / accident register** — formal safety-event reporting + investigation workflow, immutable audit (separate from breakdowns).
- Extend integration tests for every new flow above (we already have 62; the CI smoke gate enforces zero-500 + route count).

---

# PART B — Hard / longer-term (needs hardware or accumulated data)

This is the layer that turns ELMS from a service ERP into a true elevator platform — but
it depends on **physical devices, controller-vendor cooperation, or telemetry we don't yet have**.
Today ELMS only knows about elevators through humans (visits, calls). These items make the
elevators report on themselves.

## B1. IoT / remote monitoring  ⚠️ hardware-dependent
- Install IoT gateways on elevator controllers to stream telemetry: door cycles, run count,
  motor temp/current, vibration, leveling errors, trip counts, fault codes.
- New `backend/app/monitoring/` module + an MQTT/HTTP ingestion endpoint.
- Time-series storage (TimescaleDB or InfluxDB alongside Postgres).
- **Why hard now:** requires hardware procurement, per-controller integration (Otis/KONE/Schindler
  protocols differ and many are proprietary), site visits to install, and connectivity per building.

## B2. Automatic entrapment / fault detection  ⚠️ depends on B1
- When telemetry or a controller fault signals stuck passengers, **auto-create a critical
  breakdown work order** and fire WhatsApp/SMS before anyone calls.
- Reuses the existing emergency path — but **cannot function without B1's live signal.**
- Highest safety value; blocked on hardware.

## B3. True predictive maintenance (ML)  ⚠️ depends on B1 + time
- ML models on accumulated sensor telemetry to predict component failure.
- **Why hard now:** needs months of real telemetry before models are meaningful.
  The heuristic version (A3) is the bridge until then.

## B4. Real-time elevator health dashboard  ⚠️ depends on B1
- Per-`ELV` live health tile (in service / degraded / down) driven by device telemetry,
  not human reports.

---

## Suggested sequencing
1. **Part A1** (hardening) — ~2–3 weeks, protects the live system.
2. **Part A2–A3** (SLA engine + heuristic predictive) — high operational value, no hardware.
3. **Part A4–A8** — continuous improvement.
4. **Part B** — start a hardware pilot on a few elevators in parallel; expand once B1 is proven.

**One line:** finish making the software bulletproof and intelligent with the data we already
have (Part A), then connect to the elevators themselves once hardware is in place (Part B).
