# Phase 3: Technician Workload & Assignment View (عرض حمل العمل للفنيين)

## Overview
Implement the technician workload view that shows each technician's assigned elevators with progress bars and allows workload management.

## Goal
Admin can:
- See all technicians with their assigned districts
- See progress bars showing completion rate (X/Y completed)
- Click on a technician to see their assigned elevators
- Reassign elevators between technicians if needed

## UI Design

### Technicians Workload Section (on WorkOrders page)

```
┌─────────────────────────────────────────────────────────────┐
│  👥 توزيع الفنيين                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 أحمد محمد                                        │   │
│  │ 📍 النرجس، الملقا                                   │   │
│  │                                                      │   │
│  │ ████████████████░░░░  18/24 مكتمل   [عرض التفاصيل]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 خالد علي                                         │   │
│  │ 📍 العليا، السليمانية                               │   │
│  │                                                      │   │
│  │ ██████████░░░░░░░░░░  10/20 مكتمل   [عرض التفاصيل]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 محمد سعد                                         │   │
│  │ 📍 الياسمين، الروضة                                 │   │
│  │                                                      │   │
│  │ █████░░░░░░░░░░░░░░░  5/18 مكتمل    [عرض التفاصيل]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Technician Detail Dialog

```
┌─────────────────────────────────────────────────────────────┐
│  👤 أحمد محمد - فبراير 2024                          ✕     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 الملخص                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📥 6 معلق  │  ⚡ 2 جاري  │  ✅ 16 مكتمل          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📍 الأحياء المخصصة: النرجس، الملقا                       │
│                                                             │
│  ━━━━━━━━━━━━━━━ المصاعد المعلقة ━━━━━━━━━━━━━━━━━━━━━━   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🛗 برج السلام - مصعد 1                              │   │
│  │ 📍 النرجس  •  أوتيس  •  8 طوابق                    │   │
│  │ 📅 مجدول: 15 فبراير                                │   │
│  │                                     [نقل لفني آخر]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🛗 برج السلام - مصعد 2                              │   │
│  │ 📍 النرجس  •  أوتيس  •  8 طوابق                    │   │
│  │ 📅 مجدول: 15 فبراير                                │   │
│  │                                     [نقل لفني آخر]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ━━━━━━━━━━━━━━━ المصاعد الجارية ━━━━━━━━━━━━━━━━━━━━━━   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🛗 عمارة النور - مصعد 1                    ⚡ جاري │   │
│  │ 📍 النرجس  •  شندلر  •  5 طوابق                    │   │
│  │ ⏱️ بدأ: 9:30 ص (منذ 45 دقيقة)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                          [إغلاق]           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Backend Changes Required

### 1. New API Endpoint: `/api/technicians/workload-summary`

Get workload summary for all technicians for a period.

**Request:**
```
GET /api/technicians/workload-summary?month=2&year=2024
```

**Response:**
```json
{
  "technicians": [
    {
      "id": "uuid",
      "name": "أحمد محمد",
      "phone": "+966501234567",
      "districts": ["النرجس", "الملقا"],
      "stats": {
        "total": 24,
        "pending": 6,
        "in_progress": 2,
        "completed": 16
      },
      "completion_percentage": 75
    }
  ]
}
```

### 2. New API Endpoint: `/api/technicians/{id}/work-orders`

Get detailed work orders for a specific technician.

**Request:**
```
GET /api/technicians/{id}/work-orders?month=2&year=2024&status=pending
```

**Response:**
```json
{
  "technician": {
    "id": "uuid",
    "name": "أحمد محمد",
    "districts": ["النرجس", "الملقا"]
  },
  "stats": {
    "total": 24,
    "pending": 6,
    "in_progress": 2,
    "completed": 16
  },
  "work_orders": [
    {
      "id": "uuid",
      "work_order_number": "PM-2024-00123",
      "elevator": {
        "id": "uuid",
        "code": "EL-001",
        "brand": "أوتيس",
        "floors_count": 8
      },
      "site": {
        "id": "uuid",
        "name": "برج السلام",
        "district": "النرجس"
      },
      "status": "assigned",
      "scheduled_date": "2024-02-15",
      "started_at": null
    }
  ]
}
```

### 3. New API Endpoint: `/api/work-orders/{id}/reassign`

Reassign a work order to a different technician.

**Request:**
```json
{
  "new_technician_id": "uuid",
  "reason": "تعديل التوزيع"
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم نقل أمر العمل إلى محمد سعد"
}
```

