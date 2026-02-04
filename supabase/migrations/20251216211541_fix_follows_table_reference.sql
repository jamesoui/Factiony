/*
  # Fix follows table reference in functions

  1. Changes
    - Update get_friends_activities_with_interactions to use correct table name 'follows' instead of 'user_follows'
    - Ensure compatibility with existing database schema
*/

-- Drop and recreate function with correct table reference
DROP FUNCTION IF EXISTS get_friends_activities_with_interactions(uuid, integer);

CREATE OR REPLACE FUNCTION get_friends_activities_with_interactions(
  p_user_id uuid,
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
    u.username,
    u.avatar_url as user_avatar,
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
  INNER JOIN users u ON ua.user_id = u.id
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
  WHERE ua.user_id IN (
    SELECT followed_id 
    FROM follows
    WHERE follower_id = p_user_id
  )
  AND (u.is_private = false OR u.is_private IS NULL)
  ORDER BY ua.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
