# Migration Plan: MaintenanceVisit → WorkOrder
# خطة الهجرة: MaintenanceVisit → WorkOrder

## Executive Summary

The system is transitioning from the `MaintenanceVisit` model to the unified `WorkOrder` model. This document maps all existing `MaintenanceVisit` references and identifies which components need to be updated or removed.

---

## 1. Backend Analysis

### 1.1 Active Endpoints Using MaintenanceVisit

**Status: ⚠️ STILL ACTIVE - Need to migrate or deprecate**

| File | Endpoint | Function | Status |
|------|----------|----------|--------|
| `technicians/visits.py` | `GET /technicians/{id}/visits/today` | `get_technician_today_visits()` | ⚠️ DEPRECATED - Replaced by `/work-orders/my-tasks` |
| `technicians/visits.py` | `GET /technicians/{id}/visits/history` | `get_technician_visit_history()` | ⚠️ DEPRECATED - Replaced by `/work-orders/{id}/history` |
| `technicians/visits.py` | `PUT /technicians/{id}/visits/{id}/status` | `update_visit_status()` | ⚠️ DEPRECATED - Use work order endpoints |
| `maintenance/contracts.py` | `GET /maintenance/contracts/{id}/visits` | `get_contract_visits()` | ⚠️ DEPRECATED - Not used |
| `maintenance/contracts.py` | `POST /maintenance/contracts/{id}/generate-visits` | `generate_visits()` | ⚠️ DEPRECATED - Replaced by work order generation |
| `maintenance/stats.py` | Visit-related endpoints | Stats queries | ⚠️ DEPRECATED - Stats now use WorkOrder |

### 1.2 Models Using MaintenanceVisit

**File:** `backend/app/models/maintenance.py`

```python
class MaintenanceVisit(Base, TimestampMixin):
    """A scheduled or completed maintenance visit"""
    # This is now replaced by WorkOrder model
```

**Relationships:**
- `maintenance_plan` → `MaintenancePlan` (still used)
- `elevator` → `Elevator` (still used)
- `site` → `Site` (still used)
- `assigned_team` → `TechnicianTeam` (still used)
- `work_order` → `WorkOrder` (legacy link)

### 1.3 Services Using MaintenanceVisit

| Service | Purpose | Status |
|---------|---------|--------|
| `monthly_distribution_service.py` | Distributes visits to teams | ⚠️ USES BOTH - Needs update |
| `visit_scheduler.py` | Generates maintenance visits | ⚠️ USES BOTH - Needs update |
| `team_visit_distributor.py` | Distributes visits by team | ⚠️ USES BOTH - Needs update |
| `notification_service.py` | Sends visit notifications | ⚠️ USES BOTH - Needs update |

---

## 2. Frontend (AdminPortal) Analysis

### 2.1 Components Using MaintenanceVisit

#### 🔴 HIGH PRIORITY - Direct Usage

**File:** `AdminPortal/src/pages/schedule/Schedule.tsx`
- **Import:** `import { maintenanceVisitsApi, ... }`
- **Usage:** Uses `maintenanceVisitsApi.getAll()` to fetch visits for calendar view
- **Endpoint:** `GET /maintenance/visits`
- **Function:** Calendar display, filtering by technician/team, status tracking

**Questions for User:**
- ❓ Should we keep the Schedule page showing maintenance visits?
- ❓ Or migrate it to show WorkOrders instead?
- ❓ Do you want to keep both views?

---

#### 🟡 MEDIUM PRIORITY - Indirect Usage

**File:** `AdminPortal/src/pages/customers/dialogs/MaintenanceTab.tsx`
- **Usage:** Fetches contract visits via `apiClient.get(/maintenance/contracts/{id})`
- **Type:** Local interface `MaintenanceVisit` (not imported from API)
- **Function:** Shows maintenance history for a customer

**Questions for User:**
- ❓ Should this show WorkOrders instead?
- ❓ Or keep it showing historical MaintenanceVisits?

---

#### 🟢 LOW PRIORITY - Type Definition Only

**File:** `AdminPortal/src/types/index.ts`
- **Contains:** `MaintenanceVisit` type definition
- **Status:** Only imported in above components
- **Action:** Remove after components are updated

---

### 2.2 API Client

**File:** `AdminPortal/src/api/index.ts`
- **Export:** `maintenanceVisitsApi`
- **Functions:**
  - `getAll()` → GET `/maintenance/visits`
  - `getByContractId()` → GET `/maintenance/contracts/{id}/visits`
  - `generateVisits()` → POST `/maintenance/contracts/{id}/generate-visits`

---

## 3. Mobile App Analysis

### 3.1 Mobile App - Visits References

**Status: ✅ ALREADY MIGRATED**

The mobile app already uses `workOrdersApi` for today's tasks:
- Uses `API_ENDPOINTS.WORK_ORDERS.MY_TASKS` ✅
- Uses `API_ENDPOINTS.WORK_ORDERS.MY_STATS` ✅
- Uses work order status transitions ✅

No changes needed in mobile app.

---

## 4. Database References

### 4.1 Models Still Linked to MaintenanceVisit

```python
# models/work_order.py
related_maintenance_visit_id = Column(GUID, ForeignKey("maintenance_visits.id", ondelete="SET NULL"))
maintenance_visit = relationship("MaintenanceVisit", back_populates="work_order")

# models/maintenance.py
class MaintenanceVisit:
    work_order = relationship("WorkOrder", back_populates="maintenance_visit")
```

**Status:** These links exist for **backward compatibility only**. The system now primarily uses `WorkOrder`.

