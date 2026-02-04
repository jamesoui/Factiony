/*
  # Fix username constraints and clean follows table

  1. Changes to users table
    - Fix existing usernames that have literal string values
    - Make each username unique
    - Add UNIQUE constraint
    - Add index for username search

  2. Changes to follows table
    - Clean up structure to use only follower_id and followed_id
    - Remove redundant user_id and friend_id columns
    - Add unique constraint to prevent duplicate follows
    - Add indexes for performance

  3. Security
    - Add RLS policies for follows table
    - Users can follow/unfollow anyone
    - Users can see who follows them and who they follow
    - Only public profiles can be viewed by others
*/

-- Step 1: Fix existing usernames with proper unique values
DO $$
DECLARE
  user_record RECORD;
  new_username TEXT;
  counter INTEGER := 1;
BEGIN
  FOR user_record IN 
    SELECT id, email, username 
    FROM users 
    WHERE username IS NULL 
       OR username = '' 
       OR username = '''user_'' || id'
       OR username = 'user_' || id::text
  LOOP
    -- Generate username from email
    new_username := split_part(user_record.email, '@', 1);
    
    -- Check if username already exists and add counter if needed
    WHILE EXISTS (SELECT 1 FROM users WHERE username = new_username AND id != user_record.id) LOOP
      new_username := split_part(user_record.email, '@', 1) || '_' || counter;
      counter := counter + 1;
    END LOOP;
    
    -- Update the username
    UPDATE users SET username = new_username WHERE id = user_record.id;
    counter := 1;
  END LOOP;
END $$;

-- Step 2: Remove the old default value and set a proper one
ALTER TABLE users ALTER COLUMN username DROP DEFAULT;
ALTER TABLE users ALTER COLUMN username SET DEFAULT 'user';

-- Step 3: Make username NOT NULL
DO $$
BEGIN
  ALTER TABLE users ALTER COLUMN username SET NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Username column already NOT NULL or other error: %', SQLERRM;
END $$;

-- Step 4: Add unique constraint to username
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_username_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
  END IF;
END $$;

-- Step 5: Add index for username search (case-insensitive)
CREATE INDEX IF NOT EXISTS users_username_lower_idx ON users (LOWER(username));

-- Step 6: Drop ALL existing policies on follows table
DROP POLICY IF EXISTS "Users can manage their own follows" ON follows;
DROP POLICY IF EXISTS "Users can read own follows" ON follows;
DROP POLICY IF EXISTS "Insert follow" ON follows;
DROP POLICY IF EXISTS "Select own follows" ON follows;
DROP POLICY IF EXISTS "Users can view follows" ON follows;
DROP POLICY IF EXISTS "Users can follow others" ON follows;
DROP POLICY IF EXISTS "Users can unfollow" ON follows;

-- Step 7: Drop all policies on user_activities that reference follows
DROP POLICY IF EXISTS "Users can view friends activities" ON user_activities;

-- Step 8: Clean up follows table structure
-- First, migrate data to the new columns if needed
DO $$
BEGIN
  -- Copy user_id to follower_id if follower_id is null
  UPDATE follows 
  SET follower_id = user_id 
  WHERE follower_id IS NULL AND user_id IS NOT NULL;
  
  -- Copy friend_id to followed_id if followed_id is null
  UPDATE follows 
  SET followed_id = friend_id 
  WHERE followed_id IS NULL AND friend_id IS NOT NULL;
  
  -- Delete rows where we can't determine follower/followed
  DELETE FROM follows 
  WHERE follower_id IS NULL OR followed_id IS NULL;
END $$;

-- Step 9: Drop old foreign keys
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follows_user_id_fkey') THEN
    ALTER TABLE follows DROP CONSTRAINT follows_user_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follows_friend_id_fkey') THEN
    ALTER TABLE follows DROP CONSTRAINT follows_friend_id_fkey;
  END IF;
END $$;

-- Step 10: Now drop the old columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follows' AND column_name = 'user_id') THEN
    ALTER TABLE follows DROP COLUMN user_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'follows' AND column_name = 'friend_id') THEN
    ALTER TABLE follows DROP COLUMN friend_id;
  END IF;
END $$;

-- Step 11: Make follower_id and followed_id NOT NULL
DO $$
BEGIN
  ALTER TABLE follows ALTER COLUMN follower_id SET NOT NULL;
  ALTER TABLE follows ALTER COLUMN followed_id SET NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Columns already NOT NULL or other error: %', SQLERRM;
END $$;

-- Step 12: Add unique constraint to prevent duplicate follows
DO $$
BEGIN
  -- Drop if exists first
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'follows_follower_followed_unique') THEN
    ALTER TABLE follows DROP CONSTRAINT follows_follower_followed_unique;
  END IF;
  
  -- Delete duplicates before adding constraint
  DELETE FROM follows a USING follows b
  WHERE a.id < b.id 
    AND a.follower_id = b.follower_id 
    AND a.followed_id = b.followed_id;
  
  -- Add constraint
  ALTER TABLE follows ADD CONSTRAINT follows_follower_followed_unique 
    UNIQUE (follower_id, followed_id);
END $$;

-- Step 13: Add check constraint to prevent self-following
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'follows_no_self_follow'
  ) THEN
    -- Delete any self-follows first
    DELETE FROM follows WHERE follower_id = followed_id;
    
    ALTER TABLE follows ADD CONSTRAINT follows_no_self_follow 
      CHECK (follower_id != followed_id);
  END IF;
END $$;

-- Step 14: Add indexes for follows queries
CREATE INDEX IF NOT EXISTS follows_follower_idx ON follows (follower_id);
CREATE INDEX IF NOT EXISTS follows_followed_idx ON follows (followed_id);

-- Step 15: RLS Policies for follows table

-- Allow authenticated users to view all follows
CREATE POLICY "Users can view all follows"
  ON follows
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to follow others
CREATE POLICY "Users can follow others"
  ON follows
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = follower_id AND
    follower_id != followed_id
  );

-- Allow users to unfollow (delete their own follows)
CREATE POLICY "Users can unfollow"
  ON follows
  FOR DELETE
  TO authenticated
  USING (auth.uid() = follower_id);

-- Step 16: RLS Policies for users table

-- Allow everyone to view public profiles
DROP POLICY IF EXISTS "Allow authenticated user select" ON users;
DROP POLICY IF EXISTS "Users can view public profiles" ON users;

CREATE POLICY "Users can view public profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see their own profile
    auth.uid() = id OR
    -- Users can see public profiles
    is_private = false
  );

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Step 17: Update the trigger function to use username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_username text;
  counter integer := 1;
BEGIN
  -- Try to get username from metadata, fallback to email-based
  new_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );

  -- Ensure username is unique by adding counter if needed
  WHILE EXISTS (SELECT 1 FROM users WHERE username = new_username) LOOP
    new_username := COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ) || '_' || counter;
    counter := counter + 1;
  END LOOP;

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
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;
