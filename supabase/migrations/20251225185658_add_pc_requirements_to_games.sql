/*
  # Add PC requirements column to games table

  1. Changes
    - Add `pc_requirements` column to store PC system requirements
  
  2. Details
    - `pc_requirements`: jsonb object with structure:
      {
        "minimum": "text description of minimum requirements",
        "recommended": "text description of recommended requirements"
      }
    - Default value: empty object {}
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'pc_requirements'
  ) THEN
    ALTER TABLE games ADD COLUMN pc_requirements jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;