/*
  # Create Admin User
  
  1. Creates an admin user in auth.users table
  2. Creates corresponding profile in profiles table
  3. Sets up proper role and metadata
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
);

-- Create profile for admin user
INSERT INTO public.profiles (
  id,
  name,
  role,
  phone,
  created_at,
  updated_at
)
SELECT 
  id,
  raw_user_meta_data->>'name',
  'management',
  raw_user_meta_data->>'phone',
  created_at,
  updated_at
FROM auth.users
WHERE email = 'admin@elevatorapp.com';