/*
  # Add spoilers field to comments

  1. Changes
    - Add `contains_spoilers` column to `activity_comments` table
    - Default value is false
    - Allows users to mark their comments as containing spoilers
    - Spoiler comments will be blurred in the UI and can be revealed on hover

  2. Purpose
    - Enhance user experience by warning about spoilers in comments
    - Give users control over spoiler content visibility
    - Maintain consistency with review spoiler functionality
*/

-- Add contains_spoilers column to activity_comments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_comments' AND column_name = 'contains_spoilers'
  ) THEN
    ALTER TABLE activity_comments ADD COLUMN contains_spoilers boolean DEFAULT false NOT NULL;
  END IF;
END $$;
