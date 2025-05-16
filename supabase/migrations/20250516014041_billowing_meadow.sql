/*
  # Initial Schema Setup

  1. Tables
    - contracts: Store maintenance contracts
    - buildings: Store building information
    - elevators: Store elevator details
    - maintenance_tasks: Store scheduled maintenance
    - maintenance_records: Store completed maintenance records
    - spare_parts: Store inventory
    - notifications: Store system notifications

  2. Features
    - Automatic contract status updates
    - Maintenance scheduling notifications
    - Low stock alerts
    - Elevator status tracking
    
  3. Security
    - RLS enabled on all tables
    - Proper foreign key relationships
*/

-- Create ENUM types if they don't exist
DO $$ BEGIN
  CREATE TYPE maintenance_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE maintenance_type AS ENUM ('immediate', 'scheduled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE contract_status AS ENUM ('active', 'pending', 'expired', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE elevator_status AS ENUM ('operational', 'maintenance', 'out_of_service');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_number text UNIQUE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  contract_type text NOT NULL,
  contract_status contract_status DEFAULT 'active',
  maintenance_frequency text,
  total_amount numeric(12, 2),
  payment_status text DEFAULT 'unpaid',
  payment_method text,
  contract_file_url text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create buildings table
CREATE TABLE IF NOT EXISTS buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  city text,
  postal_code text,
  floors_count integer,
  building_type text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create elevators table
CREATE TABLE IF NOT EXISTS elevators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid REFERENCES buildings(id) ON DELETE CASCADE,
  serial_number text UNIQUE NOT NULL,
  model text,
  manufacturer text,
  capacity numeric(10, 2),
  floors_served integer,
  installation_date date,
  last_certification_date date,
  certification_expiry_date date,
  status elevator_status DEFAULT 'operational',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create maintenance_tasks table
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elevator_id uuid REFERENCES elevators(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id),
  scheduled_date date NOT NULL,
  scheduled_time text,
  type maintenance_type NOT NULL,
  status maintenance_status DEFAULT 'pending',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create maintenance_records table
CREATE TABLE IF NOT EXISTS maintenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES maintenance_tasks(id) ON DELETE CASCADE,
  elevator_id uuid REFERENCES elevators(id) ON DELETE CASCADE,
  performed_by uuid REFERENCES auth.users(id),
  maintenance_date timestamptz NOT NULL,
  completion_time timestamptz,
  findings text,
  actions_taken text,
  elevator_status_after elevator_status,
  next_maintenance_date date,
  customer_signature_url text,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create spare_parts table
CREATE TABLE IF NOT EXISTS spare_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  part_number text UNIQUE,
  category text,
  manufacturer text,
  description text,
  unit_price numeric(10, 2),
  quantity_in_stock integer DEFAULT 0,
  minimum_stock integer DEFAULT 5,
  location text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  entity_type text,
  entity_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevators ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Function to update contract status
CREATE OR REPLACE FUNCTION update_contract_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date < CURRENT_DATE THEN
    NEW.contract_status = 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for contract status updates
CREATE TRIGGER check_contract_expiry
  BEFORE INSERT OR UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_status();

-- Function to create maintenance notifications
CREATE OR REPLACE FUNCTION create_maintenance_notification()
RETURNS TRIGGER AS $$
DECLARE
  customer_id uuid;
BEGIN
  -- Get customer ID from elevator
  SELECT b.customer_id INTO customer_id
  FROM elevators e
  JOIN buildings b ON e.building_id = b.id
  WHERE e.id = NEW.elevator_id;
  
  -- Create notification
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    entity_type,
    entity_id
  ) VALUES (
    customer_id,
    'Maintenance Scheduled',
    'Maintenance has been scheduled for your elevator on ' || NEW.scheduled_date,
    'maintenance_due',
    'maintenance_task',
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for maintenance notifications
CREATE TRIGGER notify_maintenance_scheduled
  AFTER INSERT ON maintenance_tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_maintenance_notification();

-- Function to check low stock and create notifications
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_in_stock <= NEW.minimum_stock THEN
    -- Notify admins about low stock
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      entity_type,
      entity_id
    )
    SELECT 
      u.id,
      'Low Stock Alert',
      'Item ' || NEW.name || ' is running low on stock (' || NEW.quantity_in_stock || ' remaining)',
      'inventory',
      'spare_part',
      NEW.id
    FROM auth.users u
    WHERE u.role = 'admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for low stock alerts
CREATE TRIGGER check_stock_levels
  AFTER INSERT OR UPDATE ON spare_parts
  FOR EACH ROW
  EXECUTE FUNCTION check_low_stock();

-- Function to update elevator status after maintenance
CREATE OR REPLACE FUNCTION update_elevator_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE elevators
  SET 
    status = NEW.elevator_status_after,
    last_certification_date = CURRENT_DATE
  WHERE id = NEW.elevator_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating elevator status
CREATE TRIGGER maintenance_complete
  AFTER INSERT ON maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_elevator_status();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_buildings_customer ON buildings(customer_id);
CREATE INDEX IF NOT EXISTS idx_elevators_building ON elevators(building_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_elevator ON maintenance_tasks(elevator_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_elevator ON maintenance_records(elevator_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);