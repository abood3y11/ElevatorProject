# Phase 4: Auto Distribution & Quick Actions (التوزيع التلقائي)

## Overview
Implement automatic distribution algorithms and quick action buttons to streamline the admin's workflow.

## Goal
Admin can:
- Automatically distribute all new elevators based on district assignments
- Use quick distribution modes (by district, balanced, manual)
- Save distribution templates for recurring use
- Apply templates with one click

## UI Design

### Quick Distribution Panel

```
┌─────────────────────────────────────────────────────────────┐
│  📋 توزيع الصيانة الشهرية                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📅 فبراير 2024                                      [▼]   │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ 🚀 سريع │  │ 📋 قالب │  │ ✋ يدوي │                  │
│  │          │  │          │  │          │                  │
│  │  ضغطة    │  │  من      │  │  خطوة   │                  │
│  │  وحدة    │  │  قالب    │  │  بخطوة  │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🛗 156 مصعد  →  👥 8 فنيين  →  ⚡ توزيع تلقائي    │   │
│  │                                                      │   │
│  │            [⚡ وزّع الآن]                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 كل فني سيستلم الأحياء المخصصة له تلقائياً            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Auto-Distribution Result

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ تم التوزيع بنجاح!                                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👤 أحمد    → النرجس، الملقا      → 24 مصعد    [عرض]      │
│  👤 خالد    → العليا، السليمانية  → 18 مصعد    [عرض]      │
│  👤 محمد    → الياسمين، الروضة    → 21 مصعد    [عرض]      │
│  👤 سعد     → المروج، الورود      → 19 مصعد    [عرض]      │
│  ...                                                        │
│                                                             │
│  ⚠️ 5 مصاعد لم يتم توزيعها (حي بدون فني معين)             │
│                                                             │
│         [✓ تأكيد وإرسال للفنيين]    [✏️ تعديل]             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Distribution Templates

```
┌─────────────────────────────────────────────────────────────┐
│  📋 القوالب المحفوظة                          [+ قالب جديد] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⭐ التوزيع الأساسي                                  │   │
│  │                                                      │   │
│  │ أحمد ← النرجس، الملقا                               │   │
│  │ خالد ← العليا، السليمانية                           │   │
│  │ محمد ← الياسمين، الروضة                             │   │
│  │                                                      │   │
│  │        [🚀 تطبيق لشهر فبراير]    [✏️]    [🗑️]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Distribution Algorithms

### 1. By District (حسب الحي)
```python
def distribute_by_district(elevators, technicians):
    """
    Each technician gets elevators from their assigned districts.
    فني يحصل على المصاعد من الأحياء المخصصة له
    """
    for elevator in elevators:
        district = elevator.site.district
        technician = get_technician_for_district(district)
        if technician:
            assign_elevator_to_technician(elevator, technician)
        else:
            mark_as_unassigned(elevator)
```

### 2. Balanced Distribution (التوزيع المتوازن)
```python
def distribute_balanced(elevators, technicians):
    """
    Distribute elevators evenly among technicians.
    توزيع المصاعد بالتساوي على الفنيين
    """
    # Calculate target per technician
    target_per_tech = len(elevators) // len(technicians)

    for technician in technicians:
        # Get elevators from technician's districts first
        tech_elevators = [e for e in elevators
                        if e.site.district in technician.districts]

        # Assign up to target
        assigned = tech_elevators[:target_per_tech]
        assign_to_technician(assigned, technician)
        elevators.remove(assigned)

    # Distribute remaining evenly
    redistribute_remaining(elevators, technicians)
```

### 3. Geographic Clustering (التجميع الجغرافي)
```python
def distribute_geographically(elevators, technicians):
    """
    Group elevators by proximity to minimize travel.
    تجميع المصاعد حسب القرب لتقليل التنقل
    """
    clusters = cluster_by_location(elevators)

    for technician in technicians:
        # Find clusters in technician's districts
        tech_clusters = [c for c in clusters
                        if c.district in technician.districts]

        # Assign complete clusters to minimize travel
        assign_clusters_to_technician(tech_clusters, technician)
```

## Backend Changes Required

### 1. New API Endpoint: `/api/maintenance/auto-distribute`

**Request:**
```json
{
  "month": 2,
  "year": 2024,
  "distribution_type": "by_district",  // or "balanced", "geographic"
  "preview": true  // If true, returns preview without saving
}
```

**Response (Preview):**
```json
{
  "preview": true,
  "distribution": [
    {
      "technician_id": "uuid",
      "technician_name": "أحمد محمد",
      "districts": ["النرجس", "الملقا"],
      "elevators_count": 24,
      "elevators": [
        {"id": "uuid", "code": "EL-001", "site": "برج السلام"}
      ]
    }
  ],
  "unassigned": [
    {
      "elevator_id": "uuid",
      "code": "EL-050",
      "site": "عمارة الندى",
      "district": "الروابي",
      "reason": "NO_TECHNICIAN_FOR_DISTRICT"
    }
  ],
  "summary": {
    "total_elevators": 156,
    "assigned": 151,
    "unassigned": 5,
    "technicians_used": 8
  }
}
```

**Response (Execute):**
```json
{
  "preview": false,
  "success": true,
  "work_orders_created": 151,
  "distribution": [...],
  "unassigned": [...]
}
```

### 2. New API Endpoint: `/api/maintenance/distribution-templates`

CRUD for distribution templates.

**Template Schema:**
```json
{
  "id": "uuid",
  "name": "التوزيع الأساسي",
  "is_default": true,
  "assignments": [
    {
      "technician_id": "uuid",
      "district_ids": ["uuid1", "uuid2"]
    }
  ],
  "created_at": "2024-01-15",
  "last_used_at": "2024-02-01"
}
```

