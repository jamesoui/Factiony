/*
  # Backfill Review Activities

  1. Purpose
    - Create missing user_activities entries for all existing game reviews
    - Ensures all past reviews appear in the "Trends" feed
    - Only creates activities for reviews with review_text (not just ratings)

  2. Changes
    - Inserts activities for existing reviews that don't have activities yet
    - Uses game data from games table and api_cache for images
    - Sets activity_type to 'review'
*/

-- Insert activities for all existing reviews that don't have activities yet
INSERT INTO user_activities (
  user_id,
  game_id,
  game_name,
  game_image,
  activity_type,
  activity_data,
  created_at
)
SELECT
  gr.user_id,
  gr.game_id,
  COALESCE(g.name, 'Unknown Game') as game_name,
  COALESCE(
    (SELECT payload->>'background_image'
     FROM api_cache_rawg_igdb
     WHERE game_id = gr.game_id || '_fr'
     LIMIT 1),
    (SELECT payload->>'cover'
     FROM api_cache_rawg_igdb
     WHERE game_id = gr.game_id || '_fr'
     LIMIT 1)
  ) as game_image,
  'review' as activity_type,
  jsonb_build_object(
    'rating', gr.rating,
    'review_text', gr.review_text,
    'contains_spoilers', COALESCE(gr.contains_spoilers, false)
  ) as activity_data,
  gr.created_at
FROM game_ratings gr
LEFT JOIN games g ON g.id = gr.game_id
WHERE gr.review_text IS NOT NULL
  AND gr.review_text != ''
  AND NOT EXISTS (
    SELECT 1
    FROM user_activities ua
    WHERE ua.user_id = gr.user_id
      AND ua.game_id = gr.game_id
      AND ua.activity_type = 'review'
  );
