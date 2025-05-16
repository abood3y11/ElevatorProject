/*
  # Add Roles and Policies

  1. Changes
    - Add role enum type for user roles
    - Add role column to profiles table
    - Create policies for different user roles
    - Update existing admin user role

  2. Security
    - Enable RLS on profiles table
    - Add policies for role-based access
*/

-- Create role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'employee', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add role column to profiles if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role user_role NOT NULL DEFAULT 'customer';
  END IF;
END $$;

-- Update existing admin user's role
UPDATE profiles 
SET role = 'admin'::user_role 
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'admin@elevatorapp.com'
);

-- Create policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Admin policies for buildings
DROP POLICY IF EXISTS "Admins have full access to buildings" ON buildings;
CREATE POLICY "Admins have full access to buildings"
ON buildings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Employee policies for maintenance tasks
DROP POLICY IF EXISTS "Employees can view assigned tasks" ON maintenance_tasks;
CREATE POLICY "Employees can view assigned tasks"
ON maintenance_tasks FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Employees can update assigned tasks" ON maintenance_tasks;
CREATE POLICY "Employees can update assigned tasks"
ON maintenance_tasks FOR UPDATE
TO authenticated
USING (
  assigned_to = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- Customer policies for maintenance requests
DROP POLICY IF EXISTS "Customers can view their maintenance requests" ON maintenance_tasks;
CREATE POLICY "Customers can view their maintenance requests"
ON maintenance_tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM elevators e
    JOIN buildings b ON e.building_id = b.id
    WHERE e.id = maintenance_tasks.elevator_id
    AND b.customer_id = auth.uid()
  )
);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name, email)
  VALUES (
    new.id,
    COALESCE(
      (new.raw_user_meta_data->>'role')::user_role,
      'customer'::user_role
    ),
    COALESCE(new.raw_user_meta_data->>'name', 'Anonymous'),
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();