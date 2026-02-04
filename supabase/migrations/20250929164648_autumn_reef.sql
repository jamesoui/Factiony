/*
  # Add missing columns to users table

  1. Missing Columns
    - `is_premium` (boolean) - Premium subscription status
    - `is_private` (boolean) - Private account setting
    - `is_verified` (boolean) - Verified account badge
    - `username` (text) - User display name
    - `avatar_url` (text) - Profile picture URL
    - `bio` (text) - User biography
    - `location` (text) - User location
    - `website` (text) - User website
    - `banner_url` (text) - Profile banner URL
    - `join_date` (timestamp) - Account creation date
    - `updated_at` (timestamp) - Last update timestamp

  2. Safety
    - Use IF NOT EXISTS to prevent errors if columns already exist
    - Set appropriate default values
    - Maintain existing data integrity
*/

-- Add missing boolean columns with default values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE users ADD COLUMN is_premium boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_private'
  ) THEN
    ALTER TABLE users ADD COLUMN is_private boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN is_verified boolean DEFAULT false;
  END IF;
END $$;

-- Add missing text columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'username'
  ) THEN
    ALTER TABLE users ADD COLUMN username text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'bio'
  ) THEN
    ALTER TABLE users ADD COLUMN bio text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'location'
  ) THEN
    ALTER TABLE users ADD COLUMN location text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'website'
  ) THEN
    ALTER TABLE users ADD COLUMN website text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'banner_url'
  ) THEN
    ALTER TABLE users ADD COLUMN banner_url text;
  END IF;
END $$;

-- Add missing timestamp columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'join_date'
  ) THEN
    ALTER TABLE users ADD COLUMN join_date timestamptz DEFAULT now();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE users ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_users_updated_at'
  ) THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Update existing users to have default username if null
UPDATE users 
SET username = split_part(email, '@', 1)
WHERE username IS NULL;

-- Create index on username for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_premium ON users(is_premium);
CREATE INDEX IF NOT EXISTS idx_users_is_private ON users(is_private);
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);