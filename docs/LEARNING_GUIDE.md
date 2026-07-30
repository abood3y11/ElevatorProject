# دليل تعلم المشروع - How the Project Works from A to Z
# مشروع إدارة المصاعد - Elevator Management System

## نظرة عامة - Overview

هذا الدليل يشرح كيف يعمل المشروع من البداية للنهاية باستخدام **أوامر العمل (Work Orders)** كمثال.

This guide explains how the project works end-to-end using **Work Orders** as an example.

---

## 1. هيكل المشروع - Project Structure

```
ElevatorProject/
├── backend/                    # FastAPI Backend (Python)
│   ├── app/
│   │   ├── api/               # API Endpoints (Routes)
│   │   │   ├── endpoints/     # All API route files
│   │   │   └── deps.py        # Dependencies (auth, db)
│   │   ├── models/            # Database Models (SQLAlchemy)
│   │   ├── schemas/           # Pydantic Schemas (validation)
│   │   ├── services/          # Business Logic
│   │   ├── core/              # Config, Security
│   │   └── db/                # Database connection
│   └── alembic/               # Database migrations
│
├── AdminPortal/               # React Admin Dashboard (TypeScript)
│   └── src/
│       ├── api/               # API client functions
│       ├── components/        # Reusable UI components
│       ├── pages/             # Page components
│       ├── types/             # TypeScript types
│       └── hooks/             # Custom React hooks
│
├── mobile-worker/             # React Native Mobile App
│   └── src/
│       ├── screens/           # App screens
│       ├── services/          # API services
│       ├── store/             # Redux state
│       └── config/            # API configuration
│
└── shared/                    # Shared code between projects
```

---

## 2. تدفق البيانات - Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    HTTP Request    ┌──────────────┐                       │
│  │   Frontend   │ ─────────────────► │   Backend    │                       │
│  │  (React/RN)  │                    │  (FastAPI)   │                       │
│  └──────────────┘                    └──────────────┘                       │
│         │                                   │                                │
│         │                                   ▼                                │
│         │                            ┌──────────────┐                       │
│         │                            │   Router     │  (api/endpoints/)     │
│         │                            │  (Endpoint)  │                       │
│         │                            └──────────────┘                       │
│         │                                   │                                │
│         │                                   ▼                                │
│         │                            ┌──────────────┐                       │
│         │                            │   Service    │  (services/)          │
│         │                            │  (Logic)     │                       │
│         │                            └──────────────┘                       │
│         │                                   │                                │
│         │                                   ▼                                │
│         │                            ┌──────────────┐                       │
│         │                            │   Model      │  (models/)            │
│         │                            │  (Database)  │                       │
│         │                            └──────────────┘                       │
│         │                                   │                                │
│         │                                   ▼                                │
│         │                            ┌──────────────┐                       │
│         │                            │  PostgreSQL  │                       │
│         │                            │  Database    │                       │
│         │                            └──────────────┘                       │
│         │                                   │                                │
│         │    HTTP Response (JSON)           │                                │
│         │ ◄─────────────────────────────────┘                                │
│         ▼                                                                    │
│  ┌──────────────┐                                                           │
│  │   Update UI  │                                                           │
│  └──────────────┘                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. مثال عملي: أوامر العمل - Practical Example: Work Orders

### الخطوة 1: قاعدة البيانات - Database Model

**الملف:** `backend/app/models/work_order.py`

