/*
  # Update cache table game_id to text

  1. Changes
    - Change game_id column type from integer to text
    - This allows storing locale-specific cache keys like "123_fr" or "456_en"
  
  2. Notes
    - Existing data will be converted to text format
    - This enables multi-locale caching support
*/

DO $$
BEGIN
  -- Drop the primary key constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'api_cache_rawg_igdb_pkey'
  ) THEN
    ALTER TABLE api_cache_rawg_igdb DROP CONSTRAINT api_cache_rawg_igdb_pkey;
  END IF;

  -- Change column type
  ALTER TABLE api_cache_rawg_igdb ALTER COLUMN game_id TYPE text USING game_id::text;

  -- Re-add primary key
  ALTER TABLE api_cache_rawg_igdb ADD PRIMARY KEY (game_id);
END $$;