## Frontend Changes Required

### 1. New Component: `TechnicianWorkloadCard.tsx`

Location: `AdminPortal/src/components/work-orders/TechnicianWorkloadCard.tsx`

Features:
- Display technician name, photo (optional), districts
- Progress bar with completion percentage
- Color coding based on completion (red < 50%, yellow 50-80%, green > 80%)
- Click to open detail dialog

### 2. New Component: `TechnicianWorkloadList.tsx`

Location: `AdminPortal/src/components/work-orders/TechnicianWorkloadList.tsx`

Features:
- List of TechnicianWorkloadCard components
- Sort by: completion %, total count, name
- Search by technician name

### 3. New Dialog: `TechnicianDetailDialog.tsx`

Location: `AdminPortal/src/components/work-orders/TechnicianDetailDialog.tsx`

Features:
- Summary stats at top
- Tabs or sections: Pending, In Progress, Completed
- Each work order shows elevator info, site, scheduled date
- "Reassign" button on pending work orders
- Reassign opens technician selector dialog

### 4. New Dialog: `ReassignWorkOrderDialog.tsx`

Location: `AdminPortal/src/components/work-orders/ReassignWorkOrderDialog.tsx`

Features:
- Work order info at top
- Technician selector (shows available technicians)
- Reason field (optional)
- Confirm button

### 5. New Types

```typescript
export interface TechnicianWorkload {
  id: string;
  name: string;
  phone: string;
  districts: string[];
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  completionPercentage: number;
}

export interface TechnicianWorkloadResponse {
  technicians: TechnicianWorkload[];
}

export interface TechnicianWorkOrdersResponse {
  technician: {
    id: string;
    name: string;
    districts: string[];
  };
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  workOrders: WorkOrderWithDetails[];
}

export interface WorkOrderWithDetails {
  id: string;
  workOrderNumber: string;
  elevator: {
    id: string;
    code: string;
    brand: string;
    floorsCount: number;
  };
  site: {
    id: string;
    name: string;
    district: string;
  };
  status: string;
  scheduledDate: string;
  startedAt?: string;
}

export interface ReassignRequest {
  newTechnicianId: string;
  reason?: string;
}
```

### 6. New API Functions

```typescript
export const techniciansApi = {
  // ... existing
  getWorkloadSummary: (params: { month: number; year: number }) =>
    api.get<TechnicianWorkloadResponse>('/technicians/workload-summary', params),

  getWorkOrders: (id: string, params: { month: number; year: number; status?: string }) =>
    api.get<TechnicianWorkOrdersResponse>(`/technicians/${id}/work-orders`, params),
};

export const workOrdersApi = {
  // ... existing
  reassign: (id: string, data: ReassignRequest) =>
    api.post<{ success: boolean; message: string }>(`/work-orders/${id}/reassign`, data),
};
```

## Acceptance Criteria

1. [ ] Workload cards show for all technicians with assignments
2. [ ] Progress bar accurately reflects completion percentage
3. [ ] Progress bar color changes based on percentage
4. [ ] Clicking "View Details" opens detail dialog
5. [ ] Detail dialog shows work orders grouped by status
6. [ ] "Reassign" button opens reassign dialog
7. [ ] Reassignment updates both technicians' workloads
8. [ ] Month/Year filter syncs with Phase 1 cards
9. [ ] Arabic labels and RTL layout correct
10. [ ] Loading states for all async operations

## Files to Create/Modify

### New Files:
- `AdminPortal/src/components/work-orders/TechnicianWorkloadCard.tsx`
- `AdminPortal/src/components/work-orders/TechnicianWorkloadList.tsx`
- `AdminPortal/src/components/work-orders/TechnicianDetailDialog.tsx`
- `AdminPortal/src/components/work-orders/ReassignWorkOrderDialog.tsx`
- `backend/app/api/endpoints/technicians_workload.py`

### Modified Files:
- `backend/app/api/router.py`
- `backend/app/api/endpoints/work_orders.py`
- `AdminPortal/src/pages/maintenance/WorkOrders.tsx`
- `AdminPortal/src/types/index.ts`
- `AdminPortal/src/api/index.ts`
- `AdminPortal/src/i18n/ar.ts`

## Dependencies
- Phase 1 (Status Cards) - for status consistency
- Phase 2 (Distribution) - uses same work order assignment logic

## Estimated Effort
- Backend: 4-5 hours
- Frontend: 8-10 hours
- Testing: 3 hours
