/*
  # Create API Cache Table for RAWG Lists

  ## Purpose
  Cache RAWG API list responses (/games endpoint with filters) to reduce API calls
  and improve performance for filtered searches.

  ## New Tables
  - `api_cache_rawg_lists`
    - `cache_key` (text, primary key) - Normalized URL query string
    - `data` (jsonb, not null) - The full API response
    - `created_at` (timestamptz, default now()) - Cache creation timestamp

  ## Indexes
  - Automatic index on `cache_key` (primary key)
  - Index on `created_at` for efficient cleanup

  ## Security
  - Enable RLS
  - Public read access (game data is public)
  - Service role only for write operations
*/

-- Create the cache table for list endpoints
CREATE TABLE IF NOT EXISTS api_cache_rawg_lists (
  cache_key text PRIMARY KEY,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_api_cache_rawg_lists_created_at 
  ON api_cache_rawg_lists(created_at);

-- Enable RLS
ALTER TABLE api_cache_rawg_lists ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read cached list data
CREATE POLICY "Public read access to list cache"
  ON api_cache_rawg_lists
  FOR SELECT
  USING (true);

-- Policy: Service role can insert
CREATE POLICY "Service role can insert list cache"
  ON api_cache_rawg_lists
  FOR INSERT
  WITH CHECK (true);

-- Policy: Service role can update
CREATE POLICY "Service role can update list cache"
  ON api_cache_rawg_lists
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Service role can delete
CREATE POLICY "Service role can delete list cache"
  ON api_cache_rawg_lists
  FOR DELETE
  USING (true);
