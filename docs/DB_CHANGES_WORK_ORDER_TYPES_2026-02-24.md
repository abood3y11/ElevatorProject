# DB Changes: Work Order Type Canonicalization

Date: 2026-02-24  
Scope: `backend` database (`work_orders.type`)

## Why
The system now uses canonical work order types everywhere:
- `preventive_maintenance` (صيانة وقائية)
- `corrective_maintenance` (صيانة تصحيحية)
- `breakdown` (عطل طارئ)

Legacy values may still exist in production rows (`maintenance_visit`, `corrective`, `emergency`, etc.).  
This migration updates stored data to canonical values.

## Alembic Migration Added
- File: `backend/alembic/versions/8e2f9c4b1a7d_normalize_work_order_types_to_canonical.py`
- `down_revision`: `4fe56ebc3692`

## Data Transformations (Upgrade)
The migration executes:
- `maintenance_visit` -> `preventive_maintenance`
- `preventive` -> `preventive_maintenance`
- `corrective` -> `corrective_maintenance`
- `emergency` -> `breakdown`
- `installation_task` -> `installation`
- `inspection_support` -> `inspection`

## Server Deployment Steps
1. Pull latest code on server.
2. Go to backend folder:
```bash
cd /path/to/ElevatorProject/backend
```
3. Run migration:
```bash
alembic upgrade head
```
4. Validate:
```sql
SELECT type, COUNT(*) 
FROM work_orders
GROUP BY type
ORDER BY type;
```

## Manual SQL Fallback (If Alembic cannot run)
Run this in PostgreSQL:
```sql
BEGIN;

UPDATE work_orders SET type = 'preventive_maintenance' WHERE type IN ('maintenance_visit', 'preventive');
UPDATE work_orders SET type = 'corrective_maintenance' WHERE type IN ('corrective');
UPDATE work_orders SET type = 'breakdown' WHERE type IN ('emergency');
UPDATE work_orders SET type = 'installation' WHERE type IN ('installation_task');
UPDATE work_orders SET type = 'inspection' WHERE type IN ('inspection_support');

COMMIT;
```

## Notes
- No schema change (columns/indexes) in this migration; this is data normalization only.
- API layer also accepts legacy values and normalizes responses, so rollout is backward-safe.
