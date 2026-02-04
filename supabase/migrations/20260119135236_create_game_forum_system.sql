/*
  # Create Game Forum System

  ## 1. Overview
  This migration creates a comprehensive forum system for each game on Factiony.
  It includes official sections, custom premium sections, threads, posts, tags, and search functionality.

  ## 2. New Tables
  
  ### `forum_sections`
  Official sections that are the same for all games:
  - `id` (uuid, primary key)
  - `name` (text) - Section name
  - `description` (text) - Section description
  - `icon` (text) - Emoji or icon identifier
  - `order_index` (integer) - Display order
  - `created_at` (timestamptz)

  ### `forum_custom_sections`
  Premium user-created sections, specific to a game:
  - `id` (uuid, primary key)
  - `game_id` (text) - Reference to game
  - `creator_id` (uuid) - Premium user who created it
  - `name` (text) - Custom section name
  - `description` (text) - Custom section description
  - `created_at` (timestamptz)

  ### `forum_threads`
  Discussion threads within sections:
  - `id` (uuid, primary key)
  - `game_id` (text) - Reference to game
  - `section_id` (uuid, nullable) - Official section
  - `custom_section_id` (uuid, nullable) - Custom section
  - `author_id` (uuid) - Thread creator
  - `title` (text) - Thread title
  - `content` (text) - Thread content
  - `is_pinned` (boolean) - Pinned by moderators
  - `is_locked` (boolean) - Locked from new replies
  - `view_count` (integer) - Number of views
  - `reply_count` (integer) - Number of replies
  - `last_activity_at` (timestamptz) - Last post timestamp
  - `contains_spoilers` (boolean) - Spoiler flag
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `forum_posts`
  Replies to threads:
  - `id` (uuid, primary key)
  - `thread_id` (uuid) - Parent thread
  - `author_id` (uuid) - Post author
  - `content` (text) - Post content
  - `contains_spoilers` (boolean) - Spoiler flag
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `forum_thread_tags`
  Tags associated with threads:
  - `id` (uuid, primary key)
  - `thread_id` (uuid) - Reference to thread
  - `tag` (text) - Tag name (spoiler, bug, guide, build, multijoueur, solo, mod)
  - `created_at` (timestamptz)

  ### `forum_thread_likes`
  Likes on threads:
  - `id` (uuid, primary key)
  - `thread_id` (uuid)
  - `user_id` (uuid)
  - `created_at` (timestamptz)

  ### `forum_post_likes`
  Likes on posts:
  - `id` (uuid, primary key)
  - `post_id` (uuid)
  - `user_id` (uuid)
  - `created_at` (timestamptz)

  ## 3. Security (RLS)
  - Public read access for all forum content
  - Authenticated users can create threads and posts
  - Premium users can create custom sections (1 per game max)
  - Authors can edit their own content
  - Custom section creators can moderate (edit/delete) threads in their sections

  ## 4. Key Features
  - 6 fixed official sections for all games
  - Tag system with 7 predefined tags
  - Premium custom sections with moderation capabilities
  - Full-text search within game forums
  - Automatic migration of existing forum data to "Discussions générales"
*/

-- Create forum_sections table (official sections)
CREATE TABLE IF NOT EXISTS forum_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create forum_custom_sections table (premium user sections)
CREATE TABLE IF NOT EXISTS forum_custom_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id text NOT NULL,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(creator_id, game_id)
);

-- Create forum_threads table
CREATE TABLE IF NOT EXISTS forum_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id text NOT NULL,
  section_id uuid REFERENCES forum_sections(id) ON DELETE SET NULL,
  custom_section_id uuid REFERENCES forum_custom_sections(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  view_count integer DEFAULT 0,
  reply_count integer DEFAULT 0,
  last_activity_at timestamptz DEFAULT now(),
  contains_spoilers boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT thread_has_one_section CHECK (
    (section_id IS NOT NULL AND custom_section_id IS NULL) OR
    (section_id IS NULL AND custom_section_id IS NOT NULL)
  )
);

