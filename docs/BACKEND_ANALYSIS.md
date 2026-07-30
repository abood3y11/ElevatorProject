# Backend Analysis (ELMS)

## Overview
- Framework: FastAPI with SQLAlchemy 2.x and Alembic migrations.
- Auth: JWT access/refresh tokens via `python-jose`, password hashing via `passlib[bcrypt]`.
- DB: PostgreSQL (default), `DATABASE_URL` or discrete env vars.
- Background jobs: APScheduler (asyncio) for maintenance/compliance automation.
- Realtime: WebSocket endpoints for admin updates and technician location tracking.

## Architecture Summary
- Entry point: `backend/app/main.py`.
- Config: `backend/app/core/config.py` (pydantic-settings, env-driven).
- DB: `backend/app/db/session.py` for engine/session; `backend/app/db/base_class.py` registers models for Alembic.
- API routing: `backend/app/api/router.py` aggregates endpoints under `/api/v1`.
- Domain modules: models in `backend/app/models`, schemas in `backend/app/schemas`, business logic in `backend/app/services`.

## API Surface (High-Level)
- Auth & Users: login, refresh, me, change password, user CRUD, roles.
- Customers/Sites/Elevators: CRUD, documents, status updates.
- Maintenance: contracts, plans, stats, distribution, notifications.
- Work Orders: creation, assignment, lifecycle actions, attachments, review flows.
- Compliance: dashboard, alerts, certificates, entity management.
- Installations: projects, tasks, inspections.
- Technicians: profiles, licenses, teams, leaves, visits, workload.
- Dashboard/Settings/Notifications.

## Auth & RBAC
- OAuth2 bearer token at `/api/v1/auth/login`.
- Role-based access via `RoleChecker` in `backend/app/api/deps.py`.
- Role constants in `backend/app/core/security.py`.
- Tokens include `sub`, `roles`, `type`, `exp`.

## Data Model (Representative)
- Core: `User`, `Role`, `Customer`, `Site`, `Elevator`.
- Operations: `WorkOrder`, `MaintenanceVisit`, `MaintenancePlan`, `Contract`.
- Compliance: `ComplianceCertificate`, `ComplianceAlert`, `ComplianceEntity`.
- Field ops: `Technician`, `TechnicianTeam`, `TechnicianLicense`, `SparePart`.
- Notifications and audit/billing entities present.

## Background Jobs (APScheduler)
- Monthly maintenance visit generation (1st of month).
- Work order overdue marking (daily).
- Compliance certificate expiry checks (daily).
- Overdue maintenance escalation (daily).
- Daily technician reminders and pending review alerts.

## WebSockets
- `/ws/admin/updates`: admin realtime events (work orders, emergencies).
- `/api/v1/ws/locations/{technician_id}`: technician location tracking (no auth; identifies by `technician_id`).

## Ops/Utilities
- `backend/scripts/*` contains maintenance/reset utilities.
- `backend/app/db/seed*.py` and `backend/app/scripts/seed_*.py` for data seeding.
- `backend/verify_work_orders.py` for validation (ad-hoc).

## Tests
- Present but minimal: `backend/tests/test_maintenance_api.py`, `backend/tests/test_team_visit_distributor.py`.

## Noted Risks / Gaps
- `Base.metadata.create_all` runs on startup in `main.py`; may bypass Alembic in production if left enabled.
- `SCHEDULER_ENABLED` config exists but scheduler starts unconditionally.
- Default JWT secret is hardcoded; ensure env overrides in production.
- WebSocket location tracking has no auth and uses `technician_id` as identifier.
- Global exception handler returns `str(exc)` in debug; ensure non-debug in production.
- Dev-only endpoints exist in work orders (e.g., delete/regenerate); should be guarded in production.

## Suggested Next Steps
- Decide if this analysis should be expanded into per-module deep dives (e.g., Work Orders, Maintenance, Compliance).
- If you want, I can map endpoint paths to responsibilities or produce an OpenAPI-driven endpoint inventory.
