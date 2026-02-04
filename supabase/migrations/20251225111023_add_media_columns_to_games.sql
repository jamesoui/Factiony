/*
  # Add media columns to games table

  1. Changes
    - Add `screenshots` column to store array of screenshot URLs
    - Add `videos` column to store structured video data (trailers and gameplay)
  
  2. Details
    - `screenshots`: jsonb array of strings (URLs)
    - `videos`: jsonb object with structure { trailers: [...], gameplay: [...] }
      where each video item contains { title, provider, url, thumbnail }
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'screenshots'
  ) THEN
    ALTER TABLE games ADD COLUMN screenshots jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'videos'
  ) THEN
    ALTER TABLE games ADD COLUMN videos jsonb DEFAULT '{"trailers": [], "gameplay": []}'::jsonb;
  END IF;
END $$;