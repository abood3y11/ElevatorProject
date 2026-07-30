# Phase 5: Emergency Work Orders & Real-time Updates (الطوارئ والتحديثات الفورية)

## Overview
Implement emergency work order handling, real-time status updates, and notification system integration.

## Goal
- Handle emergency/breakdown work orders with priority routing
- Real-time updates when technicians start/complete work
- Push notifications to admin dashboard
- Emergency technician assignment logic

## Emergency Work Order Flow

```
┌────────────────────────┐
│  بلاغ طوارئ جديد      │
│  New Emergency Report  │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ هل في فني طوارئ متاح؟  │
│ Emergency Tech Free?   │
└───────────┬────────────┘
            │
    ┌───────┴───────┐
    │               │
   نعم             لا
   Yes             No
    │               │
    ▼               ▼
┌──────────┐  ┌──────────────────┐
│ أرسل     │  │ أرسل لفني الحي   │
│ لفني     │  │ كـ urgent        │
│ الطوارئ  │  │ Send to District │
│          │  │ Tech as Urgent   │
└──────────┘  └──────────────────┘
```

## UI Design

### Emergency Alert Banner

```
┌─────────────────────────────────────────────────────────────┐
│  🚨 3 بلاغات طوارئ تحتاج انتباه                             │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 🔴 برج السلام - مصعد متوقف - منذ 15 دقيقة   [تعيين]  │ │
│  │ 🔴 عمارة النور - أشخاص محتجزين - منذ 5 دقائق [تعيين]  │ │
│  │ 🟠 مجمع الفيصل - صوت غريب - منذ 45 دقيقة    [تعيين]   │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Emergency Assignment Dialog

```
┌─────────────────────────────────────────────────────────────┐
│  🚨 تعيين بلاغ طوارئ                                   ✕    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📍 الموقع: برج السلام - حي النرجس                         │
│  🛗 المصعد: EL-001 (أوتيس - 8 طوابق)                       │
│  ⚠️ المشكلة: مصعد متوقف ولا يستجيب                         │
│  ⏱️ منذ: 15 دقيقة                                          │
│                                                             │
│  ━━━━━━━━━━━━ الفنيين المتاحين ━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⭐ أحمد محمد (فني طوارئ)                            │   │
│  │    📍 متاح الآن - 2.5 كم من الموقع                  │   │
│  │    📋 يعمل على: لا شيء                              │   │
│  │                                      [✓ تعيين]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 خالد علي (فني الحي)                              │   │
│  │    📍 في زيارة - 0.8 كم من الموقع                   │   │
│  │    📋 يعمل على: عمارة النور - مصعد 1                │   │
│  │                                      [✓ تعيين]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Real-time Status Updates

```
┌─────────────────────────────────────────────────────────────┐
│  📊 تحديثات مباشرة                                    [🔔]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚡ 9:45 ص  │ أحمد بدأ زيارة برج السلام - مصعد 1           │
│  ✅ 9:30 ص  │ خالد أنهى زيارة عمارة النور - مصعد 2         │
│  🚨 9:15 ص  │ بلاغ طوارئ جديد - مجمع الفيصل               │
│  ⚡ 9:00 ص  │ محمد بدأ زيارة برج الياسمين - مصعد 1         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Backend Changes Required

### 1. Emergency Work Order Creation

New endpoint: `/api/work-orders/emergency`

**Request:**
```json
{
  "elevator_id": "uuid",
  "issue_type": "stuck_passengers",  // or "breakdown", "noise", "door_issue"
  "description": "مصعد متوقف وهناك أشخاص بالداخل",
  "reporter_name": "أحمد المشرف",
  "reporter_phone": "+966501234567",
  "priority": "critical"  // critical, high, normal
}
```

**Response:**
```json
{
  "id": "uuid",
  "work_order_number": "EM-2024-00001",
  "status": "new",
  "priority": "critical",
  "sla_deadline": "2024-02-15T10:15:00Z",
  "suggested_technicians": [
    {
      "id": "uuid",
      "name": "أحمد محمد",
      "is_emergency_tech": true,
      "distance_km": 2.5,
      "current_status": "available"
    }
  ]
}
```

### 2. Emergency Auto-Assignment

Service method in `WorkOrderService`:

```python
def auto_assign_emergency(
    self,
    work_order_id: UUID,
    prefer_emergency_tech: bool = True
) -> Dict:
    """
    Auto-assign emergency work order using priority logic:
    1. Available emergency technician
    2. District technician (interrupt if needed)
    3. Any available technician nearby
    """