```python
# هذا الملف يحدد شكل جدول work_orders في قاعدة البيانات
# This file defines the work_orders table structure in the database

from sqlalchemy import Column, String, DateTime, ForeignKey
from app.db.base import Base

class WorkOrderStatus(str, Enum):
    """حالات أمر العمل - Work order statuses"""
    SCHEDULED = "scheduled"      # مجدولة
    ASSIGNED = "assigned"        # معين للفني
    PENDING = "pending"          # قيد الانتظار
    IN_PROGRESS = "in_progress"  # قيد التنفيذ
    COMPLETED = "completed"      # مكتملة
    OVERDUE = "overdue"          # متأخرة

class WorkOrder(Base):
    """
    جدول أوامر العمل في قاعدة البيانات
    Work Orders table in database
    """
    __tablename__ = "work_orders"

    # المفتاح الرئيسي - Primary Key
    id = Column(GUID, primary_key=True, default=uuid.uuid4)

    # رقم أمر العمل - Work Order Number
    work_order_number = Column(String(50), unique=True, nullable=False)

    # نوع أمر العمل - Type (preventive, corrective, etc.)
    type = Column(String(50), nullable=False)

    # الحالة - Status
    status = Column(String(50), default="scheduled")

    # المصعد المرتبط - Related Elevator
    elevator_id = Column(GUID, ForeignKey("elevators.id"))

    # الموقع - Site
    site_id = Column(GUID, ForeignKey("sites.id"))

    # الفني المعين - Assigned Technician
    assigned_technician_id = Column(GUID, ForeignKey("technicians.id"))

    # التاريخ المجدول - Scheduled Date
    scheduled_start = Column(DateTime)
    scheduled_end = Column(DateTime)

    # ملاحظات - Notes
    technician_notes = Column(Text)
    resolution_notes = Column(Text)
```

### الخطوة 2: Schema للتحقق - Validation Schema

**الملف:** `backend/app/schemas/work_order.py`

```python
# Schema = شكل البيانات المتوقع من الـ Frontend
# Schema = Expected data shape from Frontend

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class WorkOrderCreate(BaseModel):
    """
    البيانات المطلوبة لإنشاء أمر عمل جديد
    Required data to create a new work order
    """
    type: str                           # نوع أمر العمل
    elevator_id: UUID                   # معرف المصعد
    priority: str = "medium"            # الأولوية
    scheduled_start: Optional[datetime] # موعد البدء
    description: Optional[str]          # الوصف

class WorkOrderOut(BaseModel):
    """
    شكل البيانات المرسلة للـ Frontend
    Data shape sent to Frontend
    """
    id: UUID
    work_order_number: str
    type: str
    status: str
    priority: str
    scheduled_start: Optional[datetime]

    class Config:
        from_attributes = True  # يسمح بالتحويل من ORM model
```

### الخطوة 3: الـ API Endpoint

**الملف:** `backend/app/api/endpoints/work_orders.py`

```python
# هذا الملف يحدد الـ URLs التي يستطيع الـ Frontend الاتصال بها
# This file defines URLs that Frontend can call

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter()

# ═══════════════════════════════════════════════════════════════
# GET /work-orders/my-tasks
# جلب مهام الفني لليوم - Get technician's tasks for today
# ═══════════════════════════════════════════════════════════════
@router.get("/my-tasks")
def get_my_work_orders(
    db: Session = Depends(get_db),                    # اتصال قاعدة البيانات
    current_user: User = Depends(get_current_user),   # المستخدم الحالي (من Token)
    date_filter: Optional[date] = None                # فلتر التاريخ
):
    """
    1. أولاً: نتحقق من هوية المستخدم (Authentication)
    2. ثانياً: نجد سجل الفني المرتبط بالمستخدم
    3. ثالثاً: نجلب أوامر العمل المعينة له
    4. رابعاً: نرسل البيانات للـ Frontend
    """

    # 1. Find technician record for this user
    technician = db.query(Technician).filter(
        Technician.user_id == current_user.id
    ).first()

    # 2. Set date filter (today if not specified)
    target_date = date_filter or date.today()

    # 3. Query work orders assigned to this technician
    work_orders = db.query(WorkOrder).filter(
        WorkOrder.assigned_technician_id == technician.id,
        WorkOrder.scheduled_start >= start_of_day,
        WorkOrder.scheduled_start <= end_of_day,
        WorkOrder.status.in_(["assigned", "pending", "in_progress"])
    ).all()

    # 4. Return data to Frontend
    return work_orders


# ═══════════════════════════════════════════════════════════════
# POST /work-orders/{id}/start
# بدء العمل على أمر عمل - Start working on a work order
# ═══════════════════════════════════════════════════════════════
@router.post("/{work_order_id}/start")
def start_work_order(
    work_order_id: UUID,
    start_data: WorkOrderStartWork,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    1. نتحقق من وجود أمر العمل
    2. نتحقق أن الفني مصرح له
    3. نغير الحالة إلى "in_progress"
    4. نسجل وقت البدء الفعلي
    """

    # Find the work order
    work_order = db.query(WorkOrder).filter(
        WorkOrder.id == work_order_id
    ).first()

    if not work_order:
        raise HTTPException(status_code=404, detail="Work order not found")

    # Update status
    work_order.status = "in_progress"
    work_order.actual_start = datetime.now()

    # Save to database
    db.commit()

    return work_order
```

