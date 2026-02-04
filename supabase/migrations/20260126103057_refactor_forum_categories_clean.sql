/*
  # Refactor Forum to Categories System - Clean Version

  1. Changes
    - Create new `forum_categories` table with 4 fixed categories
    - Modify `forum_threads` to use categories instead of sections
    - Remove old policies and constraints
    - Remove `forum_sections`, `forum_custom_sections`, `forum_thread_tags`
    - Update `forum_thread_likes` and `forum_post_likes` to use composite PKs
    - Add `like_count` to threads and posts
    - Add triggers to maintain counters
    - Add full-text search indexes

  2. Security
    - Replace old RLS policies with new simplified ones
    - Public read access for all forum content
    - Authenticated write access

  3. Data Migration
    - Categories are pre-populated
    - Existing threads migrated to 'community' category
*/

-- Step 1: Drop old RLS policies that depend on custom_section_id
DROP POLICY IF EXISTS "Custom section creators can delete threads in their sections" ON forum_threads;
DROP POLICY IF EXISTS "Custom section creators can moderate threads" ON forum_threads;
DROP POLICY IF EXISTS "Authors can delete their threads" ON forum_threads;
DROP POLICY IF EXISTS "Authors can update their threads" ON forum_threads;
DROP POLICY IF EXISTS "Authenticated users can create threads" ON forum_threads;
DROP POLICY IF EXISTS "Anyone can view threads" ON forum_threads;

-- Step 2: Drop old foreign key constraints
DO $$
BEGIN
  ALTER TABLE forum_threads DROP CONSTRAINT IF EXISTS forum_threads_section_id_fkey;
  ALTER TABLE forum_threads DROP CONSTRAINT IF EXISTS forum_threads_custom_section_id_fkey;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Step 3: Create forum_categories table
CREATE TABLE IF NOT EXISTS forum_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on forum_categories
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;

-- Policy for public read access
DROP POLICY IF EXISTS "Anyone can view categories" ON forum_categories;
CREATE POLICY "Anyone can view categories"
  ON forum_categories FOR SELECT
  TO public
  USING (true);

-- Insert the 4 fixed categories
INSERT INTO forum_categories (key, name, description, icon, sort_order) VALUES
  ('announcements', 'Annonces & Mises à jour', 'Actualités officielles, patchs et mises à jour du jeu', 'Megaphone', 1),
  ('guides', 'Guides & Questions', 'Tutoriels, astuces, aide et questions sur le gameplay', 'BookOpen', 2),
  ('support', 'Bugs & Support', 'Signaler des bugs, problèmes techniques et demander de l''aide', 'Bug', 3),
  ('community', 'Discussions & Communauté', 'Discussions générales, partage d''expériences et échanges', 'MessageCircle', 4)
ON CONFLICT (key) DO NOTHING;

-- Step 4: Modify forum_threads table
DO $$
BEGIN
  -- Add category_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forum_threads' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE forum_threads ADD COLUMN category_id uuid;
  END IF;

  -- Add like_count if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forum_threads' AND column_name = 'like_count'
  ) THEN
    ALTER TABLE forum_threads ADD COLUMN like_count integer DEFAULT 0;
  END IF;

  -- Rename content to body if content exists and body doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forum_threads' AND column_name = 'content'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forum_threads' AND column_name = 'body'
  ) THEN
    ALTER TABLE forum_threads RENAME COLUMN content TO body;
  END IF;

  -- Set default category for existing threads (if any)
  UPDATE forum_threads 
  SET category_id = (SELECT id FROM forum_categories WHERE key = 'community' LIMIT 1)
  WHERE category_id IS NULL;

  -- Drop old columns
  ALTER TABLE forum_threads DROP COLUMN IF EXISTS section_id;
  ALTER TABLE forum_threads DROP COLUMN IF EXISTS custom_section_id;

  -- Add FK constraint for category_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'forum_threads_category_id_fkey'
  ) THEN
    ALTER TABLE forum_threads ADD CONSTRAINT forum_threads_category_id_fkey 
      FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE CASCADE;
  END IF;

  -- Make category_id NOT NULL after setting defaults
  ALTER TABLE forum_threads ALTER COLUMN category_id SET NOT NULL;
END $$;

