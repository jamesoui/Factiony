/*
  # Create Complete Social Interactions System
  
  1. Schema Changes
    - Add `parent_id` to `activity_comments` for threaded replies
    - Create `comment_likes` table for liking comments
    - Create `user_notifications` table for social notifications
    
  2. New Tables
    - `comment_likes`
      - `id` (uuid, primary key)
      - `comment_id` (uuid, foreign key to activity_comments)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      
    - `user_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users) - Who receives the notification
      - `actor_id` (uuid, foreign key to auth.users) - Who performed the action
      - `notification_type` (text) - Type: comment_like, comment_reply, activity_like, activity_comment
      - `reference_id` (uuid) - ID of the liked/commented item
      - `reference_type` (text) - Type: activity, comment
      - `message` (text) - Notification message
      - `read` (boolean) - Read status
      - `created_at` (timestamptz)
      
  3. Functions & Triggers
    - Trigger to create notification when activity is liked
    - Trigger to create notification when activity is commented
    - Trigger to create notification when comment is liked
    - Trigger to create notification when comment receives a reply
    
  4. Security
    - Enable RLS on all new tables
    - Users can only read their own notifications
    - Users can like/unlike any content
    - Users can reply to any comment
*/

-- Add parent_id to activity_comments for threaded replies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_comments' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE activity_comments ADD COLUMN parent_id uuid REFERENCES activity_comments(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_activity_comments_parent_id ON activity_comments(parent_id);
  END IF;
END $$;

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES activity_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);

-- Enable RLS on comment_likes
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Policies for comment_likes
CREATE POLICY "Users can view all comment likes"
  ON comment_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comment likes"
  ON comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comment likes"
  ON comment_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create user_notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (
    notification_type IN ('comment_like', 'comment_reply', 'activity_like', 'activity_comment')
  ),
  reference_id uuid NOT NULL,
  reference_type text NOT NULL CHECK (reference_type IN ('activity', 'comment')),
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);

-- Enable RLS on user_notifications
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for user_notifications
CREATE POLICY "Users can read own notifications"
  ON user_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON user_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to create notification for activity like
CREATE OR REPLACE FUNCTION notify_activity_like()
RETURNS TRIGGER AS $$
DECLARE
  activity_owner_id uuid;
  actor_username text;
  game_name_var text;
BEGIN
  -- Get the owner of the activity
  SELECT user_id, game_name INTO activity_owner_id, game_name_var
  FROM user_activities
  WHERE id = NEW.activity_id;
  
  -- Don't notify if user likes their own activity
  IF activity_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get actor username
  SELECT username INTO actor_username
  FROM users
  WHERE id = NEW.user_id;
  
  -- Create notification
  INSERT INTO user_notifications (
    user_id,
    actor_id,
    notification_type,
    reference_id,
    reference_type,
    message
  ) VALUES (
    activity_owner_id,
    NEW.user_id,
    'activity_like',
    NEW.activity_id,
    'activity',
    actor_username || ' a aimé votre activité sur ' || game_name_var
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for activity likes
DROP TRIGGER IF EXISTS notify_on_activity_like ON activity_likes;
CREATE TRIGGER notify_on_activity_like
  AFTER INSERT ON activity_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_activity_like();

-- Function to create notification for activity comment
CREATE OR REPLACE FUNCTION notify_activity_comment()
RETURNS TRIGGER AS $$
DECLARE
  activity_owner_id uuid;
  actor_username text;
  game_name_var text;
BEGIN
  -- Get the owner of the activity
  SELECT user_id, game_name INTO activity_owner_id, game_name_var
  FROM user_activities
  WHERE id = NEW.activity_id;
  
  -- Don't notify if user comments on their own activity
  IF activity_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get actor username
  SELECT username INTO actor_username
  FROM users
  WHERE id = NEW.user_id;
  
  -- Create notification
  INSERT INTO user_notifications (
    user_id,
    actor_id,
    notification_type,
    reference_id,
    reference_type,
    message
  ) VALUES (
    activity_owner_id,
    NEW.user_id,
    'activity_comment',
    NEW.activity_id,
    'activity',
    actor_username || ' a commenté votre activité sur ' || game_name_var
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for activity comments
DROP TRIGGER IF EXISTS notify_on_activity_comment ON activity_comments;
CREATE TRIGGER notify_on_activity_comment
  AFTER INSERT ON activity_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_activity_comment();

-- Function to create notification for comment like
CREATE OR REPLACE FUNCTION notify_comment_like()
RETURNS TRIGGER AS $$
DECLARE
  comment_owner_id uuid;
  actor_username text;
BEGIN
  -- Get the owner of the comment
  SELECT user_id INTO comment_owner_id
  FROM activity_comments
  WHERE id = NEW.comment_id;
  
  -- Don't notify if user likes their own comment
  IF comment_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get actor username
  SELECT username INTO actor_username
  FROM users
  WHERE id = NEW.user_id;
  
  -- Create notification
  INSERT INTO user_notifications (
    user_id,
    actor_id,
    notification_type,
    reference_id,
    reference_type,
    message
  ) VALUES (
    comment_owner_id,
    NEW.user_id,
    'comment_like',
    NEW.comment_id,
    'comment',
    actor_username || ' a aimé votre commentaire'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment likes
DROP TRIGGER IF EXISTS notify_on_comment_like ON comment_likes;
CREATE TRIGGER notify_on_comment_like
  AFTER INSERT ON comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_like();

-- Function to create notification for comment reply
CREATE OR REPLACE FUNCTION notify_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
  parent_comment_owner_id uuid;
  actor_username text;
BEGIN
  -- Only notify if this is a reply (has parent_id)
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get the owner of the parent comment
  SELECT user_id INTO parent_comment_owner_id
  FROM activity_comments
  WHERE id = NEW.parent_id;
  
  -- Don't notify if user replies to their own comment
  IF parent_comment_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;
  
  -- Get actor username
  SELECT username INTO actor_username
  FROM users
  WHERE id = NEW.user_id;
  
  -- Create notification
  INSERT INTO user_notifications (
    user_id,
    actor_id,
    notification_type,
    reference_id,
    reference_type,
    message
  ) VALUES (
    parent_comment_owner_id,
    NEW.user_id,
    'comment_reply',
    NEW.parent_id,
    'comment',
    actor_username || ' a répondu à votre commentaire'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment replies
DROP TRIGGER IF EXISTS notify_on_comment_reply ON activity_comments;
CREATE TRIGGER notify_on_comment_reply
  AFTER INSERT ON activity_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_comment_reply();