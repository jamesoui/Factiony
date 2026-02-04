/*
  # Création de la table user_settings pour les paramètres utilisateur

  1. Nouvelle table
    - `user_settings`
      - `user_id` (uuid, primary key) - Référence vers auth.users
      - `show_activity` (boolean) - Afficher l'activité dans le fil
      - `show_game_journal` (boolean) - Afficher le journal de jeu publiquement
      - `notifications` (jsonb) - Paramètres de notifications
      - `deletion_requested_at` (timestamptz) - Date de demande de suppression
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Sécurité
    - Enable RLS sur `user_settings`
    - Les utilisateurs peuvent uniquement voir et modifier leurs propres paramètres
*/

-- Créer la table user_settings si elle n'existe pas
CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  show_activity boolean DEFAULT true,
  show_game_journal boolean DEFAULT true,
  notifications jsonb DEFAULT '{
    "in_app": true,
    "email": false,
    "new_followers": true,
    "replies": true,
    "likes": true,
    "game_updates": true
  }'::jsonb,
  deletion_requested_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Politique SELECT : l'utilisateur peut voir uniquement ses propres paramètres
CREATE POLICY "Users can view own settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Politique INSERT : l'utilisateur peut créer uniquement ses propres paramètres
CREATE POLICY "Users can insert own settings"
  ON user_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Politique UPDATE : l'utilisateur peut modifier uniquement ses propres paramètres
CREATE POLICY "Users can update own settings"
  ON user_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Créer un index sur user_id pour les performances
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Fonction trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS update_user_settings_updated_at_trigger ON user_settings;
CREATE TRIGGER update_user_settings_updated_at_trigger
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();