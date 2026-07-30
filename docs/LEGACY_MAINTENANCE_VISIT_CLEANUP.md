# Legacy MaintenanceVisit Cleanup Guide
# دليل تنظيف MaintenanceVisit القديم

## Status: 🔄 IN PROGRESS

This document tracks the legacy MaintenanceVisit references that will be removed in v2.0.

---

## What's Been Done ✅

### Frontend Cleanup
- ✅ Removed `maintenanceVisitsApi` from AdminPortal
- ✅ Removed `MaintenanceVisit` type definitions
- ✅ Removed `MaintenanceVisitStatus` enum
- ✅ Migrated Schedule.tsx to use WorkOrders
- ✅ Removed MaintenanceTab.tsx

### Backend Deprecation
- ✅ Marked MaintenanceVisit model as deprecated
- ✅ Added deprecation notices to maintenance.py
- ✅ Marked MaintenanceVisitBase schema as deprecated
- ✅ Deprecated 3 endpoints in technicians/visits.py

---

## What Still Uses MaintenanceVisit ⚠️

### Services Requiring Migration (v2.0)

#### 1. **visit_scheduler.py** 🔴 HIGH PRIORITY
**File:** `backend/app/services/visit_scheduler.py`

**Usage:**
```python
from app.models.maintenance import MaintenanceVisit

overdue_visits = db.query(MaintenanceVisit).filter(
    MaintenanceVisit.status == "scheduled",
    MaintenanceVisit.scheduled_date < today
).all()
```

**Migration Plan:**
- Replace `MaintenanceVisit` queries with `WorkOrder` queries
- Filter by `WorkOrder.type == 'maintenance_visit'` or similar
- Update date fields (scheduled_date → scheduled_start)
- Update time fields (scheduled_time_start → scheduled_start as datetime)

**Functions to Update:**
- `generate_all_active_contracts()`
- `get_today_visits()`
- Methods using scheduled_date, scheduled_time_start

---

#### 2. **notification_service.py** 🟡 MEDIUM PRIORITY
**File:** `backend/app/services/notification_service.py`

**Usage:**
```python
from app.models.maintenance import MaintenanceVisit

upcoming_visits = db.query(MaintenanceVisit).filter(
    MaintenanceVisit.contract_id == contract.id,
    MaintenanceVisit.scheduled_date == notification_date,
    MaintenanceVisit.status.in_(["scheduled", "pending"]),
).all()
```

**Migration Plan:**
- Replace with WorkOrder queries
- Use contract_id relationships
- Status mapping: "scheduled"/"pending" → use WorkOrder statuses

**Functions to Update:**
- `send_maintenance_notifications()`
- Any daily/weekly notification cron jobs

---

#### 3. **monthly_distribution_service.py** 🟡 MEDIUM PRIORITY
**File:** `backend/app/services/monthly_distribution_service.py`

**Usage:**
- Imports MaintenanceVisit (may or may not be actively used)
- Need to verify actual usage

**Action:**
- Remove import if not used
- If used, migrate to WorkOrder

---

#### 4. **team_visit_distributor.py** 🟡 MEDIUM PRIORITY
**File:** `backend/app/services/team_visit_distributor.py`

**Usage:**
- Imports MaintenanceVisit
- Likely distributes visits to teams

**Migration Plan:**
- Replace MaintenanceVisit queries with WorkOrder queries
- Update assignment logic

---

### Migration Scripts (Can be Archived)

**Files to Archive in v2.0:**
```
backend/scripts/regenerate_maintenance_visits.py
backend/scripts/reset_work_orders.py (if only resets MaintenanceVisit)
```

---

### Database Migrations to Keep for Now

**Historical migrations (do not delete, needed for existing databases):**
```
backend/alembic/versions/a1b2c3d4e5f6_add_visit_type_and_site_to_visits.py
backend/alembic/versions/add_month_name_to_maintenance_visits.py
backend/alembic/versions/c3d4e5f6g7h8_add_gps_and_review_fields_to_visits.py
```

**New migration for v2.0 (to be created):**
```
backend/alembic/versions/TIMESTAMP_remove_maintenance_visits.py
```

This will:
1. Drop foreign key constraints
2. Drop `maintenance_visits` table
3. Drop `maintenance_plans` table (if not used)
4. Drop `maintenance_visit_checklist_items` table
5. Drop related columns from work_orders

---

## Models Still Exported (Backward Compatibility)

**File:** `backend/app/models/__init__.py`

Keep these exports for v1.x (remove in v2.0):
```python
from app.models.maintenance import (
    MaintenancePlan,           # ⚠️ Remove in v2.0
    MaintenanceVisit,          # ⚠️ Remove in v2.0
    MaintenanceChecklist,      # Keep - used by WorkOrder
    MaintenanceChecklistItem,  # Keep - used by WorkOrder
    MaintenanceVisitChecklistItem,  # ⚠️ Remove in v2.0
)
```

---

## Database Schema Changes Needed (v2.0)

