# Phase 2: Elevator Distribution System (نظام توزيع المصاعد)

## Overview
Implement the elevator distribution screen that allows admins to select elevators by district/location and assign them to technicians.

## Goal
Admin can:
- View all "new" (unassigned) elevators
- Filter by district, location, customer, date range
- Select multiple elevators
- Assign selected elevators to a technician

## UI Design

### Distribution Screen (after clicking "Distribute New Elevators")

```
┌─────────────────────────────────────────────────────────────┐
│  ← رجوع              توزيع المصاعد                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📥 المصاعد الجديدة (23)                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔍 فلتر                                             │   │
│  │ الحي: [الكل ▼]  الموقع: [الكل ▼]  العميل: [الكل ▼] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────── حي النرجس (8 مصاعد) ─────────────────     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑️ برج السلام                          3 مصاعد     │   │
│  │ ☑️ عمارة النور                         2 مصاعد     │   │
│  │ ☑️ مجمع الفيصل                         3 مصاعد     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────── حي الملقا (7 مصاعد) ──────────────────     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑️ برج الياسمين                        4 مصاعد     │   │
│  │ ☐ عمارة الراشد                         3 مصاعد     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  📊 المحدد: 15 مصعد                                        │
│                                                             │
│  👤 وزّع على: [أحمد محمد (النرجس، الملقا) ▼]               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    [✓ وزّع الآن]                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Backend Changes Required

### 1. New API Endpoint: `/api/maintenance/elevators/unassigned`

Get elevators that need assignment for a given period.

**Request:**
```
GET /api/maintenance/elevators/unassigned?month=2&year=2024&district_id=xxx
```

**Response:**
```json
{
  "districts": [
    {
      "id": "uuid",
      "name": "النرجس",
      "locations": [
        {
          "id": "uuid",
          "name": "برج السلام",
          "customer_name": "شركة الأمل",
          "elevators_count": 3,
          "elevators": [
            {
              "id": "uuid",
              "code": "EL-001",
              "brand": "أوتيس",
              "next_maintenance_date": "2024-02-15"
            }
          ]
        }
      ],
      "total_elevators": 8
    }
  ],
  "total_unassigned": 23
}
```

### 2. New API Endpoint: `/api/maintenance/work-orders/bulk-assign`

Assign multiple elevators to a technician.

**Request:**
```json
{
  "elevator_ids": ["uuid1", "uuid2", "uuid3"],
  "technician_id": "uuid",
  "month": 2,
  "year": 2024
}
```

**Response:**
```json
{
  "success": true,
  "work_orders_created": 15,
  "technician_name": "أحمد محمد",
  "message": "تم توزيع 15 مصعد على أحمد محمد"
}
```

### 3. Backend Service Changes

#### `backend/app/services/work_order_service.py`
Add new methods:
```python
def get_unassigned_elevators(
    self,
    month: int,
    year: int,
    district_id: Optional[UUID] = None,
    customer_id: Optional[UUID] = None
) -> List[Dict]:
    """Get elevators that need assignment grouped by district."""

def bulk_assign_elevators(
    self,
    elevator_ids: List[UUID],
    technician_id: UUID,
    month: int,
    year: int,
    created_by: UUID
) -> Dict:
    """Assign multiple elevators to a technician."""
```

## Frontend Changes Required

### 1. New Page: `DistributeElevators.tsx`

Location: `AdminPortal/src/pages/maintenance/DistributeElevators.tsx`

Features:
- Filter panel (district, location, customer, date range)
- Grouped list by district with expandable locations
- Checkbox selection (individual + select all per group)
- Technician selector dropdown (shows technician's assigned districts)
- Summary bar showing selected count
- Distribute button

### 2. New Components

#### `ElevatorDistributionList.tsx`
- Displays grouped elevators by district
- Expandable sections
- Checkbox for selection

#### `TechnicianSelector.tsx`
- Dropdown with technician list
- Shows technician's assigned districts
- Shows current workload (X elevators assigned this month)

### 3. New Types

```typescript
export interface UnassignedElevatorsResponse {
  districts: DistrictWithElevators[];
  totalUnassigned: number;
}

export interface DistrictWithElevators {
  id: string;
  name: string;
  locations: LocationWithElevators[];
  totalElevators: number;
}

export interface LocationWithElevators {
  id: string;
  name: string;
  customerName: string;
  elevatorsCount: number;
  elevators: ElevatorForDistribution[];
}

export interface ElevatorForDistribution {
  id: string;
  code: string;
  brand: string;
  nextMaintenanceDate: string;
}

export interface BulkAssignRequest {
  elevatorIds: string[];
  technicianId: string;
  month: number;
  year: number;
}

export interface BulkAssignResponse {
  success: boolean;
  workOrdersCreated: number;
  technicianName: string;
  message: string;
}
```

### 4. New API Functions

```typescript
export const workOrdersApi = {
  // ... existing
  getUnassignedElevators: (params: { month: number; year: number; districtId?: string }) =>
    api.get<UnassignedElevatorsResponse>('/maintenance/elevators/unassigned', params),

  bulkAssign: (data: BulkAssignRequest) =>
    api.post<BulkAssignResponse>('/maintenance/work-orders/bulk-assign', data),
};
```

### 5. Route Configuration

Add new route in `App.tsx`:
```tsx
<Route path="/maintenance/distribute" element={<DistributeElevators />} />
```

## Success Message Dialog

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                         ✅                                  │
│                                                             │
│                  تم التوزيع بنجاح!                         │
│                                                             │
│           15 مصعد ← أحمد محمد                              │
│                                                             │
│        ┌─────────────────────────────┐                     │
│        │      [👍 تم]                │                     │
│        └─────────────────────────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Acceptance Criteria

1. [ ] "Distribute New Elevators" button visible on WorkOrders page when new count > 0
2. [ ] Filter by district works correctly
3. [ ] Filter by location works correctly
4. [ ] Elevators grouped by district, then by location
5. [ ] Select all per district/location works
6. [ ] Technician dropdown shows relevant technicians
7. [ ] Bulk assignment creates work orders correctly
8. [ ] Success dialog shows count and technician name
9. [ ] After distribution, "new" count updates immediately
10. [ ] Arabic labels and RTL layout correct

## Files to Create/Modify

### New Files:
- `AdminPortal/src/pages/maintenance/DistributeElevators.tsx`
- `AdminPortal/src/components/work-orders/ElevatorDistributionList.tsx`
- `AdminPortal/src/components/work-orders/TechnicianSelector.tsx`
- `backend/app/api/endpoints/maintenance/distribution.py`

### Modified Files:
- `backend/app/services/work_order_service.py`
- `backend/app/api/router.py`
- `AdminPortal/src/App.tsx`
- `AdminPortal/src/types/index.ts`
- `AdminPortal/src/api/index.ts`
- `AdminPortal/src/i18n/ar.ts`

## Dependencies
- Phase 1 (Status Cards) - needed for the "new" status count

## Estimated Effort
- Backend: 4-5 hours
- Frontend: 6-8 hours
- Testing: 3 hours
