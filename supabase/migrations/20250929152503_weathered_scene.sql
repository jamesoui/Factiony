/*
  # Create follows table

  1. New Tables
    - `follows`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `friend_id` (uuid, foreign key to users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `follows` table
    - Add policies for users to manage their own follows
    - Add trigger to prevent following private accounts

  3. Constraints
    - Unique constraint on (user_id, friend_id)
    - Check constraint to prevent self-following

  4. Functions
    - Helper functions for checking follows and counting
*/

CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT follows_unique_pair UNIQUE (user_id, friend_id),
  CONSTRAINT follows_no_self_follow CHECK (user_id != friend_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_follows_user_id ON follows(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_friend_id ON follows(friend_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at);

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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

-- Function to check if user is following another user
CREATE OR REPLACE FUNCTION is_following(follower_id uuid, followed_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows 
    WHERE user_id = follower_id AND friend_id = followed_id
  );
$$;

-- Function to get follower count
CREATE OR REPLACE FUNCTION get_follower_count(target_user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer FROM follows WHERE friend_id = target_user_id;
$$;

-- Function to get following count
CREATE OR REPLACE FUNCTION get_following_count(target_user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer FROM follows WHERE user_id = target_user_id;
$$;

-- Function to check if account is private before following
CREATE OR REPLACE FUNCTION check_follow_privacy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the target user has a private account
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = NEW.friend_id AND is_private = true
  ) THEN
    RAISE EXCEPTION 'Cannot follow private account';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to check privacy before inserting follow
CREATE TRIGGER trigger_check_follow_privacy
  BEFORE INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION check_follow_privacy();