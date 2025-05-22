/*
  # Create Admin User

  1. Creates a new admin user with proper role and metadata
  2. Ensures user has admin role in both auth.users and profiles tables
  3. Sets up proper metadata and permissions
*/

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
  '{"name":"System Administrator","role":"admin","phone":null,"position":"Administrator","department":"Management"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;

-- Ensure admin user exists in profiles table with correct role
INSERT INTO public.profiles (
  id,
  name,
  role,
  email,
  phone,
  created_at,
  updated_at
)
SELECT 
  id,
  raw_user_meta_data->>'name',
  'admin'::user_role,
  email,
  raw_user_meta_data->>'phone',
  created_at,
  updated_at
FROM auth.users
WHERE email = 'admin@elevatorapp.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin'::user_role,
    updated_at = now();