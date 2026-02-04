/*
  # Fix Forum Likes and Add Nested Replies

  ## Overview
  This migration fixes the like counting system for forum threads and posts, 
  and adds support for nested replies (replying to specific posts).

  ## 1. Changes to Tables
  
  ### `forum_posts`
  - Add `parent_post_id` (uuid, nullable) - Reference to parent post for nested replies

  ## 2. Triggers for Like Counting
  - Automatic increment/decrement of like_count in forum_threads when likes are added/removed
  - Automatic increment/decrement of like_count in forum_posts when likes are added/removed

  ## 3. Indexes
  - Add index on parent_post_id for better performance on nested replies

  ## 4. Security
  - No changes to RLS policies - existing policies remain in effect
*/

-- Add parent_post_id column to forum_posts for nested replies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'forum_posts' AND column_name = 'parent_post_id'
  ) THEN
    ALTER TABLE forum_posts ADD COLUMN parent_post_id uuid REFERENCES forum_posts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create index on parent_post_id
CREATE INDEX IF NOT EXISTS idx_forum_posts_parent_post_id ON forum_posts(parent_post_id);

-- Function to update thread like count
CREATE OR REPLACE FUNCTION update_thread_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_threads
    SET like_count = like_count + 1
    WHERE id = NEW.thread_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_threads
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.thread_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for thread likes
DROP TRIGGER IF EXISTS trigger_update_thread_like_count ON forum_thread_likes;
CREATE TRIGGER trigger_update_thread_like_count
AFTER INSERT OR DELETE ON forum_thread_likes
FOR EACH ROW
EXECUTE FUNCTION update_thread_like_count();

-- Function to update post like count
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts
    SET like_count = like_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for post likes
DROP TRIGGER IF EXISTS trigger_update_post_like_count ON forum_post_likes;
CREATE TRIGGER trigger_update_post_like_count
AFTER INSERT OR DELETE ON forum_post_likes
FOR EACH ROW
EXECUTE FUNCTION update_post_like_count();

-- Recalculate existing like counts for threads
UPDATE forum_threads t
SET like_count = (
  SELECT COUNT(*)
  FROM forum_thread_likes
  WHERE thread_id = t.id
);

-- Recalculate existing like counts for posts
UPDATE forum_posts p
SET like_count = (
  SELECT COUNT(*)
  FROM forum_post_likes
  WHERE post_id = p.id
);
