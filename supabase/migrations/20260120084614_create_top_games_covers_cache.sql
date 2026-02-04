/*
  # Création du système de cache pour les jaquettes des Top 50 jeux

  1. Nouvelle table
    - `top_games_covers_cache`
      - `slug` (text, primary key) - Identifiant unique du jeu
      - `game_id` (text) - ID du jeu (peut être différent du slug)
      - `title` (text) - Nom du jeu
      - `source_cover_url` (text, nullable) - URL d'origine de la jaquette
      - `storage_path` (text) - Chemin dans Supabase Storage
      - `public_url` (text) - URL CDN publique pour l'image
      - `cover_etag` (text, nullable) - ETag pour la gestion du cache
      - `updated_at` (timestamptz) - Date de dernière mise à jour
      - `version` (int) - Version du cache
      - `width` (int, nullable) - Largeur de l'image
      - `height` (int, nullable) - Hauteur de l'image

  2. Sécurité
    - Enable RLS sur `top_games_covers_cache`
    - Lecture publique autorisée (données publiques)
    - INSERT/UPDATE/DELETE uniquement via service_role

  3. Bucket Supabase Storage
    - Créer le bucket `top-game-covers` (public)
    - Cache-Control long pour CDN
*/

-- Créer la table de cache des jaquettes
CREATE TABLE IF NOT EXISTS top_games_covers_cache (
  slug text PRIMARY KEY,
  game_id text NOT NULL,
  title text NOT NULL,
  source_cover_url text,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  cover_etag text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  version int NOT NULL DEFAULT 1,
  width int,
  height int,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE top_games_covers_cache ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : lecture publique autorisée
CREATE POLICY "Public read access to top game covers"
  ON top_games_covers_cache
  FOR SELECT
  TO public
  USING (true);

-- Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_top_games_covers_updated_at ON top_games_covers_cache(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_top_games_covers_version ON top_games_covers_cache(version);

-- Fonction trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_top_games_covers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_top_games_covers_updated_at_trigger ON top_games_covers_cache;
CREATE TRIGGER update_top_games_covers_updated_at_trigger
  BEFORE UPDATE ON top_games_covers_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_top_games_covers_updated_at();

-- Créer le bucket Storage pour les jaquettes (via SQL)
-- Note: Le bucket doit être créé manuellement via l'interface Supabase ou via code
-- Cette migration insère dans storage.buckets si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'top-game-covers'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'top-game-covers',
      'top-game-covers',
      true,
      5242880, -- 5MB limit
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    );
  END IF;
END $$;

-- Politique de lecture publique pour le bucket
DROP POLICY IF EXISTS "Public read access to top game covers storage" ON storage.objects;
CREATE POLICY "Public read access to top game covers storage"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'top-game-covers');

-- Politique d'upload pour service_role uniquement
DROP POLICY IF EXISTS "Service role can upload top game covers" ON storage.objects;
CREATE POLICY "Service role can upload top game covers"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'top-game-covers');

-- Politique de mise à jour pour service_role uniquement
DROP POLICY IF EXISTS "Service role can update top game covers" ON storage.objects;
CREATE POLICY "Service role can update top game covers"
  ON storage.objects
  FOR UPDATE
  TO service_role
  USING (bucket_id = 'top-game-covers');

-- Politique de suppression pour service_role uniquement
DROP POLICY IF EXISTS "Service role can delete top game covers" ON storage.objects;
CREATE POLICY "Service role can delete top game covers"
  ON storage.objects
  FOR DELETE
  TO service_role
  USING (bucket_id = 'top-game-covers');