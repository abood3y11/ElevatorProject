/*
  # Fix Admin User Creation

  1. Changes
    - Remove email column from profiles table insert
    - Update handle_new_user function to not use email column
    - Ensure proper role assignment for admin user
*/

-- Update handle_new_user function to remove email field
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name)
  VALUES (
    new.id,
    COALESCE(
      (new.raw_user_meta_data->>'role')::user_role,
      'customer'::user_role
    ),
    COALESCE(new.raw_user_meta_data->>'name', 'Anonymous')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin user with proper metadata
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@elevatorapp.com',
  crypt('Admin123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"],"role":"admin"}',
  '{"name":"System Administrator","role":"admin","phone":null}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Create profile for admin user if it doesn't exist
INSERT INTO public.profiles (
  id,
  name,
  role
)
SELECT 
  id,
  raw_user_meta_data->>'name',
  'admin'::user_role
FROM auth.users
WHERE email = 'admin@elevatorapp.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin'::user_role,
    updated_at = now();