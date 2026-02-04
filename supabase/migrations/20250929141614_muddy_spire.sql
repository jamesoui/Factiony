/*
  # Correction du système d'amis vers follows

  1. Modifications de Tables
    - Supprime la table `friends` existante
    - Crée la nouvelle table `follows` simplifiée
    - Ajoute la colonne `is_private` aux utilisateurs

  2. Nouvelles Tables
    - `follows`
      - `id` (uuid, primary key)
      - `user_id` (uuid, utilisateur qui suit)
      - `friend_id` (uuid, utilisateur suivi)
      - `created_at` (timestamp)

  3. Sécurité
    - Enable RLS sur `follows`
    - Politique pour que les utilisateurs puissent gérer leurs follows
    - Contrainte unique pour éviter les doublons
    - Index pour optimiser les performances

  4. Fonctionnalités
    - Système de follow simple sans statut
    - Support des comptes privés
    - Trigger pour empêcher le follow des comptes privés
*/

-- Supprimer l'ancienne table friends si elle existe
DROP TABLE IF EXISTS friends CASCADE;

-- Ajouter la colonne is_private aux utilisateurs si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_private'
  ) THEN
    ALTER TABLE users ADD COLUMN is_private boolean DEFAULT false;
  END IF;
END $$;

-- Créer la nouvelle table follows
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT follows_no_self_follow CHECK (user_id != friend_id),
  CONSTRAINT follows_unique_pair UNIQUE (user_id, friend_id)
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_follows_user_id ON follows(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_friend_id ON follows(friend_id);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at);

-- Activer RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Politique RLS : les utilisateurs peuvent gérer leurs propres follows
CREATE POLICY "Users can manage their own follows"
  ON follows
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique RLS : les utilisateurs peuvent voir qui les suit (pour les notifications)
CREATE POLICY "Users can see who follows them"
  ON follows
  FOR SELECT
  TO authenticated
  USING (auth.uid() = friend_id);

-- Fonction pour vérifier si un utilisateur peut être suivi
CREATE OR REPLACE FUNCTION can_follow_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_is_private boolean;
BEGIN
  -- Récupérer le statut privé de l'utilisateur cible
  SELECT is_private INTO target_is_private
  FROM users
  WHERE id = target_user_id;
  
  -- Si l'utilisateur n'existe pas ou est privé, on ne peut pas le suivre
  IF target_is_private IS NULL OR target_is_private = true THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Trigger pour empêcher le follow des comptes privés
CREATE OR REPLACE FUNCTION check_follow_privacy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Vérifier si l'utilisateur cible peut être suivi
  IF NOT can_follow_user(NEW.friend_id) THEN
    RAISE EXCEPTION 'Cannot follow private account';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_follow_privacy
  BEFORE INSERT ON follows
  FOR EACH ROW
  EXECUTE FUNCTION check_follow_privacy();

-- Fonction pour obtenir le nombre de followers d'un utilisateur
CREATE OR REPLACE FUNCTION get_follower_count(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  follower_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO follower_count
  FROM follows
  WHERE friend_id = target_user_id;
  
  RETURN COALESCE(follower_count, 0);
END;
$$;

-- Fonction pour obtenir le nombre d'utilisateurs suivis
CREATE OR REPLACE FUNCTION get_following_count(target_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  following_count integer;
BEGIN
  SELECT COUNT(*)::integer INTO following_count
  FROM follows
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(following_count, 0);
END;
$$;

-- Fonction pour vérifier si un utilisateur en suit un autre
CREATE OR REPLACE FUNCTION is_following(follower_id uuid, followed_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  follow_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM follows
    WHERE user_id = follower_id AND friend_id = followed_id
  ) INTO follow_exists;
  
  RETURN follow_exists;
END;
$$;