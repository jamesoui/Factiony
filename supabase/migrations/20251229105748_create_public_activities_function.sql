/*
  # Create Public Activities Function

  1. New Function
    - `get_public_activities_with_interactions`
      - Returns ALL public activities (not just from followed users) with like and comment counts
      - Includes total interaction count for sorting by trends
      - Only shows activities from non-private users

  2. Purpose
    - Enable "Trends" tab in feed to show ALL public user activity
    - Allow discovering new content from all users
    - Show trending content across the entire platform
*/

-- Create function to get all public activities with interaction counts
CREATE OR REPLACE FUNCTION get_public_activities_with_interactions(
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  username text,
  user_avatar text,
  game_id text,
  game_name text,
  game_image text,
  activity_type text,
  activity_data jsonb,
  created_at timestamptz,
  likes_count bigint,
  comments_count bigint,
  interaction_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ua.id,
    ua.user_id,
    up.username,
    up.avatar_url as user_avatar,
    ua.game_id,
    ua.game_name,
    ua.game_image,
    ua.activity_type,
    ua.activity_data,
    ua.created_at,
    COALESCE(l.likes_count, 0) as likes_count,
    COALESCE(c.comments_count, 0) as comments_count,
    COALESCE(l.likes_count, 0) + COALESCE(c.comments_count, 0) as interaction_count
  FROM user_activities ua
  INNER JOIN user_profiles up ON ua.user_id = up.id
  LEFT JOIN (
    SELECT activity_id, COUNT(*) as likes_count
    FROM activity_likes
    GROUP BY activity_id
  ) l ON ua.id = l.activity_id
  LEFT JOIN (
    SELECT activity_id, COUNT(*) as comments_count
    FROM activity_comments
    GROUP BY activity_id
  ) c ON ua.id = c.activity_id
  WHERE (up.is_private = false OR up.is_private IS NULL)
  ORDER BY ua.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;