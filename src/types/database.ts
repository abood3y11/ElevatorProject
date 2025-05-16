export type MaintenanceStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';
export type MaintenanceType = 'immediate' | 'scheduled';
export type ContractStatus = 'active' | 'pending' | 'expired' | 'cancelled';
export type ElevatorStatus = 'operational' | 'maintenance' | 'out_of_service';

export interface Contract {
  id: string;
  customer_id: string;
  contract_number: string;
  start_date: string;
  end_date: string;
  contract_type: string;
  contract_status: ContractStatus;
  maintenance_frequency?: string;
  total_amount?: number;
  payment_status: string;
  payment_method?: string;
  contract_file_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: string;
  customer_id: string;
  name: string;
  address: string;
  city?: string;
  postal_code?: string;
  floors_count?: number;
  building_type?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Elevator {
  id: string;
  building_id: string;
  serial_number: string;
  model?: string;
  manufacturer?: string;
  capacity?: number;
  floors_served?: number;
  installation_date?: string;
  last_certification_date?: string;
  certification_expiry_date?: string;
  status: ElevatorStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceTask {
  id: string;
  elevator_id: string;
  assigned_to?: string;
  scheduled_date: string;
  scheduled_time?: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string;
  task_id: string;
  elevator_id: string;
  performed_by: string;
  maintenance_date: string;
  completion_time?: string;
  findings?: string;
  actions_taken?: string;
  elevator_status_after: ElevatorStatus;
  next_maintenance_date?: string;
  customer_signature_url?: string;
  rating?: number;
  feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface SparePart {
  id: string;
  name: string;
  part_number?: string;
  category?: string;
  manufacturer?: string;
  description?: string;
  unit_price?: number;
  quantity_in_stock: number;
  minimum_stock: number;
  location?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
}