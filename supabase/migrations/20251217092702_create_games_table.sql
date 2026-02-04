/*
  # Create games table for storing game information

  1. New Tables
    - `games`
      - `id` (text, primary key) - Game ID from external APIs
      - `slug` (text) - URL-friendly identifier
      - `name` (text) - Game title
      - `description_raw` (text) - Game description
      - `metacritic` (text) - Metacritic score
      - `playtime` (integer) - Average playtime in hours
      - `released` (timestamptz) - Release date
      - `developers` (jsonb) - Array of developer objects
      - `publishers` (jsonb) - Array of publisher objects
      - `genres` (jsonb) - Array of genre objects
      - `platforms` (jsonb) - Array of platform objects
      - `tags` (jsonb) - Array of tag objects
      - `background_image` (text) - Cover image URL
      - `cover` (text) - Alternative cover image URL
      - `stores` (jsonb) - Array of store objects
      - `source` (text) - Data source (rawg, igdb, or both)
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `games` table
    - Add policy for public read access (games are public data)
    - Add policy for service role to write/update data
*/

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id text PRIMARY KEY,
  slug text,
  name text NOT NULL,
  description_raw text DEFAULT '',
  metacritic text DEFAULT 'Inconnue',
  playtime integer,
  released timestamptz,
  developers jsonb DEFAULT '[]'::jsonb,
  publishers jsonb DEFAULT '[]'::jsonb,
  genres jsonb DEFAULT '[]'::jsonb,
  platforms jsonb DEFAULT '[]'::jsonb,
  tags jsonb DEFAULT '[]'::jsonb,
  background_image text,
  cover text,
  stores jsonb DEFAULT '[]'::jsonb,
  source text DEFAULT 'unknown',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_games_slug ON games(slug);

-- Create index on name for search
CREATE INDEX IF NOT EXISTS idx_games_name ON games(name);

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read games (public data)
CREATE POLICY "Games are publicly readable"
  ON games
  FOR SELECT
  TO public
  USING (true);

-- Policy: Only service role can insert games
CREATE POLICY "Service role can insert games"
  ON games
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Only service role can update games
CREATE POLICY "Service role can update games"
  ON games
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);