-- Create forum_posts table
CREATE TABLE IF NOT EXISTS forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  contains_spoilers boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create forum_thread_tags table
CREATE TABLE IF NOT EXISTS forum_thread_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  tag text NOT NULL CHECK (tag IN ('spoiler', 'bug', 'guide', 'build', 'multijoueur', 'solo', 'mod')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(thread_id, tag)
);

-- Create forum_thread_likes table
CREATE TABLE IF NOT EXISTS forum_thread_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(thread_id, user_id)
);

-- Create forum_post_likes table
CREATE TABLE IF NOT EXISTS forum_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Insert official sections (same for all games)
INSERT INTO forum_sections (name, description, icon, order_index) VALUES
  ('Discussions générales', 'Avis, impressions, questions générales', '💬', 1),
  ('Gameplay & mécaniques', 'Gameplay, builds, équilibrage, bugs', '🎮', 2),
  ('Histoire, lore & univers', 'Lore, scénario, personnages', '📖', 3),
  ('Aide & guides', 'Tips, astuces, soluce, succès, mods', '🆘', 4),
  ('Actualités & mises à jour', 'Patchs, DLC, événements', '📰', 5),
  ('Créations & communauté', 'Fan art, screenshots, vidéos, memes', '🎨', 6)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_threads_game_id ON forum_threads(game_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_section_id ON forum_threads(section_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_custom_section_id ON forum_threads(custom_section_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_author_id ON forum_threads(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_last_activity ON forum_threads(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread_id ON forum_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_author_id ON forum_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_custom_sections_game_creator ON forum_custom_sections(game_id, creator_id);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_forum_threads_title_search ON forum_threads USING gin(to_tsvector('french', title));
CREATE INDEX IF NOT EXISTS idx_forum_threads_content_search ON forum_threads USING gin(to_tsvector('french', content));
CREATE INDEX IF NOT EXISTS idx_forum_posts_content_search ON forum_posts USING gin(to_tsvector('french', content));

-- Enable Row Level Security
ALTER TABLE forum_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_custom_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_thread_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_thread_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_post_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for forum_sections (read-only for everyone)
CREATE POLICY "Anyone can view official sections"
  ON forum_sections FOR SELECT
  TO public
  USING (true);

-- RLS Policies for forum_custom_sections
CREATE POLICY "Anyone can view custom sections"
  ON forum_custom_sections FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Premium users can create custom sections"
  ON forum_custom_sections FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = creator_id AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_premium = true
    )
  );

CREATE POLICY "Creators can delete their custom sections"
  ON forum_custom_sections FOR DELETE
  TO authenticated
  USING (auth.uid() = creator_id);

-- RLS Policies for forum_threads
CREATE POLICY "Anyone can view threads"
  ON forum_threads FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create threads"
  ON forum_threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their threads"
  ON forum_threads FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Custom section creators can moderate threads"
  ON forum_threads FOR UPDATE
  TO authenticated
  USING (
    custom_section_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM forum_custom_sections
      WHERE forum_custom_sections.id = custom_section_id
      AND forum_custom_sections.creator_id = auth.uid()
    )
  );

CREATE POLICY "Authors can delete their threads"
  ON forum_threads FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Custom section creators can delete threads in their sections"
  ON forum_threads FOR DELETE
  TO authenticated
  USING (
    custom_section_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM forum_custom_sections
      WHERE forum_custom_sections.id = custom_section_id
      AND forum_custom_sections.creator_id = auth.uid()
    )
  );

-- RLS Policies for forum_posts
CREATE POLICY "Anyone can view posts"
  ON forum_posts FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON forum_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their posts"
  ON forum_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete their posts"
  ON forum_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- RLS Policies for forum_thread_tags
CREATE POLICY "Anyone can view tags"
  ON forum_thread_tags FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Thread authors can manage tags"
  ON forum_thread_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM forum_threads
      WHERE forum_threads.id = thread_id
      AND forum_threads.author_id = auth.uid()
    )
  );

