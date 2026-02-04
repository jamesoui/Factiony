/*
  # Create translation cache table

  1. New Tables
    - `api_translation_cache`
      - `id` (uuid, primary key)
      - `input_text` (text) - The original text to translate
      - `source_lang` (text) - Source language code (e.g., 'en')
      - `target_lang` (text) - Target language code (e.g., 'fr')
      - `translated` (text) - The translated text
      - `created_at` (timestamptz) - When the translation was cached
  
  2. Indexes
    - Unique index on (input_text, source_lang, target_lang) to prevent duplicates
  
  3. Security
    - Enable RLS on `api_translation_cache` table
    - Add policy for service role access only
*/

CREATE TABLE IF NOT EXISTS api_translation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_text text NOT NULL,
  source_lang text NOT NULL DEFAULT 'en',
  target_lang text NOT NULL DEFAULT 'fr',
  translated text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS api_translation_cache_unique_idx 
  ON api_translation_cache(input_text, source_lang, target_lang);

ALTER TABLE api_translation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage translations"
  ON api_translation_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);