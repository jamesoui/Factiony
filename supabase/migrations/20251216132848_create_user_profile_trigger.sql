/*
  # Create automatic user profile trigger

  1. Purpose
    - Automatically create a profile in public.users when a user signs up via auth.users
    - This ensures every authenticated user has a corresponding profile

  2. Changes
    - Create function to handle new user creation
    - Create trigger on auth.users to call this function
    - Ensure profile is created with default values

  3. Security
    - Function runs with SECURITY DEFINER to bypass RLS
    - Only creates profile if it doesn't already exist
*/

-- Function to create user profile automatically
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
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || NEW.id),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
