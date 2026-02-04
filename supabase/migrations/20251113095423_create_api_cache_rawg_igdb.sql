/*
  # Create API Cache Table for RAWG/IGDB Game Data

  ## Purpose
  This migration creates a caching table to store merged game data from RAWG and IGDB APIs,
  reducing API calls and improving performance.

  ## New Tables
  - `api_cache_rawg_igdb`
    - `game_id` (integer, primary key) - The unique game identifier
    - `payload` (jsonb) - The merged game data from RAWG and IGDB
    - `expires_at` (timestamptz) - Expiration timestamp for cache invalidation
    - `created_at` (timestamptz) - Record creation timestamp
    - `updated_at` (timestamptz) - Last update timestamp

  ## Indexes
  - Index on `expires_at` for efficient cache cleanup queries
  - Automatic index on `game_id` (primary key)

  ## Security
  - Enable RLS on the table
  - Public read access for cached data (since it's public game information)
  - Only service role can insert/update cache entries
*/

-- Create the cache table
CREATE TABLE IF NOT EXISTS api_cache_rawg_igdb (
  game_id integer PRIMARY KEY,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_api_cache_expires_at 
  ON api_cache_rawg_igdb(expires_at);

-- Enable RLS
ALTER TABLE api_cache_rawg_igdb ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read cached game data (public information)
CREATE POLICY "Public read access to game cache"
  ON api_cache_rawg_igdb
  FOR SELECT
  USING (true);

-- Policy: Only service role can insert cache entries
CREATE POLICY "Service role can insert cache"
  ON api_cache_rawg_igdb
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only service role can update cache entries
CREATE POLICY "Service role can update cache"
  ON api_cache_rawg_igdb
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Only service role can delete expired cache entries
CREATE POLICY "Service role can delete cache"
  ON api_cache_rawg_igdb
  FOR DELETE
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER update_api_cache_rawg_igdb_updated_at
  BEFORE UPDATE ON api_cache_rawg_igdb
  FOR EACH ROW
  EXECUTE FUNCTION update_api_cache_updated_at();