```

### 3. Real-time Updates with WebSocket

New WebSocket endpoint: `/ws/admin/updates`

**Event Types:**
```json
// Work order started
{
  "type": "work_order_started",
  "data": {
    "work_order_id": "uuid",
    "technician_name": "أحمد محمد",
    "elevator_code": "EL-001",
    "site_name": "برج السلام",
    "started_at": "2024-02-15T09:45:00Z"
  }
}

// Work order completed
{
  "type": "work_order_completed",
  "data": {
    "work_order_id": "uuid",
    "technician_name": "خالد علي",
    "elevator_code": "EL-002",
    "site_name": "عمارة النور",
    "completed_at": "2024-02-15T09:30:00Z",
    "duration_minutes": 45
  }
}

// New emergency
{
  "type": "emergency_created",
  "data": {
    "work_order_id": "uuid",
    "priority": "critical",
    "elevator_code": "EL-003",
    "site_name": "مجمع الفيصل",
    "issue_type": "stuck_passengers"
  }
}

// Status counts updated
{
  "type": "status_updated",
  "data": {
    "new": 22,
    "assigned": 46,
    "in_progress": 9,
    "completed": 81
  }
}
```

### 4. SLA Tracking

Add to WorkOrder model (already exists, enhance usage):

```python
# SLA deadlines based on priority
SLA_HOURS = {
    "critical": 2,    # People stuck
    "high": 4,        # Elevator stopped
    "normal": 24,     # Non-urgent issues
    "low": 48         # Minor issues
}
```

New endpoint: `/api/work-orders/sla-breaches`

**Response:**
```json
{
  "breaches": [
    {
      "work_order_id": "uuid",
      "work_order_number": "EM-2024-00001",
      "priority": "critical",
      "sla_deadline": "2024-02-15T10:15:00Z",
      "current_time": "2024-02-15T10:30:00Z",
      "breach_minutes": 15,
      "assigned_technician": "أحمد محمد",
      "status": "in_progress"
    }
  ],
  "at_risk": [
    {
      "work_order_id": "uuid",
      "time_remaining_minutes": 15
    }
  ]
}
```

## Frontend Changes Required

### 1. New Component: `EmergencyAlertBanner.tsx`

Location: `AdminPortal/src/components/work-orders/EmergencyAlertBanner.tsx`

Features:
- Sticky banner at top when emergencies exist
- Color-coded by priority (red=critical, orange=high)
- Time since reported
- Quick assign button
- Auto-refresh every 30 seconds

### 2. New Dialog: `EmergencyAssignmentDialog.tsx`

Location: `AdminPortal/src/components/work-orders/EmergencyAssignmentDialog.tsx`

Features:
- Emergency details at top
- List of available technicians sorted by:
  - Emergency technician status
  - Distance from site
  - Current availability
- Assign button per technician
- Shows technician's current work

### 3. New Component: `RealTimeUpdates.tsx`

Location: `AdminPortal/src/components/work-orders/RealTimeUpdates.tsx`

Features:
- WebSocket connection to backend
- Scrollable list of recent updates
- Color-coded by event type
- Timestamp for each event
- Bell icon with unread count
- Toast notifications for new emergencies

### 4. New Hook: `useWebSocket.ts`

Location: `AdminPortal/src/hooks/useWebSocket.ts`

```typescript
export function useWebSocket(url: string) {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // WebSocket connection logic
  // Reconnection on disconnect
  // Message handling

  return { messages, isConnected, lastMessage };
}
```

### 5. New Types

```typescript
export enum EmergencyIssueType {
  STUCK_PASSENGERS = 'stuck_passengers',
  BREAKDOWN = 'breakdown',
  NOISE = 'noise',
  DOOR_ISSUE = 'door_issue',
  OTHER = 'other',
}

