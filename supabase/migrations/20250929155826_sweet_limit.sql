/*
  # Table follows complète pour Factiony

  1. Nouvelles Tables
    - `follows`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key vers users - celui qui suit)
      - `friend_id` (uuid, foreign key vers users - celui qui est suivi)
      - `created_at` (timestamp, default now)

  2. Sécurité
    - Enable RLS sur `follows` table
    - Policies pour gestion des follows par utilisateur
    - Contrainte pour empêcher l'auto-follow
    - Trigger pour vérifier la confidentialité

  3. Fonctions utilitaires
    - Fonction pour vérifier si un utilisateur suit un autre
    - Fonction pour compter les followers/following
    - Fonction pour vérifier la confidentialité avant follow
*/

-- Créer la table follows si elle n'existe pas
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Activer RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes et les recréer
DROP POLICY IF EXISTS "Users can manage their own follows" ON follows;
DROP POLICY IF EXISTS "Users can see who follows them" ON follows;
DROP POLICY IF EXISTS "Users can see public follows" ON follows;

-- Policy pour gérer ses propres follows
CREATE POLICY "Users can manage their own follows"
  ON follows
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Policy pour voir qui nous suit
CREATE POLICY "Users can see who follows them"
  ON follows
  FOR SELECT
  TO authenticated
  USING (friend_id = auth.uid());

-- Policy pour voir les follows publics
CREATE POLICY "Users can see public follows"
  ON follows
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = follows.friend_id 
      AND users.is_private = false
    )
  );

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_follows_user_id ON follows(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_friend_id ON follows(friend_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS follows_unique_pair ON follows(user_id, friend_id);

-- Fonction pour vérifier la confidentialité avant follow
CREATE OR REPLACE FUNCTION check_follow_privacy()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si le compte cible est privé
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = NEW.friend_id 
    AND is_private = true
  ) THEN
    RAISE EXCEPTION 'Cannot follow private account';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour vérifier la confidentialité
DROP TRIGGER IF EXISTS trigger_check_follow_privacy ON follows;
CREATE TRIGGER trigger_check_follow_privacy
  BEFORE INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION check_follow_privacy();

-- Fonction pour vérifier si un utilisateur suit un autre
CREATE OR REPLACE FUNCTION is_following(follower_id uuid, followed_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM follows 
    WHERE user_id = follower_id 
    AND friend_id = followed_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour compter les followers
CREATE OR REPLACE FUNCTION get_follower_count(target_user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer 
    FROM follows 
    WHERE friend_id = target_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour compter les following
CREATE OR REPLACE FUNCTION get_following_count(target_user_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer 
    FROM follows 
    WHERE user_id = target_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;