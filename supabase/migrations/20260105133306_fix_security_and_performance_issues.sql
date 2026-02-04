/*
  # Fix Security and Performance Issues

  1. Indexes
    - Add missing index on user_notifications.actor_id foreign key

  2. RLS Performance Optimization
    - Update all RLS policies to use (select auth.<function>()) instead of auth.<function>()
    - This prevents re-evaluation for each row and significantly improves query performance

  3. Remove Duplicate Policies
    - Remove duplicate permissive policies that cause conflicts
    - Keep the most descriptive and recent policies

  4. Tables Affected
    - user_notifications
    - game_ratings
    - users
    - subscriptions
    - follows
    - activity_likes
    - user_activities
    - activity_comments
    - game_follows
    - game_notifications
    - comment_likes
    - game_stats
*/

-- ================================================
-- 1. ADD MISSING INDEXES
-- ================================================

-- Add index on user_notifications.actor_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_user_notifications_actor_id ON user_notifications(actor_id);

-- ================================================
-- 2. FIX RLS POLICIES - GAME_RATINGS
-- ================================================

DROP POLICY IF EXISTS "Users can create their own ratings" ON game_ratings;
CREATE POLICY "Users can create their own ratings"
  ON game_ratings FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own ratings" ON game_ratings;
CREATE POLICY "Users can update their own ratings"
  ON game_ratings FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own ratings" ON game_ratings;
CREATE POLICY "Users can delete their own ratings"
  ON game_ratings FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ================================================
-- 3. FIX RLS POLICIES - USERS (Remove duplicates and fix performance)
-- ================================================

-- Remove old duplicate policies
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;

-- Recreate with optimized syntax
DROP POLICY IF EXISTS "Anyone can view public user profile" ON users;
CREATE POLICY "Anyone can view public user profile"
  ON users FOR SELECT
  USING (
    is_private = false OR
    (select auth.uid()) = id OR
    (select auth.uid()) IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can view public profiles" ON users;
CREATE POLICY "Users can view public profiles"
  ON users FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Allow profile creation during signup" ON users;
CREATE POLICY "Allow profile creation during signup"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- ================================================
-- 4. FIX RLS POLICIES - SUBSCRIPTIONS (Remove duplicates and fix performance)
-- ================================================

-- Remove old duplicate policies
DROP POLICY IF EXISTS "subs_select_own" ON subscriptions;
DROP POLICY IF EXISTS "subs_insert_own" ON subscriptions;
DROP POLICY IF EXISTS "subs_update_own" ON subscriptions;
DROP POLICY IF EXISTS "subs_delete_own" ON subscriptions;

-- Recreate with optimized syntax
DROP POLICY IF EXISTS "Select own subscriptions" ON subscriptions;
CREATE POLICY "Select own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Insert own subscriptions" ON subscriptions;
CREATE POLICY "Insert own subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Update own subscriptions" ON subscriptions;
CREATE POLICY "Update own subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Delete own subscriptions" ON subscriptions;
CREATE POLICY "Delete own subscriptions"
  ON subscriptions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ================================================
-- 5. FIX RLS POLICIES - FOLLOWS
-- ================================================

DROP POLICY IF EXISTS "follows_insert" ON follows;
CREATE POLICY "follows_insert"
  ON follows FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = follower_id);

DROP POLICY IF EXISTS "follows_delete" ON follows;
CREATE POLICY "follows_delete"
  ON follows FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = follower_id);

-- ================================================
-- 6. FIX RLS POLICIES - ACTIVITY_LIKES
-- ================================================

DROP POLICY IF EXISTS "Users can create likes" ON activity_likes;
CREATE POLICY "Users can create likes"
  ON activity_likes FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own likes" ON activity_likes;
CREATE POLICY "Users can delete their own likes"
  ON activity_likes FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ================================================
-- 7. FIX RLS POLICIES - USER_ACTIVITIES
-- ================================================

DROP POLICY IF EXISTS "Users can create own activities" ON user_activities;
CREATE POLICY "Users can create own activities"
  ON user_activities FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view own activities" ON user_activities;
CREATE POLICY "Users can view own activities"
  ON user_activities FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ================================================
-- 8. FIX RLS POLICIES - ACTIVITY_COMMENTS
-- ================================================

DROP POLICY IF EXISTS "Users can create comments" ON activity_comments;
CREATE POLICY "Users can create comments"
  ON activity_comments FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own comments" ON activity_comments;
CREATE POLICY "Users can update their own comments"
  ON activity_comments FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON activity_comments;
CREATE POLICY "Users can delete their own comments"
  ON activity_comments FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ================================================
-- 9. FIX RLS POLICIES - GAME_FOLLOWS
-- ================================================

DROP POLICY IF EXISTS "Users can view own follows" ON game_follows;
CREATE POLICY "Users can view own follows"
  ON game_follows FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own follows" ON game_follows;
CREATE POLICY "Users can insert own follows"
  ON game_follows FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own follows" ON game_follows;
CREATE POLICY "Users can update own follows"
  ON game_follows FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own follows" ON game_follows;
CREATE POLICY "Users can delete own follows"
  ON game_follows FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ================================================
-- 10. FIX RLS POLICIES - GAME_NOTIFICATIONS
-- ================================================

DROP POLICY IF EXISTS "Users can read own notifications" ON game_notifications;
CREATE POLICY "Users can read own notifications"
  ON game_notifications FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON game_notifications;
CREATE POLICY "Users can update own notifications"
  ON game_notifications FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ================================================
-- 11. FIX RLS POLICIES - COMMENT_LIKES
-- ================================================

DROP POLICY IF EXISTS "Users can create comment likes" ON comment_likes;
CREATE POLICY "Users can create comment likes"
  ON comment_likes FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own comment likes" ON comment_likes;
CREATE POLICY "Users can delete their own comment likes"
  ON comment_likes FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ================================================
-- 12. FIX RLS POLICIES - USER_NOTIFICATIONS
-- ================================================

DROP POLICY IF EXISTS "Users can read own notifications" ON user_notifications;
CREATE POLICY "Users can read own notifications"
  ON user_notifications FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;
CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ================================================
-- 13. REMOVE DUPLICATE POLICIES - GAME_STATS
-- ================================================

DROP POLICY IF EXISTS "read game_stats" ON game_stats;
-- Keep "Game stats are publicly readable" policy
