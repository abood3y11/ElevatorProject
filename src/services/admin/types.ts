// Updated types to match your actual database schema

// Contract types
export interface Contract {
  id: string;
  customer_id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  contract_type: string;
  contract_status: string;
  maintenance_frequency: string;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  contract_file_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ContractSummary {
  activeContracts: number;
  totalValue: number;
  expiringSoon: number;
  pendingRenewal: number;
  monthlyRevenue: number;
}

// Building types (updated to match your schema)
export interface Building {
  id: string;
  customer_id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  floors_count: number;
  building_type: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Customer types (assuming similar structure)
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  contact_person?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Inventory types
export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  location: string;
  lastRestocked: string;
}

export interface InventorySummary {
  totalItems: number;
  lowStockItems: number;
  categories: number;
  lastUpdated: string;
}

// User types
export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  joinDate: string;
  isActive: boolean;
}

export interface UserSummary {
  totalUsers: number;
  activeEmployees: number;
  activeCustomers: number;
}

// Maintenance types
export interface MaintenanceRecord {
  id: string;
  buildingId: string;
  elevatorId: string;
  type: 'scheduled' | 'emergency';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  assignedTechnician: string;
  scheduledDate: string;
  completedDate?: string;
  notes?: string;
}

export interface Technician {
  id: string;
  name: string;
  tasksToday: number;
  tasksCompleted: number;
  image?: string;
}

// Dashboard types
export interface MaintenanceData {
  month: string;
  scheduled: number;
  emergency: number;
}

export interface RevenueData {
  month: string;
  value: number;
  trend: number;
}

export interface StatusData {
  name: string;
  value: number;
  color: string;
}

export interface KeyMetric {
  name: string;
  value: string | number;
  percentageChange: number;
  status: 'improved' | 'declined' | 'on-target' | 'needs-attention' | 'excellent';
  percentage: number;
}

export interface ExpiringContract {
  id: string;
  customer: string;
  expiry: string;
  daysLeft: number;
}

export interface LowStockItem {
  id: number;
  name: string;
  stock: number;
  minimum: number;
}

export interface DashboardSummary {
  totalElevators: number;
  activeContracts: number;
  maintenanceToday: number;
  pendingRequests: number;
}

// Activity log types
export interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  userId: string;
  details: string;
}