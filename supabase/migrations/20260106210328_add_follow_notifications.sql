/*
  # Add Follow Notifications

  1. Schema Changes
    - Add 'new_follower' to notification_type constraint in user_notifications table
    - Create trigger to generate notification when a user is followed

  2. New Trigger Function
    - `notify_new_follower()` - Creates notification when someone follows a user

  3. Security
    - Maintains existing RLS policies
    - Trigger runs with SECURITY DEFINER to bypass RLS
*/

-- Drop existing constraint and add new one with 'new_follower' type
DO $$
BEGIN
  -- Drop the old constraint
  ALTER TABLE user_notifications
    DROP CONSTRAINT IF EXISTS user_notifications_notification_type_check;

  -- Add new constraint with 'new_follower' included
  ALTER TABLE user_notifications
    ADD CONSTRAINT user_notifications_notification_type_check
    CHECK (notification_type IN ('comment_like', 'comment_reply', 'activity_like', 'activity_comment', 'new_follower'));
END $$;

-- Function to create notification when someone follows a user
CREATE OR REPLACE FUNCTION notify_new_follower()
RETURNS TRIGGER AS $$
DECLARE
  follower_username text;
BEGIN
  -- Get follower username
  SELECT username INTO follower_username
  FROM users
  WHERE id = NEW.follower_id;

  -- Create notification for the followed user
  INSERT INTO user_notifications (
    user_id,
    actor_id,
    notification_type,
    reference_id,
    reference_type,
    message
  ) VALUES (
    NEW.followed_id,
    NEW.follower_id,
    'new_follower',
    NEW.id,
    'activity',
    follower_username || ' a commencé à vous suivre'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new followers
DROP TRIGGER IF EXISTS notify_on_new_follower ON follows;
CREATE TRIGGER notify_on_new_follower
  AFTER INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_follower();
