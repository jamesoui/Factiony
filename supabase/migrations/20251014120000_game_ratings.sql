/*
  # Système de votes et notes de jeux Factiony

  1. Nouvelles Tables
    - `game_ratings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key vers auth.users)
      - `game_id` (text, identifiant RAWG du jeu)
      - `game_slug` (text, slug du jeu)
      - `rating` (numeric, note de 0 à 5)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `game_stats`
      - `game_id` (text, primary key)
      - `game_slug` (text)
      - `average_rating` (numeric)
      - `total_ratings` (integer)
      - `updated_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur les deux tables
    - Les utilisateurs peuvent voir toutes les notes
    - Les utilisateurs peuvent créer/modifier leurs propres notes uniquement
    - Les stats sont publiques en lecture seule
*/

-- Table des notes individuelles
CREATE TABLE IF NOT EXISTS game_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_id text NOT NULL,
  game_slug text NOT NULL,
  rating numeric CHECK (rating >= 0 AND rating <= 5) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, game_id)
);

-- Table des statistiques agrégées
CREATE TABLE IF NOT EXISTS game_stats (
  game_id text PRIMARY KEY,
  game_slug text NOT NULL,
  average_rating numeric DEFAULT 0 NOT NULL,
  total_ratings integer DEFAULT 0 NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE game_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;

-- Policies pour game_ratings
CREATE POLICY "Tout le monde peut voir les notes"
  ON game_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs peuvent créer leurs notes"
  ON game_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leurs notes"
  ON game_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs notes"
  ON game_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies pour game_stats (lecture seule publique)
CREATE POLICY "Tout le monde peut voir les stats"
  ON game_stats FOR SELECT
  TO authenticated
  USING (true);

-- Fonction pour mettre à jour les stats après un vote
CREATE OR REPLACE FUNCTION update_game_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculer les stats pour le jeu concerné
  INSERT INTO game_stats (game_id, game_slug, average_rating, total_ratings, updated_at)
  SELECT
    NEW.game_id,
    NEW.game_slug,
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*)::integer,
    now()
  FROM game_ratings
  WHERE game_id = NEW.game_id
  ON CONFLICT (game_id) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    total_ratings = EXCLUDED.total_ratings,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour les stats automatiquement
DROP TRIGGER IF EXISTS update_game_stats_trigger ON game_ratings;
CREATE TRIGGER update_game_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON game_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_game_stats();

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_game_ratings_user_id ON game_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_game_ratings_game_id ON game_ratings(game_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_average_rating ON game_stats(average_rating DESC);
