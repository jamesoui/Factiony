/*
  # Fix user profile creation RLS policy

  1. Problem
    - Trigger cannot insert into users table due to RLS restrictions
    - Need to allow authenticated users to create their own profile

  2. Solution
    - Add INSERT policy allowing users to create their own profile
    - Update trigger function to properly handle user creation

  3. Security
    - Users can only insert their own profile (id = auth.uid())
    - Maintains data integrity and security
*/

-- Drop existing trigger to recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function with better RLS handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, username, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add INSERT policy for authenticated users to create their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Grant necessary permissions to the function owner
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
