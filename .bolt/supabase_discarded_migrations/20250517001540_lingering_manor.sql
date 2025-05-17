/*
  # Initial Schema Setup

  1. Types
    - Creates user_role enum
    - Creates maintenance_status enum
    - Creates maintenance_type enum
    - Creates contract_status enum
    - Creates elevator_status enum

  2. Tables
    - Creates profiles table with role management
    - Enables RLS and adds policies

  3. Functions
    - Creates handle_new_user trigger function for automatic profile creation
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('customer', 'employee', 'admin');
CREATE TYPE maintenance_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed');
CREATE TYPE maintenance_type AS ENUM ('immediate', 'scheduled');
CREATE TYPE contract_status AS ENUM ('active', 'pending', 'expired', 'cancelled');
CREATE TYPE elevator_status AS ENUM ('operational', 'maintenance', 'out_of_service');

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  role user_role NOT NULL DEFAULT 'customer'::user_role,
  department text,
  position text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    role,
    department,
    position
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Anonymous'),
    COALESCE(
      (new.raw_user_meta_data->>'role')::user_role,
      'customer'::user_role
    ),
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'position'
  );
  RETURN new;
END;
$$;

-- Create trigger for new user handling
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();