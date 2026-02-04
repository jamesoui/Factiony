/*
  # Create games_with_composite_score view

  1. Purpose
    - Provides a unified view combining games data with composite rating scores
    - Composite score is calculated from both Factiony ratings and external scores (metacritic)
    - Used for displaying top-rated games sorted by actual user-visible ratings

  2. Composite Score Calculation
    - Uses Factiony average rating as primary score
    - Blends with metacritic score (normalized to 0-5 scale) based on rating count
    - More Factiony ratings = higher weight on Factiony score
    - Minimum 5 Factiony ratings required for inclusion

  3. Columns
    - All columns from public.games table
    - factiony_avg: Average Factiony rating (0-5)
    - factiony_count: Number of Factiony ratings
    - metacritic_numeric: Metacritic score converted to numeric
    - external_score: Normalized external score (0-5) from metacritic
    - composite_score: Weighted blend of factiony_avg and external_score

  4. Security
    - View is read-only
    - Inherits RLS policies from underlying tables
*/

-- Drop view if exists
DROP VIEW IF EXISTS public.games_with_composite_score;

-- Create the view
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
    WHEN COALESCE(gs.total_ratings, 0) >= 5 THEN
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
