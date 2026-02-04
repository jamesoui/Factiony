/*
  # Autoriser l'accès public aux statistiques des jeux

  1. Modifications
    - Ajouter une policy pour permettre à tous (y compris anonymes) de lire les stats
    - Les stats de jeux sont des données publiques pour permettre l'affichage sur la page Découverte

  2. Sécurité
    - Lecture seule (SELECT) pour le public
    - Aucune modification possible sans authentification
*/

-- Drop la policy existante qui limite aux utilisateurs authentifiés
DROP POLICY IF EXISTS "Users can view game stats" ON game_stats;
DROP POLICY IF EXISTS "Tout le monde peut voir les stats" ON game_stats;

-- Créer une nouvelle policy pour l'accès public en lecture
CREATE POLICY "Game stats are publicly readable"
  ON game_stats
  FOR SELECT
  TO public
  USING (true);
