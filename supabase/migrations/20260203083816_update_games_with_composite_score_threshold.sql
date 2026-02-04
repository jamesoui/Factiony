/*
  # Update games_with_composite_score view threshold

  1. Changes
    - Lower minimum rating threshold from 5 to 1
    - Allow games with at least 1 Factiony rating to appear
    - This provides more content while still maintaining quality through composite scoring

  2. Rationale
    - Current database has limited ratings (0 games with 5+ ratings)
    - Lowering to 1 rating allows section to populate with content
    - Composite score still blends Factiony + metacritic for quality
*/

-- Drop and recreate the view with updated threshold
DROP VIEW IF EXISTS public.games_with_composite_score;

CREATE VIEW public.games_with_composite_score AS
SELECT 
  g.*,
  COALESCE(gs.average_rating, 0) AS factiony_avg,
  COALESCE(gs.total_ratings, 0) AS factiony_count,
  CASE 
    WHEN g.metacritic ~ '^\d+$' THEN g.metacritic::integer
    ELSE NULL
  END AS metacritic_numeric,
  CASE 
    WHEN g.metacritic ~ '^\d+$' AND g.metacritic::integer > 0 
    THEN g.metacritic::integer / 20.0
    ELSE 0
  END AS external_score,
  CASE
    WHEN COALESCE(gs.total_ratings, 0) >= 1 THEN
      -- Calculate composite score with weighted average
      -- More Factiony ratings = higher weight on Factiony score
      (
        COALESCE(gs.average_rating, 0) * (COALESCE(gs.total_ratings, 0)::decimal / (COALESCE(gs.total_ratings, 0) + 10.0))
        +
        (
          CASE 
            WHEN g.metacritic ~ '^\d+$' AND g.metacritic::integer > 0 
            THEN g.metacritic::integer / 20.0
            ELSE 0
          END
        ) * (10.0 / (COALESCE(gs.total_ratings, 0) + 10.0))
      )
    ELSE NULL
  END AS composite_score
FROM 
  public.games g
LEFT JOIN 
  public.game_stats gs ON g.id = gs.game_id;

-- Grant select permission
GRANT SELECT ON public.games_with_composite_score TO authenticated;
GRANT SELECT ON public.games_with_composite_score TO anon;