-- Add indexes for forum_threads
CREATE INDEX IF NOT EXISTS idx_forum_threads_game_category ON forum_threads(game_id, category_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_category_id ON forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_last_activity ON forum_threads(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_threads_search ON forum_threads USING gin(to_tsvector('english', title || ' ' || body));

-- Step 5: Recreate RLS policies for forum_threads
CREATE POLICY "Anyone can view threads"
  ON forum_threads FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create threads"
  ON forum_threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own threads"
  ON forum_threads FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can delete own threads"
  ON forum_threads FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- Step 6: Modify forum_posts table
DO $$
BEGIN
  -- Add like_count if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forum_posts' AND column_name = 'like_count'
  ) THEN
    ALTER TABLE forum_posts ADD COLUMN like_count integer DEFAULT 0;
  END IF;

  -- Rename content to body if content exists and body doesn't
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forum_posts' AND column_name = 'content'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forum_posts' AND column_name = 'body'
  ) THEN
    ALTER TABLE forum_posts RENAME COLUMN content TO body;
  END IF;
END $$;

-- Add indexes for forum_posts
CREATE INDEX IF NOT EXISTS idx_forum_posts_search ON forum_posts USING gin(to_tsvector('english', body));
CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON forum_posts(created_at);

-- Step 7: Modify forum_thread_likes to use composite PK
DO $$
BEGIN
  -- Check if the old structure exists (with id column)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forum_thread_likes' AND column_name = 'id'
  ) THEN
    -- Drop existing PK constraint
    ALTER TABLE forum_thread_likes DROP CONSTRAINT IF EXISTS forum_thread_likes_pkey;
    -- Drop id column
    ALTER TABLE forum_thread_likes DROP COLUMN id;
    -- Add composite PK
    ALTER TABLE forum_thread_likes ADD PRIMARY KEY (thread_id, user_id);
  END IF;
END $$;

-- Add index for forum_thread_likes
CREATE INDEX IF NOT EXISTS idx_forum_thread_likes_user_id ON forum_thread_likes(user_id);

-- Step 8: Modify forum_post_likes to use composite PK
DO $$
BEGIN
  -- Check if the old structure exists (with id column)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forum_post_likes' AND column_name = 'id'
  ) THEN
    -- Drop existing PK constraint
    ALTER TABLE forum_post_likes DROP CONSTRAINT IF EXISTS forum_post_likes_pkey;
    -- Drop id column
    ALTER TABLE forum_post_likes DROP COLUMN id;
    -- Add composite PK
    ALTER TABLE forum_post_likes ADD PRIMARY KEY (post_id, user_id);
  END IF;
END $$;

-- Add index for forum_post_likes
CREATE INDEX IF NOT EXISTS idx_forum_post_likes_user_id ON forum_post_likes(user_id);

-- Step 9: Create or replace trigger functions
CREATE OR REPLACE FUNCTION update_thread_on_post_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_threads
    SET 
      reply_count = reply_count + 1,
      last_activity_at = NEW.created_at
    WHERE id = NEW.thread_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_threads
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.thread_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for post changes
DROP TRIGGER IF EXISTS trigger_update_thread_on_post_insert ON forum_posts;
CREATE TRIGGER trigger_update_thread_on_post_insert
  AFTER INSERT ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_on_post_change();

DROP TRIGGER IF EXISTS trigger_update_thread_on_post_delete ON forum_posts;
CREATE TRIGGER trigger_update_thread_on_post_delete
  AFTER DELETE ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_on_post_change();

-- Create function for thread like count
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

-- Create triggers for thread likes
DROP TRIGGER IF EXISTS trigger_update_thread_like_count_insert ON forum_thread_likes;
CREATE TRIGGER trigger_update_thread_like_count_insert
  AFTER INSERT ON forum_thread_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_like_count();

DROP TRIGGER IF EXISTS trigger_update_thread_like_count_delete ON forum_thread_likes;
CREATE TRIGGER trigger_update_thread_like_count_delete
  AFTER DELETE ON forum_thread_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_like_count();

-- Create function for post like count
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

-- Create triggers for post likes
DROP TRIGGER IF EXISTS trigger_update_post_like_count_insert ON forum_post_likes;
CREATE TRIGGER trigger_update_post_like_count_insert
  AFTER INSERT ON forum_post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_like_count();

DROP TRIGGER IF EXISTS trigger_update_post_like_count_delete ON forum_post_likes;
CREATE TRIGGER trigger_update_post_like_count_delete
  AFTER DELETE ON forum_post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_like_count();

-- Step 10: Drop old tables
DROP TABLE IF EXISTS forum_thread_tags CASCADE;
DROP TABLE IF EXISTS forum_custom_sections CASCADE;
DROP TABLE IF EXISTS forum_sections CASCADE;