export interface EmergencyWorkOrderCreate {
  elevatorId: string;
  issueType: EmergencyIssueType;
  description: string;
  reporterName: string;
  reporterPhone: string;
  priority: 'critical' | 'high' | 'normal';
}

export interface SuggestedTechnician {
  id: string;
  name: string;
  isEmergencyTech: boolean;
  distanceKm: number;
  currentStatus: 'available' | 'busy' | 'on_visit';
  currentWork?: {
    siteName: string;
    elevatorCode: string;
  };
}

export interface EmergencyWorkOrderResponse {
  id: string;
  workOrderNumber: string;
  status: string;
  priority: string;
  slaDeadline: string;
  suggestedTechnicians: SuggestedTechnician[];
}

export interface WebSocketMessage {
  type: 'work_order_started' | 'work_order_completed' | 'emergency_created' | 'status_updated';
  data: Record<string, unknown>;
  timestamp: string;
}

export interface SLABreach {
  workOrderId: string;
  workOrderNumber: string;
  priority: string;
  slaDeadline: string;
  breachMinutes: number;
  assignedTechnician: string;
  status: string;
}
```

### 6. New API Functions

```typescript
export const emergencyApi = {
  create: (data: EmergencyWorkOrderCreate) =>
    api.post<EmergencyWorkOrderResponse>('/work-orders/emergency', data),

  getActive: () =>
    api.get<EmergencyWorkOrderResponse[]>('/work-orders/emergency/active'),

  autoAssign: (id: string) =>
    api.post<WorkOrder>(`/work-orders/${id}/emergency-assign`),

  getSlaBreaches: () =>
    api.get<{ breaches: SLABreach[]; atRisk: { workOrderId: string; timeRemainingMinutes: number }[] }>(
      '/work-orders/sla-breaches'
    ),
};
```

## Acceptance Criteria

1. [ ] Emergency work orders created with correct priority
2. [ ] SLA deadline calculated based on priority
3. [ ] Emergency alert banner shows when active emergencies exist
4. [ ] Banner updates in real-time
5. [ ] Assignment dialog shows technicians sorted by priority
6. [ ] Emergency technicians shown first
7. [ ] Distance from site displayed for each technician
8. [ ] WebSocket connects and receives updates
9. [ ] Status cards update in real-time
10. [ ] Toast notifications for new emergencies
11. [ ] SLA breach tracking and alerts
12. [ ] Arabic labels and RTL support

## Files to Create/Modify

### New Files:
- `backend/app/api/endpoints/emergency.py`
- `backend/app/services/emergency_service.py`
- `backend/app/websocket/admin_updates.py`
- `AdminPortal/src/components/work-orders/EmergencyAlertBanner.tsx`
- `AdminPortal/src/components/work-orders/EmergencyAssignmentDialog.tsx`
- `AdminPortal/src/components/work-orders/RealTimeUpdates.tsx`
- `AdminPortal/src/hooks/useWebSocket.ts`

### Modified Files:
- `backend/app/main.py` (add WebSocket routes)
- `backend/app/api/router.py`
- `backend/app/services/work_order_service.py`
- `AdminPortal/src/App.tsx`
- `AdminPortal/src/pages/maintenance/WorkOrders.tsx`
- `AdminPortal/src/types/index.ts`
- `AdminPortal/src/api/index.ts`
- `AdminPortal/src/i18n/ar.ts`

## Dependencies
- Phase 1-4 completed
- WebSocket support in backend (FastAPI supports this natively)

## Estimated Effort
- Backend: 8-10 hours
- Frontend: 10-12 hours
- WebSocket setup: 4 hours
- Testing: 4 hours
