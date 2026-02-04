/*
  # Create Review Likes System

  1. New Table
    - `review_likes`
      - `id` (uuid, primary key)
      - `review_id` (uuid, references game_ratings)
      - `user_id` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - Unique constraint on (review_id, user_id) - one like per user per review

  2. Security
    - Enable RLS on review_likes table
    - Allow ALL authenticated users to:
      - View all review likes
      - Create likes on any review
      - Delete their own likes
    
  3. Indexes
    - Index on review_id for fast lookups
    - Index on user_id for user's liked reviews

  4. Notes
    - Any authenticated user can like any review
    - Users cannot like the same review multiple times
    - Users can unlike (delete their like)
*/

-- Create review_likes table
CREATE TABLE IF NOT EXISTS review_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES game_ratings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user_id ON review_likes(user_id);

-- Enable RLS
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_likes

CREATE POLICY "Anyone can view review likes"
  ON review_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can like any review"
  ON review_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
  ON review_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);