### Current State
```sql
-- These tables will be dropped in v2.0
TABLE maintenance_visits
TABLE maintenance_plans
TABLE maintenance_visit_checklist_items

-- These will remain
TABLE maintenance_checklists
TABLE maintenance_checklist_items
```

### After v2.0 Migration
```sql
-- work_orders.related_maintenance_visit_id will be removed
-- work_orders.maintenance_visit relationship will be removed
```

---

## API Endpoints Status

### Deprecated (v1.x - Still Functional)
```
GET    /technicians/{technician_id}/visits/today
GET    /technicians/{technician_id}/visits/history
PUT    /technicians/{technician_id}/visits/{visit_id}/status
GET    /maintenance/visits
GET    /maintenance/contracts/{contract_id}/visits
POST   /maintenance/contracts/{contract_id}/generate-visits
```

**Removal Date:** v2.0
**Warnings:** ✅ Added to docstrings

### Replacement Endpoints (Use These Now)
```
GET    /work-orders/my-tasks                    (replaces visits/today)
GET    /work-orders/{id}/history               (replaces visits/history)
PUT    /work-orders/{id}                       (replaces visits/{id}/status)
GET    /work-orders/                           (replaces /maintenance/visits)
POST   /work-orders/                           (generate work orders)
```

---

## Checklist for v2.0 Release

### Code Cleanup
- [ ] Remove MaintenanceVisit model from models/maintenance.py
- [ ] Remove MaintenanceVisitChecklistItem model
- [ ] Remove MaintenancePlan model (if not used)
- [ ] Remove MaintenanceVisitBase, MaintenanceVisitCreate, MaintenanceVisitUpdate schemas
- [ ] Remove MaintenanceVisit imports from __init__.py
- [ ] Update service imports in:
  - [ ] visit_scheduler.py
  - [ ] notification_service.py
  - [ ] monthly_distribution_service.py
  - [ ] team_visit_distributor.py
  - [ ] Any other services using MaintenanceVisit

### Endpoint Cleanup
- [ ] Remove routes in technicians/visits.py
- [ ] Remove /maintenance/visits endpoints
- [ ] Remove /maintenance/contracts/{id}/visits endpoints

### Migration Scripts
- [ ] Create alembic migration to drop tables
- [ ] Archive regenerate_maintenance_visits.py
- [ ] Archive reset_work_orders.py

### Tests
- [ ] Remove test_maintenance_api.py
- [ ] Remove test_team_visit_distributor.py (if only tests MaintenanceVisit)

### Documentation
- [ ] Update API docs
- [ ] Update database schema docs
- [ ] Remove MaintenanceVisit from learning guides

---

## Data Migration (Optional)

If you want to preserve historical data:

```python
# Create a migration script that copies MaintenanceVisit → WorkOrder
# Optionally archive old data to separate table

# Example:
# 1. Copy all MaintenanceVisit records to WorkOrder with type='maintenance_visit'
# 2. Archive MaintenanceVisit data (optional)
# 3. Drop maintenance_visits table
```

---

## Backward Compatibility Notes

### For External Systems
If any external systems call the old MaintenanceVisit endpoints:

**v1.x:** Endpoints still work (with deprecation warnings)
**v1.x → v2.0:** Provide migration period (e.g., 3 months)
**v2.0:** Endpoints removed, must use WorkOrder APIs

---

## Timeline Recommendation

### v1.x (Current)
- ✅ Frontend cleanup (DONE)
- ✅ Endpoints deprecated (DONE)
- ✅ Documentation updated (DONE)
- Users have full migration period

### v1.1-v1.9 (Planned)
- Services gradually migrated
- Migration warnings added to logs
- Monitoring for old endpoint usage

### v2.0 (Major Release)
- All MaintenanceVisit code removed
- Database migration runs
- Historical data archived (optional)

---

## Related Documentation

- **[MIGRATION_CLEANUP_COMPLETED.md](MIGRATION_CLEANUP_COMPLETED.md)** - Frontend migration status
- **[CODE_REVIEW_BEST_PRACTICES.md](CODE_REVIEW_BEST_PRACTICES.md)** - Architecture review
- **[LEARNING_GUIDE.md](LEARNING_GUIDE.md)** - System architecture

---

## Questions & Decisions Needed

1. **Should we archive MaintenanceVisit data?**
   - Option A: Delete completely
   - Option B: Archive to separate table
   - **Recommendation:** Archive for compliance/audit

2. **When should v2.0 be released?**
   - After all services migrated
   - After sufficient migration warning period
   - **Recommendation:** 3-4 months after v1.0

3. **Should we provide data migration scripts?**
   - Automatically copy MaintenanceVisit → WorkOrder
   - **Recommendation:** Yes, for data integrity

---

## Next Steps

1. ✅ Frontend cleanup (COMPLETED)
2. ⏳ Service migration (START HERE)
3. ⏳ Endpoint cleanup
4. ⏳ Database migration
5. ⏳ v2.0 release

---

**Last Updated:** 2026-02-08
**Status:** Migration Plan Created, Implementation in Progress
**Target:** v2.0 Release (Timeline TBD)
