/*
  # Add spoilers field to reviews

  1. Changes
    - Add `contains_spoilers` column to `game_ratings` table
    - Default value is false
    - Allows users to mark their reviews as containing spoilers
    - Spoiler reviews will be blurred in the UI and can be revealed on hover

  2. Purpose
    - Enhance user experience by warning about spoilers
    - Give users control over spoiler content visibility
    - Improve content discovery without ruining experiences
*/

-- Add contains_spoilers column to game_ratings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_ratings' AND column_name = 'contains_spoilers'
  ) THEN
    ALTER TABLE game_ratings ADD COLUMN contains_spoilers boolean DEFAULT false NOT NULL;
  END IF;
END $$;
