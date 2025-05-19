/*
  # Create Admin User and Profile
  
  1. Creates an admin user in auth.users
  2. Creates corresponding profile in profiles table
  3. Sets proper role and metadata
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

-- Fix handle_new_user function to not use email column
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

-- Create profile for admin user
DO $$ 
DECLARE 
  admin_id uuid;
BEGIN
  -- Get the ID of the admin user we just created
  SELECT id INTO admin_id 
  FROM auth.users 
  WHERE email = 'admin@elevatorapp.com'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Create the profile if it doesn't exist
  INSERT INTO public.profiles (
    id,
    name,
    role,
    created_at,
    updated_at
  ) VALUES (
    admin_id,
    'System Administrator',
    'admin',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin',
      updated_at = now();
END $$;