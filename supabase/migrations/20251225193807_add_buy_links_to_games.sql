/*
  # Add buy_links column to games table

  1. Changes
    - Add `buy_links` column to `games` table
      - Type: jsonb (array of objects with store, name, url)
      - Nullable: true (for backwards compatibility)
      - Default: null

  2. Description
    - This column stores direct links to game pages on official stores
    - Structure: Array<{ store: string, name: string, url: string }>
    - Example: [{ store: "steam", name: "Steam", url: "https://store.steampowered.com/app/990080/" }]
    - Falls back to generic store links if direct links are unavailable
*/

-- Add buy_links column to games table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'buy_links'
  ) THEN
    ALTER TABLE games ADD COLUMN buy_links jsonb DEFAULT NULL;
  END IF;
END $$;