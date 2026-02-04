/*
  # Add Navigation Fields to User Notifications
  
  1. Schema Changes
    - Add `game_slug` column to user_notifications for deep-linking to game pages
    - Add `review_id` column for linking to specific reviews
    - Add `comment_id` column for linking to specific comments
    - These fields enable proper deep-linking when users click on notifications
  
  2. Notes
    - Fields are nullable since not all notification types need all fields
    - Existing notifications will have NULL for these fields
    - Future notifications should populate relevant fields based on type
*/

-- Add navigation fields to user_notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_notifications' AND column_name = 'game_slug'
  ) THEN
    ALTER TABLE user_notifications ADD COLUMN game_slug text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_notifications' AND column_name = 'review_id'
  ) THEN
    ALTER TABLE user_notifications ADD COLUMN review_id uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_notifications' AND column_name = 'comment_id'
  ) THEN
    ALTER TABLE user_notifications ADD COLUMN comment_id uuid;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_game_slug ON user_notifications(game_slug);
CREATE INDEX IF NOT EXISTS idx_user_notifications_review_id ON user_notifications(review_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_comment_id ON user_notifications(comment_id);
