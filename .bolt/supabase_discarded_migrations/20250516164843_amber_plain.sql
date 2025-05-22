/*
  # Update Admin Role and Permissions

  1. Changes
    - Update admin user's role metadata
    - Add role-based policies for admin access
    - Ensure proper role inheritance

  2. Security
    - Update RLS policies for admin role
    - Maintain existing security constraints
*/

-- Update admin user's role in auth.users
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  raw_app_meta_data,
  '{role}',
  '"admin"'
),
raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{role}',
  '"admin"'
)
WHERE email = 'admin@elevatorapp.com';

-- Ensure admin role exists in profiles
UPDATE profiles
SET role = 'admin'
WHERE id IN (
  SELECT id 
  FROM auth.users 
  WHERE email = 'admin@elevatorapp.com'
);

-- Add admin override policies to ensure full access
CREATE POLICY "Admins have full access to all tables"
ON maintenance_tasks FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Admins have full access to maintenance records"
ON maintenance_records FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Admins have full access to spare parts"
ON spare_parts FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Admins have full access to notifications"
ON notifications FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);