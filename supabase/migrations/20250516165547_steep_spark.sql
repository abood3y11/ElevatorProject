/*
  # Admin User Setup

  1. Updates
    - Remove email field from handle_new_user function
    - Create admin user
    - Create admin profile
    
  2. Changes
    - Simplified user creation without ON CONFLICT
    - Proper role handling
    - Removed unnecessary fields
*/

-- Update handle_new_user function to remove email field
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name)
  VALUES (
    new.id,
    COALESCE(
      (new.raw_user_meta_data->>'role')::text,
      'client'
    ),
    COALESCE(new.raw_user_meta_data->>'name', 'Anonymous')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create admin user with proper metadata
DO $$ 
DECLARE 
  admin_id uuid := gen_random_uuid();
BEGIN
  -- Insert admin user
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
    admin_id,
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
  );

  -- Create admin profile
  INSERT INTO public.profiles (
    id,
    name,
    role
  ) VALUES (
    admin_id,
    'System Administrator',
    'management'
  );
END $$;