---

## 5. Removal Plan - Step by Step

### Phase 1: Update Backend Endpoints (Required)

#### Option A: Full Deprecation (Recommended)
```python
# Mark as deprecated in technicians/visits.py
@router.get("/{technician_id}/visits/today")
def get_technician_today_visits(...):
    """
    ⚠️ DEPRECATED: Use GET /work-orders/my-tasks instead
    This endpoint will be removed in v2.0
    """
```

#### Option B: Redirect to WorkOrders
```python
@router.get("/{technician_id}/visits/today")
def get_technician_today_visits(...):
    # Fetch from WorkOrder table instead
    # Return WorkOrder data in MaintenanceVisit format
```

**Recommendation:** Option A (Full Deprecation) - Mobile app already uses `/work-orders/my-tasks`

### Phase 2: Update Frontend Components (Required if keeping features)

#### For Schedule.tsx:
```typescript
// Option A: Remove the page entirely
// Delete: AdminPortal/src/pages/schedule/Schedule.tsx

// Option B: Migrate to WorkOrders
import { workOrdersApi } from '../../api';
// Fetch WorkOrders instead of MaintenanceVisits
```

**Decision Needed:** Keep or Remove?

#### For MaintenanceTab.tsx:
```typescript
// Option A: Show WorkOrders for customer
// Option B: Show historical MaintenanceVisits (read-only)
```

**Decision Needed:** Update or Remove?

### Phase 3: Clean Up API

#### Remove from AdminPortal/src/api/index.ts:
```typescript
// DELETE this section:
export const maintenanceVisitsApi = {
  getAll: (...) => { ... },
  getByContractId: (...) => { ... },
  generateVisits: (...) => { ... },
};
```

#### Remove from AdminPortal/src/types/index.ts:
```typescript
// DELETE: MaintenanceVisit interface
export interface MaintenanceVisit { ... }
```

### Phase 4: Database Migration (Optional - For Data Cleanup)

**Only if you want to remove the table entirely:**

```sql
-- Create migration file:
-- alembic/versions/TIMESTAMP_remove_maintenance_visits.py

ALTER TABLE work_orders DROP CONSTRAINT fk_related_maintenance_visit_id;
ALTER TABLE maintenance_visits DROP CONSTRAINT fk_work_order;
DROP TABLE maintenance_visits;
DROP TABLE maintenance_plans;  -- If not needed
```

---

## 6. Files That Can Be Deleted

After migration, these files can be deleted:

### Backend
- `backend/app/api/endpoints/maintenance/visits.py` (if exists)
- `backend/tests/test_maintenance_api.py` (if exists)
- References in: `models/maintenance.py` (MaintenanceVisit class)

### Frontend
- `AdminPortal/src/pages/schedule/Schedule.tsx` (optional - depends on your decision)
- `AdminPortal/src/pages/customers/dialogs/MaintenanceTab.tsx` (optional - depends on your decision)

### Migration Scripts
- `backend/scripts/regenerate_maintenance_visits.py`
- `backend/alembic/versions/add_month_name_to_maintenance_visits.py`
- `backend/alembic/versions/a1b2c3d4e5f6_add_visit_type_and_site_to_visits.py`

---

## 7. Decision Matrix

### For AdminPortal Schedule Page

| Decision | Action | Impact |
|----------|--------|--------|
| **Keep** | Migrate to use `workOrdersApi` | Shows current work orders in calendar |
| **Remove** | Delete `Schedule.tsx` | Remove schedule feature from admin |
| **Archive** | Keep but mark as read-only | Shows historical data only |

### For MaintenanceTab Component

| Decision | Action | Impact |
|----------|--------|--------|
| **Keep** | Update to show WorkOrders | Shows current work orders by contract |
| **Remove** | Delete `MaintenanceTab.tsx` | Remove maintenance history from customers |
| **Keep as-is** | Leave using old API | Continues to work until API removed |

### For Backend Endpoints

| Decision | Action | Impact |
|----------|--------|--------|
| **Deprecate** | Mark as `@deprecated` | Mobile app already migrated, safe to remove |
| **Redirect** | Fetch from WorkOrder table | Maintains backward compatibility |
| **Remove** | Delete completely | Breaking change for any external integrations |

---

## 8. Summary of Changes

### To Remove (if user wants full cleanup):
- [ ] `models/maintenance.py` - `MaintenanceVisit` class
- [ ] API endpoints in `technicians/visits.py`
- [ ] `AdminPortal/src/api/index.ts` - `maintenanceVisitsApi`
- [ ] `AdminPortal/src/types/index.ts` - `MaintenanceVisit` interface
- [ ] `AdminPortal/src/pages/schedule/Schedule.tsx` (optional)
- [ ] `AdminPortal/src/pages/customers/dialogs/MaintenanceTab.tsx` (optional)

### To Keep (for backward compatibility):
- [ ] Links in `WorkOrder.related_maintenance_visit_id` (for historical data)
- [ ] Links in `MaintenanceVisit` (read-only, legacy data)

---

## Next Steps

**Please provide answers to these questions:**

1. **Schedule Page:** Keep, Remove, or Migrate?
2. **MaintenanceTab:** Keep, Remove, or Migrate?
3. **Backend Endpoints:** Fully Deprecate or Redirect to WorkOrders?
4. **Timeline:** Remove immediately or keep for compatibility?

Once you answer, I can:
1. ✅ Remove the selected components
2. ✅ Update remaining components
3. ✅ Clean up API definitions
4. ✅ Remove unused types