### الخطوة 4: الـ Service (Business Logic)

**الملف:** `backend/app/services/work_order_service.py`

```python
# الـ Service = منطق العمل Business Logic
# يفصل المنطق المعقد عن الـ Endpoints

class WorkOrderService:
    def __init__(self, db: Session):
        self.db = db

    def create_work_order(
        self,
        work_type: str,
        elevator_id: UUID,
        scheduled_start: datetime,
        **kwargs
    ) -> WorkOrder:
        """
        إنشاء أمر عمل جديد مع:
        1. توليد رقم أمر العمل تلقائياً
        2. ربط المصعد والموقع والعميل
        3. حفظ في قاعدة البيانات
        """

        # Generate work order number: WO-PM-YYMMDD-RANDOM
        work_order_number = self._generate_work_order_number(work_type)

        # Create new work order
        work_order = WorkOrder(
            work_order_number=work_order_number,
            type=work_type,
            elevator_id=elevator_id,
            scheduled_start=scheduled_start,
            status="scheduled",
            **kwargs
        )

        self.db.add(work_order)
        self.db.commit()

        return work_order

    def complete_work_order(
        self,
        work_order_id: UUID,
        technician_id: UUID,
        resolution_notes: str,
        **kwargs
    ) -> dict:
        """
        إكمال أمر العمل:
        1. تحديث الحالة إلى "completed"
        2. تسجيل وقت الانتهاء
        3. حفظ ملاحظات الفني
        """

        work_order = self.db.query(WorkOrder).filter(
            WorkOrder.id == work_order_id
        ).first()

        work_order.status = "completed"
        work_order.actual_end = datetime.now()
        work_order.resolution_notes = resolution_notes

        self.db.commit()

        return {"success": True, "work_order": work_order}
```

---

## 4. الـ Frontend - AdminPortal (React)

### الخطوة 1: API Client

**الملف:** `AdminPortal/src/api/client.ts`

```typescript
// هذا الملف يتعامل مع كل طلبات HTTP للـ Backend
// This file handles all HTTP requests to the Backend

const API_BASE_URL = 'http://localhost:8000/api/v1';

// دالة أساسية لإرسال الطلبات
// Base function to send requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {

  // 1. Get auth token from localStorage
  const token = localStorage.getItem('access_token');

  // 2. Set headers
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
    ...options.headers,
  };

  // 3. Make the request
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 4. Handle errors
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  // 5. Return JSON data
  return response.json();
}

// ═══════════════════════════════════════════════════════════════
// Work Orders API Functions
// ═══════════════════════════════════════════════════════════════

export const workOrdersApi = {
  // GET /work-orders - جلب قائمة أوامر العمل
  getAll: (params?: WorkOrderFilters) =>
    apiRequest<PaginatedResponse<WorkOrder>>('/work-orders', {
      method: 'GET',
    }),

  // GET /work-orders/{id} - جلب تفاصيل أمر عمل
  getById: (id: string) =>
    apiRequest<WorkOrder>(`/work-orders/${id}`),

  // POST /work-orders - إنشاء أمر عمل جديد
  create: (data: CreateWorkOrderRequest) =>
    apiRequest<WorkOrder>('/work-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // POST /work-orders/{id}/assign - تعيين لفني
  assign: (id: string, technicianId: string) =>
    apiRequest<WorkOrder>(`/work-orders/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ technician_id: technicianId }),
    }),
};
```

### الخطوة 2: Types (TypeScript)

**الملف:** `AdminPortal/src/types/workOrder.ts`

```typescript
// أنواع البيانات - Data Types
// تضمن أن البيانات لها الشكل الصحيح

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  type: 'preventive_maintenance' | 'corrective' | 'breakdown';
  status: 'scheduled' | 'assigned' | 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  elevatorId: string;
  elevatorCode: string;
  siteId: string;
  siteName: string;
  customerName: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  scheduledStart: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  technicianNotes?: string;
  resolutionNotes?: string;
}

