/*
  # Create Activity Interactions System

  1. New Tables
    - `activity_likes`
      - `id` (uuid, primary key)
      - `activity_id` (uuid, foreign key to user_activities)
      - `user_id` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)
    
    - `activity_comments`
      - `id` (uuid, primary key)
      - `activity_id` (uuid, foreign key to user_activities)
      - `user_id` (uuid, foreign key to auth.users)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Policies for authenticated users to:
      - Like activities
      - View likes
      - Comment on activities
      - View comments
      - Delete their own likes and comments
*/

-- Create activity_likes table
CREATE TABLE IF NOT EXISTS activity_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES user_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(activity_id, user_id)
);

-- Create activity_comments table
CREATE TABLE IF NOT EXISTS activity_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES user_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_likes_activity_id ON activity_likes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_likes_user_id ON activity_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_user_id ON activity_comments(user_id);

-- Enable RLS
ALTER TABLE activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;

-- Policies for activity_likes
CREATE POLICY "Users can view all likes"
  ON activity_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create likes"
  ON activity_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON activity_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for activity_comments
CREATE POLICY "Users can view all comments"
  ON activity_comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON activity_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON activity_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON activity_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
