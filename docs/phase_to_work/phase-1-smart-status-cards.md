# Phase 1: Smart Status Cards Dashboard (نظام البطاقات الذكية)

## Overview
Implement the 4-status card system for work orders that provides admins with an instant overview of maintenance operations.

## Goal
Admin can see at a glance:
- How many elevators need distribution (new)
- How many are distributed to technicians
- How many are currently in progress
- How many are completed

## UI Design

```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│   23    │  │   45    │  │    8    │  │   80    │
│ جديد    │  │ موزع    │  │ جاري    │  │ مكتمل   │
│  NEW    │  │ASSIGNED │  │IN PROG  │  │COMPLETED│
└─────────┘  └─────────┘  └─────────┘  └─────────┘
```

## Status Flow

```
NEW (جديد) → ASSIGNED (موزع) → IN_PROGRESS (جاري) → COMPLETED (مكتمل)
     ↑              ↑              ↑               ↑
  elevator    admin assigns   technician      technician
  due for     to technician    starts          completes
  maintenance                   work            work
```

## Backend Changes Required

### 1. Update MaintenanceVisit Status Enum
Current statuses need mapping to new 4-status system:

| Current Status | New Status | Arabic |
|---------------|------------|--------|
| scheduled | new | جديد |
| assigned | assigned | موزع |
| in_progress | in_progress | جاري |
| completed | completed | مكتمل |
| cancelled | cancelled | ملغى |
| no_access | no_access | لا يوجد وصول |

### 2. New API Endpoint: `/api/maintenance/work-orders/status-summary`

**Response:**
```json
{
  "new": 23,
  "assigned": 45,
  "in_progress": 8,
  "completed": 80,
  "month": "فبراير",
  "year": 2024,
  "total": 156
}
```

### 3. Backend File Changes

#### `backend/app/api/endpoints/maintenance/stats.py`
Add new endpoint:
```python
@router.get("/work-orders/status-summary")
def get_work_order_status_summary(
    db: Session = Depends(get_db),
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None)
) -> Dict:
    """Get work order counts by status for dashboard cards."""
    # Implementation
```

## Frontend Changes Required

### 1. New Component: `StatusCards.tsx`

Location: `AdminPortal/src/components/work-orders/StatusCards.tsx`

```tsx
interface StatusCardsProps {
  data: {
    new: number;
    assigned: number;
    inProgress: number;
    completed: number;
  };
  onCardClick: (status: string) => void;
}
```

Features:
- 4 clickable cards with counts
- Color coding (yellow=new, blue=assigned, orange=in_progress, green=completed)
- Click to filter work orders list by status
- Arabic labels with icons

### 2. Update WorkOrders Page

Location: `AdminPortal/src/pages/maintenance/WorkOrders.tsx`

Changes:
- Add StatusCards component at top
- Add month/year selector
- Add "Distribute New Elevators" button (links to Phase 2)
- Update table to show new status format

### 3. New Types

Location: `AdminPortal/src/types/index.ts`

```typescript
export interface WorkOrderStatusSummary {
  new: number;
  assigned: number;
  inProgress: number;
  completed: number;
  month: string;
  year: number;
  total: number;
}
```

### 4. New API Function

Location: `AdminPortal/src/api/index.ts`

```typescript
export const workOrdersApi = {
  // ... existing
  getStatusSummary: (params?: { month?: number; year?: number }) =>
    api.get<WorkOrderStatusSummary>('/maintenance/work-orders/status-summary', params),
};
```

## Acceptance Criteria

1. [ ] Dashboard shows 4 status cards with real counts
2. [ ] Month/Year selector filters the data
3. [ ] Clicking a card filters the work orders table
4. [ ] Cards update in real-time when status changes
5. [ ] "New" card has warning indicator when count > 0
6. [ ] Arabic labels displayed correctly (RTL support)

## Files to Create/Modify

### New Files:
- `AdminPortal/src/components/work-orders/StatusCards.tsx`
- `AdminPortal/src/hooks/useWorkOrderStats.ts`

### Modified Files:
- `backend/app/api/endpoints/maintenance/stats.py`
- `AdminPortal/src/pages/maintenance/WorkOrders.tsx`
- `AdminPortal/src/types/index.ts`
- `AdminPortal/src/api/index.ts`
- `AdminPortal/src/i18n/ar.ts` (add translations)

## Dependencies
- None (this is the foundation phase)

## Estimated Effort
- Backend: 2-3 hours
- Frontend: 4-5 hours
- Testing: 2 hours