export interface WorkOrderFilters {
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  technicianId?: string;
}
```

### الخطوة 3: React Component (Page)

**الملف:** `AdminPortal/src/pages/maintenance/WorkOrders.tsx`

```tsx
// صفحة عرض أوامر العمل
// Work Orders page component

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { workOrdersApi } from '../../api';

export default function WorkOrdersPage() {
  // ═══════════════════════════════════════════════════════════════
  // State - حالة المكون
  // ═══════════════════════════════════════════════════════════════
  const [filters, setFilters] = useState({
    status: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  // ═══════════════════════════════════════════════════════════════
  // Data Fetching - جلب البيانات
  // useQuery يجلب البيانات ويخزنها ويحدثها تلقائياً
  // ═══════════════════════════════════════════════════════════════
  const {
    data: workOrders,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['work-orders', filters],  // مفتاح فريد للـ cache
    queryFn: () => workOrdersApi.getAll(filters),  // دالة جلب البيانات
  });

  // ═══════════════════════════════════════════════════════════════
  // Event Handlers - معالجات الأحداث
  // ═══════════════════════════════════════════════════════════════
  const handleStatusChange = (newStatus: string) => {
    setFilters(prev => ({ ...prev, status: newStatus }));
  };

  const handleAssignTechnician = async (workOrderId: string, techId: string) => {
    await workOrdersApi.assign(workOrderId, techId);
    refetch(); // إعادة جلب البيانات بعد التحديث
  };

  // ═══════════════════════════════════════════════════════════════
  // Render - عرض المكون
  // ═══════════════════════════════════════════════════════════════
  if (isLoading) return <div>جاري التحميل...</div>;
  if (error) return <div>حدث خطأ</div>;

  return (
    <div>
      <h1>أوامر العمل</h1>

      {/* Filter Buttons */}
      <div className="filters">
        <button onClick={() => handleStatusChange('assigned')}>
          معين
        </button>
        <button onClick={() => handleStatusChange('in_progress')}>
          قيد التنفيذ
        </button>
        <button onClick={() => handleStatusChange('completed')}>
          مكتمل
        </button>
      </div>

      {/* Work Orders Table */}
      <table>
        <thead>
          <tr>
            <th>رقم أمر العمل</th>
            <th>الموقع</th>
            <th>الفني</th>
            <th>الحالة</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {workOrders?.items.map(wo => (
            <tr key={wo.id}>
              <td>{wo.workOrderNumber}</td>
              <td>{wo.siteName}</td>
              <td>{wo.assignedTechnicianName || 'غير معين'}</td>
              <td>{wo.status}</td>
              <td>
                <button onClick={() => /* open details */}>
                  عرض
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 5. Mobile App - React Native

### الخطوة 1: API Configuration

**الملف:** `mobile-worker/src/config/api.ts`

```typescript
// إعدادات الاتصال بالـ Backend
// Backend connection configuration

export const API_BASE_URL = 'http://10.0.2.2:8000/api/v1'; // Android emulator

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login/tech',      // تسجيل دخول الفني
    REFRESH: '/auth/refresh',       // تجديد Token
  },
  TECHNICIANS: {
    TODAY_VISITS: (id: string) => `/technicians/${id}/visits/today`,
  },
  WORK_ORDERS: {
    MY_TASKS: '/work-orders/my-tasks',
    START: (id: string) => `/work-orders/${id}/start`,
    COMPLETE: (id: string) => `/work-orders/${id}/complete`,
  },
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  TECHNICIAN_ID: 'technician_id',
};
```

### الخطوة 2: Redux State (Auth)

**الملف:** `mobile-worker/src/store/slices/authSlice.ts`

```typescript
// Redux Slice = إدارة حالة التطبيق
// Manages application state

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ═══════════════════════════════════════════════════════════════
// Login Action - عملية تسجيل الدخول
// ═══════════════════════════════════════════════════════════════
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { phone: string; password: string }) => {

    // 1. Send login request to backend
    const response = await fetch(`${API_BASE_URL}/auth/login/tech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'فشل تسجيل الدخول');
    }

    // 2. Store tokens locally
    await AsyncStorage.setItem('auth_token', data.access_token);
    await AsyncStorage.setItem('refresh_token', data.refresh_token);
    await AsyncStorage.setItem('technician_id', data.technician_id);

    return data;
  }
);

// ═══════════════════════════════════════════════════════════════
// Auth Slice - شريحة المصادقة
// ═══════════════════════════════════════════════════════════════
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.access_token;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      });
  },
});
```

### الخطوة 3: Today Screen

**الملف:** `mobile-worker/src/screens/visits/TodayScreen.tsx`

```tsx
// شاشة مهام اليوم للفني
// Technician's today tasks screen

