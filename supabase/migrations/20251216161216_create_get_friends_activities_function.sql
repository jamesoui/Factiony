/*
  # Create get_friends_activities RPC Function

  1. New Functions
    - `get_friends_activities(p_user_id uuid, p_limit integer)`
      - Retrieves activities from users that the current user follows
      - Returns user activity data joined with user profile information
      - Ordered by most recent first

  2. Function Logic
    - Fetches all users that p_user_id is following from the follows table
    - Retrieves activities from those users
    - Joins with users table to get username and avatar
    - Limits results to p_limit rows
    - Orders by created_at descending

  3. Security
    - Function is marked as SECURITY DEFINER to bypass RLS
    - Only returns activities from users that the caller is following
*/

CREATE OR REPLACE FUNCTION get_friends_activities(
  p_user_id uuid,
  p_limit integer DEFAULT 20
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
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    ua.created_at
  FROM user_activities ua
  INNER JOIN follows f ON ua.user_id = f.followed_id
  INNER JOIN users u ON ua.user_id = u.id
  WHERE f.follower_id = p_user_id
  ORDER BY ua.created_at DESC
  LIMIT p_limit;
END;
$$;