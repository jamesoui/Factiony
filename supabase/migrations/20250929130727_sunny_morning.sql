/*
  # Schéma initial Factiony

  1. Nouvelles Tables
    - `users` - Utilisateurs de l'application
    - `subscriptions` - Abonnements Premium
    - `friends` - Relations d'amitié entre utilisateurs

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques d'accès appropriées pour chaque table
*/

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Table des abonnements
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('free', 'premium')),
  status text NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des relations d'amitié
CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);

-- Activer RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour users
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Politiques RLS pour subscriptions
CREATE POLICY "Users can read own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiques RLS pour friends
CREATE POLICY "Users can read own friendships"
  ON friends
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
  ON friends
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own friendships"
  ON friends
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Fonction pour exécuter du SQL brut (pour les requêtes avancées)
CREATE OR REPLACE FUNCTION execute_sql(sql_query text, params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Cette fonction permet d'exécuter des requêtes SQL dynamiques
  -- À utiliser avec précaution et uniquement pour des cas spécifiques
  EXECUTE sql_query INTO result;
  RETURN result;
END;
$$;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();