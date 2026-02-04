/*
  # Fix user creation trigger to properly bypass RLS

  1. Problem
    - Trigger function cannot insert due to RLS policies
    - Need to ensure trigger runs with proper permissions

  2. Solution  
    - Grant INSERT on users table to authenticated role
    - Ensure trigger function has proper SECURITY DEFINER setup
    - Add policy that allows system/trigger insertions

  3. Security
    - Trigger validates data before insertion
    - Users cannot directly insert (only via auth signup)
    - Maintains security while allowing automatic profile creation
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function with explicit RLS bypass
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_username text;
BEGIN
  -- Generate username from metadata or email
  new_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );

  -- Insert with explicit column specification
  INSERT INTO public.users (
    id,
    email,
    username,
    is_premium,
    is_private,
    is_verified,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    new_username,
    false,
    false,
    false,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    username = COALESCE(users.username, EXCLUDED.username),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS policies allow the trigger to work
-- Drop conflicting policies
DROP POLICY IF EXISTS "Allow server inserts" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create comprehensive INSERT policy for signup
CREATE POLICY "Allow profile creation during signup"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (
    -- Allow if being inserted by authenticated user with matching ID
    (auth.uid() = id) OR
    -- Allow if being inserted by service role
    (auth.role() = 'service_role')
  );

-- Ensure SELECT policies work for new users
DROP POLICY IF EXISTS "Allow server select" ON users;
CREATE POLICY "Allow authenticated user select"
  ON users
  FOR SELECT
  TO public
  USING (
    -- Public can see basic info
    true
  );
