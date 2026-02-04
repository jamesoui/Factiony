/*
  # Create Review Comments System

  1. New Tables
    - `review_comments`
      - `id` (uuid, primary key)
      - `review_id` (uuid, references game_ratings)
      - `user_id` (uuid, references auth.users)
      - `parent_id` (uuid, nullable, self-reference for nested replies)
      - `content` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `review_comment_likes`
      - `id` (uuid, primary key)
      - `comment_id` (uuid, references review_comments)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - Unique constraint on (comment_id, user_id)

  2. Security
    - Enable RLS on both tables
    - Allow authenticated users to:
      - Read all comments
      - Create their own comments and likes
      - Update/delete their own comments
      - Delete their own likes
    
  3. Indexes
    - Index on review_id for fast lookups
    - Index on parent_id for nested replies
    - Index on comment_id and user_id for likes

  4. Functions
    - Helper function to get comment counts
    - Helper function to get like counts
*/

-- Create review_comments table
CREATE TABLE IF NOT EXISTS review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES game_ratings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES review_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create review_comment_likes table
CREATE TABLE IF NOT EXISTS review_comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES review_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_comments_review_id ON review_comments(review_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_parent_id ON review_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_user_id ON review_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_review_comment_likes_comment_id ON review_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_review_comment_likes_user_id ON review_comment_likes(user_id);

-- Enable RLS
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_comments

CREATE POLICY "Anyone can view comments"
  ON review_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON review_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON review_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON review_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for review_comment_likes

CREATE POLICY "Anyone can view likes"
  ON review_comment_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create likes"
  ON review_comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON review_comment_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to get comment counts for reviews
CREATE OR REPLACE FUNCTION get_review_comment_count(p_review_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)
  FROM review_comments
  WHERE review_id = p_review_id;
$$;

-- Function to get reply counts for comments
CREATE OR REPLACE FUNCTION get_comment_reply_count(p_comment_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)
  FROM review_comments
  WHERE parent_id = p_comment_id;
$$;

-- Function to get like counts for comments
CREATE OR REPLACE FUNCTION get_comment_like_count(p_comment_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)
  FROM review_comment_likes
  WHERE comment_id = p_comment_id;
$$;

-- Function to check if user liked a comment
CREATE OR REPLACE FUNCTION user_liked_comment(p_comment_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM review_comment_likes
    WHERE comment_id = p_comment_id AND user_id = p_user_id
  );
$$;