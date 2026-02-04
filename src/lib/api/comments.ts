import { supabase } from '../supabaseClient';

export interface ActivityComment {
  id: string;
  activity_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  contains_spoilers?: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
  likes_count?: number;
  replies_count?: number;
  is_liked?: boolean;
}

export async function getActivityComments(activityId: string): Promise<ActivityComment[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('activity_comments')
      .select(`
        id,
        activity_id,
        user_id,
        content,
        parent_id,
        contains_spoilers,
        created_at,
        updated_at
      `)
      .eq('activity_id', activityId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!data) return [];

    const commentsWithDetails = await Promise.all(
      data.map(async (comment) => {
        const { data: userData } = await supabase
          .from('users')
          .select('username, avatar_url, is_verified')
          .eq('id', comment.user_id)
          .single();

        const { count: likesCount } = await supabase
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', comment.id);

        const { count: repliesCount } = await supabase
          .from('activity_comments')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', comment.id);

        let isLiked = false;
        if (user) {
          const { data: likeData } = await supabase
            .from('comment_likes')
            .select('id')
            .eq('comment_id', comment.id)
            .eq('user_id', user.id)
            .maybeSingle();

          isLiked = !!likeData;
        }

        return {
          ...comment,
          user: userData || { username: 'Unknown', avatar_url: null, is_verified: false },
          likes_count: likesCount || 0,
          replies_count: repliesCount || 0,
          is_liked: isLiked
        };
      })
    );

    return commentsWithDetails;
  } catch (error) {
    console.error('Error getting activity comments:', error);
    return [];
  }
}

export async function getCommentReplies(commentId: string): Promise<ActivityComment[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('activity_comments')
      .select(`
        id,
        activity_id,
        user_id,
        content,
        parent_id,
        contains_spoilers,
        created_at,
        updated_at
      `)
      .eq('parent_id', commentId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!data) return [];

    const repliesWithDetails = await Promise.all(
      data.map(async (reply) => {
        const { data: userData } = await supabase
          .from('users')
          .select('username, avatar_url, is_verified')
          .eq('id', reply.user_id)
          .single();

        const { count: likesCount } = await supabase
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', reply.id);

        let isLiked = false;
        if (user) {
          const { data: likeData } = await supabase
            .from('comment_likes')
            .select('id')
            .eq('comment_id', reply.id)
            .eq('user_id', user.id)
            .maybeSingle();

          isLiked = !!likeData;
        }

        return {
          ...reply,
          user: userData || { username: 'Unknown', avatar_url: null, is_verified: false },
          likes_count: likesCount || 0,
          replies_count: 0,
          is_liked: isLiked
        };
      })
    );

    return repliesWithDetails;
  } catch (error) {
    console.error('Error getting comment replies:', error);
    return [];
  }
}

export async function createComment(
  activityId: string,
  content: string,
  parentId?: string,
  containsSpoilers?: boolean
): Promise<{ success: boolean; comment?: ActivityComment; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase
      .from('activity_comments')
      .insert({
        activity_id: activityId,
        user_id: user.id,
        content,
        parent_id: parentId || null,
        contains_spoilers: containsSpoilers || false
      })
      .select()
      .single();

    if (error) throw error;

    const { data: userData } = await supabase
      .from('users')
      .select('username, avatar_url, is_verified')
      .eq('id', user.id)
      .single();

    const comment: ActivityComment = {
      ...data,
      user: userData || { username: 'Unknown', avatar_url: null, is_verified: false },
      likes_count: 0,
      replies_count: 0,
      is_liked: false
    };

    return { success: true, comment };
  } catch (error) {
    console.error('Error creating comment:', error);
    return { success: false, error: 'Failed to create comment' };
  }
}

export async function updateComment(
  commentId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('activity_comments')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating comment:', error);
    return { success: false, error: 'Failed to update comment' };
  }
}

export async function deleteComment(commentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('activity_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { success: false, error: 'Failed to delete comment' };
  }
}