### 3. New API Endpoint: `/api/maintenance/distribution-templates/{id}/apply`

Apply a template to distribute elevators.

**Request:**
```json
{
  "month": 2,
  "year": 2024,
  "preview": true
}
```

### 4. Backend Service: `DistributionService`

New service file: `backend/app/services/distribution_service.py`

```python
class DistributionService:
    def __init__(self, db: Session):
        self.db = db

    def auto_distribute(
        self,
        month: int,
        year: int,
        distribution_type: str = "by_district",
        preview: bool = True
    ) -> Dict:
        """Main auto-distribution method."""

    def distribute_by_district(self, elevators, technicians) -> List[Dict]:
        """Distribute based on district assignments."""

    def distribute_balanced(self, elevators, technicians) -> List[Dict]:
        """Distribute evenly among technicians."""

    def apply_template(
        self,
        template_id: UUID,
        month: int,
        year: int,
        preview: bool = True
    ) -> Dict:
        """Apply a saved template."""
```

## Frontend Changes Required

### 1. New Component: `QuickDistributionPanel.tsx`

Location: `AdminPortal/src/components/work-orders/QuickDistributionPanel.tsx`

Features:
- Three mode buttons (Quick, Template, Manual)
- Summary of elevators and technicians
- "Distribute Now" button
- Loading state during distribution

### 2. New Component: `DistributionResultDialog.tsx`

Location: `AdminPortal/src/components/work-orders/DistributionResultDialog.tsx`

Features:
- List of technicians with assigned counts
- Expandable to show individual elevators
- Warning section for unassigned elevators
- "Confirm" and "Edit" buttons
- Preview mode vs Execute mode

### 3. New Component: `DistributionTemplates.tsx`

Location: `AdminPortal/src/components/work-orders/DistributionTemplates.tsx`

Features:
- List of saved templates
- Create new template button
- Apply template button
- Edit/Delete template

### 4. New Types

```typescript
export enum DistributionType {
  BY_DISTRICT = 'by_district',
  BALANCED = 'balanced',
  GEOGRAPHIC = 'geographic',
}

export interface AutoDistributeRequest {
  month: number;
  year: number;
  distributionType: DistributionType;
  preview: boolean;
}

export interface TechnicianDistribution {
  technicianId: string;
  technicianName: string;
  districts: string[];
  elevatorsCount: number;
  elevators: {
    id: string;
    code: string;
    site: string;
  }[];
}

export interface UnassignedElevator {
  elevatorId: string;
  code: string;
  site: string;
  district: string;
  reason: string;
}

export interface DistributionResult {
  preview: boolean;
  success?: boolean;
  workOrdersCreated?: number;
  distribution: TechnicianDistribution[];
  unassigned: UnassignedElevator[];
  summary: {
    totalElevators: number;
    assigned: number;
    unassigned: number;
    techniciansUsed: number;
  };
}

export interface DistributionTemplate {
  id: string;
  name: string;
  isDefault: boolean;
  assignments: {
    technicianId: string;
    districtIds: string[];
  }[];
  createdAt: string;
  lastUsedAt?: string;
}
```

### 5. New API Functions

```typescript
export const distributionApi = {
  autoDistribute: (data: AutoDistributeRequest) =>
    api.post<DistributionResult>('/maintenance/auto-distribute', data),

  getTemplates: () =>
    api.get<DistributionTemplate[]>('/maintenance/distribution-templates'),

  createTemplate: (data: Partial<DistributionTemplate>) =>
    api.post<DistributionTemplate>('/maintenance/distribution-templates', data),

  applyTemplate: (id: string, data: { month: number; year: number; preview: boolean }) =>
    api.post<DistributionResult>(`/maintenance/distribution-templates/${id}/apply`, data),

  deleteTemplate: (id: string) =>
    api.delete<void>(`/maintenance/distribution-templates/${id}`),
};
```

## Acceptance Criteria

1. [ ] Quick distribution button visible when new elevators > 0
2. [ ] Preview shows distribution before confirming
3. [ ] Distribution by district assigns correctly
4. [ ] Balanced distribution evens out workload
5. [ ] Unassigned elevators clearly shown with reasons
6. [ ] Templates can be created, saved, and applied
7. [ ] Default template marked with star
8. [ ] Last used date updates when template applied
9. [ ] Confirmation required before executing distribution
10. [ ] Status cards update after distribution

## Files to Create/Modify

### New Files:
- `backend/app/services/distribution_service.py`
- `backend/app/models/distribution_template.py`
- `backend/app/api/endpoints/maintenance/distribution.py`
- `AdminPortal/src/components/work-orders/QuickDistributionPanel.tsx`
- `AdminPortal/src/components/work-orders/DistributionResultDialog.tsx`
- `AdminPortal/src/components/work-orders/DistributionTemplates.tsx`

### Modified Files:
- `backend/app/api/router.py`
- `backend/app/models/__init__.py`
- `AdminPortal/src/pages/maintenance/WorkOrders.tsx`
- `AdminPortal/src/types/index.ts`
- `AdminPortal/src/api/index.ts`
- `AdminPortal/src/i18n/ar.ts`

## Database Migration

New table: `distribution_templates`
```sql
CREATE TABLE distribution_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    assignments JSONB NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);
```

## Dependencies
- Phase 1 (Status Cards)
- Phase 2 (Manual Distribution)
- Phase 3 (Technician Workload) - for workload display

## Estimated Effort
- Backend: 6-8 hours
- Frontend: 8-10 hours
- Database migration: 1 hour
- Testing: 4 hours
