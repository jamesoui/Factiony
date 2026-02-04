/*
  # Create game_follows table

  1. New Tables
    - `game_follows`
      - `id` (uuid, primary key, default uuid_generate_v4())
      - `user_id` (uuid, references auth.users.id)
      - `game_id` (text)
      - `game_name` (text)
      - `created_at` (timestamp, default now())
      - Unique constraint on (user_id, game_id) to prevent duplicates

  2. Security
    - Enable RLS on `game_follows` table
    - Add policies for users to manage only their own follows:
      - SELECT: Users can view their own follows
      - INSERT: Users can add their own follows
      - UPDATE: Users can update their own follows
      - DELETE: Users can delete their own follows
*/

-- Create game_follows table
CREATE TABLE IF NOT EXISTS game_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_id text NOT NULL,
  game_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, game_id)
);

-- Enable RLS
ALTER TABLE game_follows ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT
CREATE POLICY "Users can view own follows"
  ON game_follows FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for INSERT
CREATE POLICY "Users can insert own follows"
  ON game_follows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE
CREATE POLICY "Users can update own follows"
  ON game_follows FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE
CREATE POLICY "Users can delete own follows"
  ON game_follows FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_follows_user_id ON game_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_game_follows_game_id ON game_follows(game_id);