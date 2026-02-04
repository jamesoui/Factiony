/*
  # Add onboarding ratings tracking

  1. Changes
    - Add `onboarding_ratings_done` column to `users` table
      - Type: boolean
      - Default: false
      - Tracks whether user has completed (or skipped) the initial 65 games rating onboarding
  
  2. Purpose
    - Prevent showing onboarding screen multiple times
    - Allow users to skip onboarding at any time
    - Enable seamless first-time user experience
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'onboarding_ratings_done'
  ) THEN
    ALTER TABLE users ADD COLUMN onboarding_ratings_done boolean DEFAULT false NOT NULL;
  END IF;
END $$;