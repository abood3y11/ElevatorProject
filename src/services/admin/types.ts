// Types for the application data

// Contract types
export interface Contract {
    id: string;
    buildingId: string;
    type: string;
    value: number;
    startDate: string;
    endDate: string;
    status: string;
    createdAt?: string;
    updatedAt?: string;
  }
  
  export interface ContractSummary {
    activeContracts: number;
    totalValue: number;
    expiringSoon: number;
    pendingRenewal: number;
  }
  
  // Building types
  export interface Building {
    id: string;
    name: string;
    address: string;
    contactPerson: string;
    contactEmail: string;
    contactPhone: string;
    status: string;
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
  
  export interface Customer {
    id: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
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