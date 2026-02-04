/*
  # Create User Activities Table

  ## Purpose
  Track all user activities related to games (ratings, reviews, comments, likes)
  to display friend activity feeds on the home page.

  ## New Tables
  - `user_activities`
    - `id` (uuid, primary key) - Unique activity identifier
    - `user_id` (uuid, foreign key) - User who performed the activity
    - `game_id` (text) - Game identifier (can be slug or numeric ID)
    - `game_name` (text) - Game name for quick display
    - `game_image` (text) - Game cover image URL
    - `activity_type` (text) - Type of activity: 'rating', 'review', 'comment', 'like'
    - `activity_data` (jsonb) - Additional data (rating value, review text, etc.)
    - `created_at` (timestamptz) - Activity timestamp

  ## Indexes
  - Index on `user_id` for efficient user activity queries
  - Index on `created_at` for chronological ordering
  - Composite index on `user_id` and `created_at` for friend feeds

  ## Security
  - Enable RLS on the table
  - Users can create their own activities
  - Users can view activities from users they follow
  - Public read access for non-private activities
*/

-- Create user_activities table
CREATE TABLE IF NOT EXISTS user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  game_name text NOT NULL,
  game_image text,
  activity_type text NOT NULL CHECK (activity_type IN ('rating', 'review', 'comment', 'like', 'follow_game')),
  activity_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id 
  ON user_activities(user_id);

CREATE INDEX IF NOT EXISTS idx_user_activities_created_at 
  ON user_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activities_user_created 
  ON user_activities(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activities_game_id 
  ON user_activities(game_id);

-- Enable RLS
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create their own activities
CREATE POLICY "Users can create own activities"
  ON user_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own activities
CREATE POLICY "Users can view own activities"
  ON user_activities
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can view activities from users they follow
CREATE POLICY "Users can view friends activities"
  ON user_activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM follows
      WHERE follows.user_id = auth.uid()
      AND follows.friend_id = user_activities.user_id
    )
  );

-- Policy: Public can view activities from non-private users
CREATE POLICY "Public can view non-private activities"
  ON user_activities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = user_activities.user_id
      AND (users.is_private = false OR users.is_private IS NULL)
    )
  );

-- Function to automatically create activity when user rates a game
CREATE OR REPLACE FUNCTION create_rating_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_activities (
    user_id,
    game_id,
    game_name,
    game_image,
    activity_type,
    activity_data
  )
  VALUES (
    NEW.user_id,
    NEW.game_id,
    NEW.game_slug,
    NULL,
    'rating',
    jsonb_build_object(
      'rating', NEW.rating,
      'review_text', NEW.review_text
    )
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create activity when rating is inserted or updated
DROP TRIGGER IF EXISTS trigger_create_rating_activity ON game_ratings;
CREATE TRIGGER trigger_create_rating_activity
  AFTER INSERT OR UPDATE ON game_ratings
  FOR EACH ROW
  EXECUTE FUNCTION create_rating_activity();

-- Function to get friends' recent activities
CREATE OR REPLACE FUNCTION get_friends_activities(
  p_user_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  user_avatar text,
  game_id text,
  game_name text,
  game_image text,
  activity_type text,
  activity_data jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.id,
    ua.user_id,
    u.username,
    u.avatar_url as user_avatar,
    ua.game_id,
    ua.game_name,
    ua.game_image,
    ua.activity_type,
    ua.activity_data,
    ua.created_at
  FROM user_activities ua
  INNER JOIN users u ON ua.user_id = u.id
  WHERE ua.user_id IN (
    SELECT friend_id 
    FROM follows 
    WHERE user_id = p_user_id
  )
  AND (u.is_private = false OR u.is_private IS NULL)
  ORDER BY ua.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
