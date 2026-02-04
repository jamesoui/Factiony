/*
  # Fonction RPC pour obtenir les jeux les mieux notés

  1. Nouvelle fonction
    - `get_top_rated_games(limit_count int)`
    - Calcule un score composite basé sur Metacritic et notes Factiony
    - Garantit toujours des résultats même si peu de données

  2. Logique
    - Score Factiony: moyenne des notes × 20 (normalisation sur 100)
    - Score Metacritic: valeur numérique directe
    - Ranking score: 60% Factiony + 40% Metacritic (ou 100% de celui disponible)
    - Fallback: si moins de résultats que demandé, inclut les jeux avec Metacritic seul
    - Exclut les jeux non sortis pour cette section

  3. Sécurité
    - Fonction publique (données publiques)
*/

-- Drop la fonction si elle existe déjà
DROP FUNCTION IF EXISTS get_top_rated_games(int);

-- Créer la fonction RPC
CREATE OR REPLACE FUNCTION get_top_rated_games(limit_count int DEFAULT 12)
RETURNS TABLE (
  id text,
  name text,
  background_image text,
  cover text,
  released timestamptz,
  genres jsonb,
  metacritic_numeric numeric,
  factiony_rating_avg numeric,
  ranking_score numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH game_with_ratings AS (
    SELECT 
      g.id,
      g.name,
      g.background_image,
      g.cover,
      g.released,
      g.genres,
      CASE 
        WHEN g.metacritic IS NULL THEN NULL
        WHEN g.metacritic = 'Inconnue' THEN NULL
        WHEN g.metacritic = 'Unknown' THEN NULL
        ELSE 
          CASE 
            WHEN g.metacritic ~ '^[0-9]+\.?[0-9]*$' THEN g.metacritic::numeric
            ELSE NULL
          END
      END as metacritic_numeric,
      gs.average_rating as factiony_rating_avg,
      gs.total_ratings
    FROM games g
    LEFT JOIN game_stats gs ON g.id = gs.game_id
    WHERE g.released IS NOT NULL 
      AND g.released <= NOW()
  ),
  scored_games AS (
    SELECT 
      gwr.*,
      CASE
        WHEN gwr.factiony_rating_avg IS NOT NULL AND gwr.metacritic_numeric IS NOT NULL 
          THEN (0.6 * (gwr.factiony_rating_avg * 20)) + (0.4 * gwr.metacritic_numeric)
        WHEN gwr.factiony_rating_avg IS NOT NULL 
          THEN gwr.factiony_rating_avg * 20
        WHEN gwr.metacritic_numeric IS NOT NULL 
          THEN gwr.metacritic_numeric
        ELSE NULL
      END as computed_ranking_score
    FROM game_with_ratings gwr
  ),
  top_scored AS (
    SELECT 
      sg.id,
      sg.name,
      sg.background_image,
      sg.cover,
      sg.released,
      sg.genres,
      sg.metacritic_numeric,
      sg.factiony_rating_avg,
      sg.computed_ranking_score as ranking_score
    FROM scored_games sg
    WHERE sg.computed_ranking_score IS NOT NULL
    ORDER BY 
      sg.computed_ranking_score DESC,
      sg.total_ratings DESC NULLS LAST,
      sg.released DESC
    LIMIT limit_count
  ),
  result_count AS (
    SELECT COUNT(*) as cnt FROM top_scored
  ),
  fallback_games AS (
    SELECT 
      sg.id,
      sg.name,
      sg.background_image,
      sg.cover,
      sg.released,
      sg.genres,
      sg.metacritic_numeric,
      sg.factiony_rating_avg,
      sg.computed_ranking_score as ranking_score
    FROM scored_games sg
    WHERE sg.metacritic_numeric IS NOT NULL
      AND sg.id NOT IN (SELECT ts.id FROM top_scored ts)
    ORDER BY 
      sg.metacritic_numeric DESC,
      sg.released DESC
    LIMIT GREATEST(0, limit_count - (SELECT cnt FROM result_count))
  )
  SELECT 
    ts.id,
    ts.name,
    ts.background_image,
    ts.cover,
    ts.released,
    ts.genres,
    ts.metacritic_numeric,
    ts.factiony_rating_avg,
    ts.ranking_score
  FROM top_scored ts
  UNION ALL
  SELECT 
    fb.id,
    fb.name,
    fb.background_image,
    fb.cover,
    fb.released,
    fb.genres,
    fb.metacritic_numeric,
    fb.factiony_rating_avg,
    fb.ranking_score
  FROM fallback_games fb
  ORDER BY ranking_score DESC NULLS LAST
  LIMIT limit_count;
END;
$$;

-- Grant execute permission to public (données publiques)
GRANT EXECUTE ON FUNCTION get_top_rated_games(int) TO public;