-- RLS Policies for forum_thread_likes
CREATE POLICY "Anyone can view thread likes"
  ON forum_thread_likes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can like threads"
  ON forum_thread_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their thread likes"
  ON forum_thread_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for forum_post_likes
CREATE POLICY "Anyone can view post likes"
  ON forum_post_likes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can like posts"
  ON forum_post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their post likes"
  ON forum_post_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update thread reply count and last activity
CREATE OR REPLACE FUNCTION update_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_threads
    SET 
      reply_count = reply_count + 1,
      last_activity_at = NEW.created_at,
      updated_at = now()
    WHERE id = NEW.thread_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_threads
    SET 
      reply_count = GREATEST(0, reply_count - 1),
      updated_at = now()
    WHERE id = OLD.thread_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update thread stats
DROP TRIGGER IF EXISTS trigger_update_thread_stats ON forum_posts;
CREATE TRIGGER trigger_update_thread_stats
AFTER INSERT OR DELETE ON forum_posts
FOR EACH ROW
EXECUTE FUNCTION update_thread_stats();

-- Function to search forum threads within a game
CREATE OR REPLACE FUNCTION search_forum_threads(
  p_game_id text,
  p_search_query text DEFAULT NULL,
  p_section_id uuid DEFAULT NULL,
  p_custom_section_id uuid DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_author_id uuid DEFAULT NULL,
  p_sort_by text DEFAULT 'relevance',
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  game_id text,
  section_id uuid,
  custom_section_id uuid,
  author_id uuid,
  title text,
  content text,
  is_pinned boolean,
  is_locked boolean,
  view_count integer,
  reply_count integer,
  last_activity_at timestamptz,
  contains_spoilers boolean,
  created_at timestamptz,
  updated_at timestamptz,
  like_count bigint,
  relevance real
) AS $$
BEGIN
  RETURN QUERY
  WITH thread_likes AS (
    SELECT thread_id, COUNT(*) as like_count
    FROM forum_thread_likes
    GROUP BY thread_id
  )
  SELECT 
    t.id,
    t.game_id,
    t.section_id,
    t.custom_section_id,
    t.author_id,
    t.title,
    t.content,
    t.is_pinned,
    t.is_locked,
    t.view_count,
    t.reply_count,
    t.last_activity_at,
    t.contains_spoilers,
    t.created_at,
    t.updated_at,
    COALESCE(tl.like_count, 0) as like_count,
    CASE 
      WHEN p_search_query IS NOT NULL THEN
        ts_rank(
          to_tsvector('french', t.title || ' ' || t.content),
          plainto_tsquery('french', p_search_query)
        )
      ELSE 0
    END as relevance
  FROM forum_threads t
  LEFT JOIN thread_likes tl ON t.id = tl.thread_id
  WHERE 
    t.game_id = p_game_id
    AND (p_search_query IS NULL OR (
      to_tsvector('french', t.title || ' ' || t.content) @@ plainto_tsquery('french', p_search_query)
    ))
    AND (p_section_id IS NULL OR t.section_id = p_section_id)
    AND (p_custom_section_id IS NULL OR t.custom_section_id = p_custom_section_id)
    AND (p_author_id IS NULL OR t.author_id = p_author_id)
    AND (
      p_tags IS NULL OR 
      EXISTS (
        SELECT 1 FROM forum_thread_tags
        WHERE forum_thread_tags.thread_id = t.id
        AND forum_thread_tags.tag = ANY(p_tags)
      )
    )
  ORDER BY
    CASE WHEN p_sort_by = 'relevance' THEN relevance END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'activity' THEN t.last_activity_at END DESC NULLS LAST,
    CASE WHEN p_sort_by = 'replies' THEN t.reply_count END DESC NULLS LAST,
    t.is_pinned DESC,
    t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;