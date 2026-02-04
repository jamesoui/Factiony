/*
  # Create follows table

  1. New Tables
    - `follows`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users - who is following)
      - `friend_id` (uuid, foreign key to users - who is being followed)
      - `created_at` (timestamp, default now())

  2. Security
    - Enable RLS on `follows` table
    - Add policy for users to manage their own follows
    - Add policy for users to see who follows them
    - Add trigger to check follow privacy

  3. Constraints
    - Foreign keys to users table with CASCADE delete
    - Unique constraint on (user_id, friend_id) to prevent duplicates
    - Check constraint to prevent self-following

  4. Functions
    - Function to check follow privacy
    - Function to get follower count
    - Function to get following count
    - Function to check if user is following another
*/

-- Create function to check follow privacy
CREATE OR REPLACE FUNCTION check_follow_privacy()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if target user is private
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = NEW.friend_id AND is_private = true
  ) THEN
    RAISE EXCEPTION 'Cannot follow private account';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get follower count
CREATE OR REPLACE FUNCTION get_follower_count(target_user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM follows
    WHERE friend_id = target_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get following count
CREATE OR REPLACE FUNCTION get_following_count(target_user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM follows
    WHERE user_id = target_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if following
CREATE OR REPLACE FUNCTION is_following(follower_id uuid, followed_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM follows
    WHERE user_id = follower_id AND friend_id = followed_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT follows_unique_pair UNIQUE (user_id, friend_id),
  CONSTRAINT follows_no_self_follow CHECK (user_id != friend_id)
);

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own follows" ON follows;
DROP POLICY IF EXISTS "Users can see who follows them" ON follows;

-- Create policies
CREATE POLICY "Users can manage their own follows"
  ON follows
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can see who follows them"
  ON follows
  FOR SELECT
  TO authenticated
  USING (auth.uid() = friend_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_follows_user_id ON follows(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_friend_id ON follows(friend_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at);

-- Create trigger for privacy check
DROP TRIGGER IF EXISTS trigger_check_follow_privacy ON follows;
CREATE TRIGGER trigger_check_follow_privacy
  BEFORE INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION check_follow_privacy();