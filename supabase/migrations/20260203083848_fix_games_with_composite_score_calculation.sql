/*
  # Fix games_with_composite_score calculation

  1. Issues Fixed
    - Regex now accepts decimal numbers (e.g., "93.0")
    - When no metacritic score exists, composite_score = factiony_avg
    - Proper handling of "Inconnue" and other non-numeric values

  2. Calculation Logic
    - If game has metacritic: weighted blend of factiony + metacritic
    - If no metacritic: composite_score = factiony_avg
    - Weight increases with more Factiony ratings
*/

-- Drop and recreate the view with fixed calculation
DROP VIEW IF EXISTS public.games_with_composite_score;

CREATE VIEW public.games_with_composite_score AS
SELECT 
  g.*,
  COALESCE(gs.average_rating, 0) AS factiony_avg,
  COALESCE(gs.total_ratings, 0) AS factiony_count,
  CASE 
    WHEN g.metacritic ~ '^\d+\.?\d*$' THEN g.metacritic::numeric
    ELSE NULL
  END AS metacritic_numeric,
  CASE 
    WHEN g.metacritic ~ '^\d+\.?\d*$' AND g.metacritic::numeric > 0 
    THEN g.metacritic::numeric / 20.0
    ELSE NULL
  END AS external_score,
  CASE
    WHEN COALESCE(gs.total_ratings, 0) >= 1 THEN
      CASE
        -- If we have metacritic, blend it with factiony rating
        WHEN g.metacritic ~ '^\d+\.?\d*$' AND g.metacritic::numeric > 0 THEN
          (
            COALESCE(gs.average_rating, 0) * (COALESCE(gs.total_ratings, 0)::decimal / (COALESCE(gs.total_ratings, 0) + 10.0))
            +
            (g.metacritic::numeric / 20.0) * (10.0 / (COALESCE(gs.total_ratings, 0) + 10.0))
          )
        -- If no metacritic, use factiony rating as is
        ELSE
          COALESCE(gs.average_rating, 0)
      END
    ELSE NULL
  END AS composite_score
FROM 
  public.games g
LEFT JOIN 
  public.game_stats gs ON g.id = gs.game_id;

-- Grant select permission
GRANT SELECT ON public.games_with_composite_score TO authenticated;
GRANT SELECT ON public.games_with_composite_score TO anon;
