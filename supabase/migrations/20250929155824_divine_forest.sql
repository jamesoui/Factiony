/*
  # Table subscriptions complète pour Factiony

  1. Nouvelles Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key vers users)
      - `plan` (text, 'free' ou 'premium')
      - `status` (text, 'active', 'cancelled', 'expired')
      - `start_date` (timestamp, default now)
      - `end_date` (timestamp, nullable)
      - `stripe_subscription_id` (text, nullable)
      - `created_at` (timestamp, default now)
      - `updated_at` (timestamp, default now)

  2. Sécurité
    - Enable RLS sur `subscriptions` table
    - Policies pour lecture/modification par utilisateur propriétaire
    - Contraintes CHECK pour valeurs valides

  3. Relations
    - Foreign key vers users avec CASCADE
    - Index pour performances
*/

-- Créer la table subscriptions si elle n'existe pas
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('free', 'premium')),
  status text NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes et les recréer
DROP POLICY IF EXISTS "Users can read own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update own subscriptions" ON subscriptions;

-- Policy pour lecture de ses propres abonnements
CREATE POLICY "Users can read own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy pour insertion de ses propres abonnements
CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy pour mise à jour de ses propres abonnements
CREATE POLICY "Users can update own subscriptions"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON subscriptions(created_at);

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();