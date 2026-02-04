/*
  # Système de modération des contenus UGC

  1. Nouvelles Tables
    - `content_reports`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz, date de création)
      - `reporter_user_id` (uuid, utilisateur qui signale)
      - `reported_user_id` (uuid, auteur du contenu signalé)
      - `content_type` (text, type de contenu: review, forum_post, forum_reply)
      - `content_id` (uuid, identifiant du contenu signalé)
      - `reason` (text, raison du signalement)
      - `message` (text, message optionnel)
      - `content_excerpt` (text, extrait du contenu)
      - `content_url` (text, URL du contenu)
      - `status` (text, statut: open, in_review, resolved, rejected)
      - `admin_notes` (text, notes de modération)

  2. Sécurité
    - Enable RLS sur `content_reports`
    - INSERT autorisé uniquement si reporter_user_id = auth.uid()
    - SELECT/UPDATE/DELETE interdit aux utilisateurs (service role only)

  3. Indexes
    - Index sur (status) pour filtrer les signalements
    - Index sur (created_at desc) pour trier chronologiquement
    - Index sur (content_type, content_id) pour éviter les doublons
    - Index sur (reporter_user_id, content_id) pour le rate limiting
*/

-- Créer la table content_reports
CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  reporter_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('review', 'forum_post', 'forum_reply')),
  content_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate', 'illegal', 'nsfw', 'impersonation', 'other')),
  message text,
  content_excerpt text,
  content_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'rejected')),
  admin_notes text
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_created_at ON content_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_content ON content_reports(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_content ON content_reports(reporter_user_id, content_id, created_at DESC);

-- Activer RLS
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;

-- Politique RLS : les utilisateurs peuvent uniquement créer des signalements
CREATE POLICY "Users can create reports"
  ON content_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_user_id);

-- Politique RLS : les utilisateurs ne peuvent pas lire les signalements (service role only)
-- Pas de policy SELECT = accès refusé pour tous les users
-- Seul le service role peut lire, mettre à jour et supprimer