import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function TodayScreen() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // ═══════════════════════════════════════════════════════════════
  // Load Today's Tasks - تحميل مهام اليوم
  // ═══════════════════════════════════════════════════════════════
  const loadTodayVisits = async () => {
    try {
      // 1. Get stored credentials
      const token = await AsyncStorage.getItem('auth_token');
      const technicianId = await AsyncStorage.getItem('technician_id');

      if (!token || !technicianId) {
        Alert.alert('خطأ', 'يرجى تسجيل الدخول مرة أخرى');
        return;
      }

      // 2. Fetch today's work orders from backend
      const response = await fetch(
        `${API_BASE_URL}/technicians/${technicianId}/visits/today`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      // 3. Update state with work orders
      setWorkOrders(data);

    } catch (error) {
      Alert.alert('خطأ', 'فشل تحميل المهام');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayVisits();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Handle Work Order Press - عند النقر على أمر عمل
  // ═══════════════════════════════════════════════════════════════
  const handleWorkOrderPress = (workOrder) => {
    navigation.navigate('WorkOrderDetails', {
      workOrderId: workOrder.id,
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // Render - عرض الشاشة
  // ═══════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      <Text style={styles.title}>مهام اليوم</Text>

      <FlatList
        data={workOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleWorkOrderPress(item)}
          >
            <Text style={styles.cardTitle}>
              {item.site_name}
            </Text>
            <Text style={styles.cardSubtitle}>
              {item.elevator_serial}
            </Text>
            <Text style={styles.status}>
              {item.status === 'assigned' ? 'معين' : 'قيد التنفيذ'}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            لا توجد مهام لهذا اليوم
          </Text>
        }
      />
    </View>
  );
}
```

---

## 6. دورة حياة أمر العمل - Work Order Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        WORK ORDER LIFECYCLE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐    Admin assigns    ┌──────────┐    Tech clicks    ┌────────┐│
│   │SCHEDULED │ ─────────────────► │ ASSIGNED │ ────────────────► │PENDING ││
│   │  مجدولة  │                     │   معين   │                   │قيد انتظار││
│   └──────────┘                     └──────────┘                   └────────┘│
│        │                                                              │      │
│        │ If past scheduled date                                       │      │
│        ▼                                                              ▼      │
│   ┌──────────┐                                                  ┌──────────┐│
│   │ OVERDUE  │                                                  │IN_PROGRESS││
│   │  متأخرة  │                                                  │قيد التنفيذ ││
│   └──────────┘                                                  └──────────┘│
│                                                                       │      │
│                                                                       ▼      │
│                                                                 ┌──────────┐│
│                                                                 │COMPLETED ││
│                                                                 │  مكتملة  ││
│                                                                 └──────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

Status Transitions:
═══════════════════
1. SCHEDULED → ASSIGNED    : Admin assigns to technician
2. ASSIGNED → PENDING      : Technician acknowledges (clicks on it)
3. PENDING → IN_PROGRESS   : Technician starts work
4. IN_PROGRESS → COMPLETED : Technician finishes work
5. ANY → OVERDUE           : Past scheduled date without completion
```

---

## 7. المصادقة - Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTHENTICATION FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. LOGIN                                                                    │
│  ═══════                                                                     │
│                                                                              │
│  Mobile App                      Backend                                     │
│  ──────────                      ───────                                     │
│      │                              │                                        │
│      │  POST /auth/login/tech       │                                        │
│      │  {phone, password}           │                                        │
│      │ ─────────────────────────►   │                                        │
│      │                              │ 1. Find user by phone                  │
│      │                              │ 2. Verify password (bcrypt)            │
│      │                              │ 3. Generate JWT tokens                 │
│      │                              │ 4. Find technician record              │
│      │   {                          │                                        │
│      │     access_token,            │                                        │
│      │     refresh_token,           │                                        │
│      │     technician_id,           │                                        │
│      │     user: {...}              │                                        │
│      │   }                          │                                        │
│      │ ◄─────────────────────────   │                                        │
│      │                              │                                        │
│      │  Store tokens locally        │                                        │
│      │                              │                                        │
│                                                                              │
│  2. AUTHENTICATED REQUEST                                                    │
│  ════════════════════════                                                    │
│                                                                              │
│      │  GET /work-orders/my-tasks   │                                        │
│      │  Authorization: Bearer xxx   │                                        │
│      │ ─────────────────────────►   │                                        │
│      │                              │ 1. Decode JWT token                    │
│      │                              │ 2. Verify not expired                  │
│      │                              │ 3. Get user from token.sub             │
│      │                              │ 4. Process request                     │
│      │   [work orders...]           │                                        │
│      │ ◄─────────────────────────   │                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 8. ملخص التقنيات المستخدمة - Technologies Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Database** | PostgreSQL | Data storage |
| **Backend** | FastAPI (Python) | REST API server |
| **ORM** | SQLAlchemy | Database queries |
| **Validation** | Pydantic | Request/Response validation |
| **Auth** | JWT + bcrypt | Authentication & password hashing |
| **Admin Frontend** | React + TypeScript | Admin dashboard |
| **State Management** | React Query | Data fetching & caching |
| **UI Library** | Material-UI (MUI) | UI components |
| **Mobile** | React Native + Expo | Mobile app |
| **Mobile State** | Redux Toolkit | Mobile state management |

---

## 9. الأوامر المفيدة - Useful Commands

```bash
# ═══════════════════════════════════════════════════════════════
# Backend
# ═══════════════════════════════════════════════════════════════

# Start backend server
cd backend
uvicorn app.main:app --reload --port 8000

# Run database migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"

# ═══════════════════════════════════════════════════════════════
# AdminPortal
# ═══════════════════════════════════════════════════════════════

# Install dependencies
cd AdminPortal
npm install

# Start development server
npm run dev

# Build for production
npm run build

# ═══════════════════════════════════════════════════════════════
# Mobile Worker
# ═══════════════════════════════════════════════════════════════

# Install dependencies
cd mobile-worker
npm install

# Start Expo development server
npx expo start

# Run on Android emulator
npx expo run:android

# Run on iOS simulator
npx expo run:ios
```

---

## 10. نصائح للتطوير - Development Tips

### Backend Tips:
1. **Always use Pydantic schemas** for request/response validation
2. **Use dependency injection** (Depends) for db sessions and auth
3. **Keep endpoints thin** - move logic to services
4. **Log important operations** for debugging

### Frontend Tips:
1. **Use React Query** for data fetching (handles caching, loading, errors)
2. **Define TypeScript types** for all API responses
3. **Keep components small** and focused
4. **Use custom hooks** for reusable logic

### General Tips:
1. **Test API endpoints** with Swagger UI at `http://localhost:8000/docs`
2. **Check network tab** in browser DevTools for API issues
3. **Use console.log** for debugging frontend
4. **Check backend logs** for errors

---

## 11. روابط مفيدة - Useful Links

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [React Native Documentation](https://reactnative.dev/)
- [Material-UI Documentation](https://mui.com/)

---

**Created:** 2026-02-06
**Last Updated:** 2026-02-06
