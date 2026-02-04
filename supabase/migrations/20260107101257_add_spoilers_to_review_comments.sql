/*
  # Add spoilers field to review comments

  1. Changes
    - Add `contains_spoilers` column to `review_comments` table
    - Default value is false
    - Allows users to mark their review comments as containing spoilers
    - Spoiler comments will be blurred in the UI and can be revealed on hover

  2. Purpose
    - Enhance user experience by warning about spoilers in review comments
    - Give users control over spoiler content visibility
    - Maintain consistency with other spoiler functionality across the app
*/

-- Add contains_spoilers column to review_comments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'review_comments' AND column_name = 'contains_spoilers'
  ) THEN
    ALTER TABLE review_comments ADD COLUMN contains_spoilers boolean DEFAULT false NOT NULL;
  END IF;
END $$;
