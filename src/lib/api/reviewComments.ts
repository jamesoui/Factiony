import { supabase } from '../supabaseClient';

export interface ReviewComment {
  id: string;
  review_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    username: string;
    avatar_url: string | null;
    is_verified?: boolean;
    is_premium?: boolean;
  };
  likes_count?: number;
  replies_count?: number;
  is_liked?: boolean;
}

export interface CreateReviewCommentData {
  review_id: string;
  content: string;
  parent_id?: string | null;
}

export async function getReviewComments(reviewId: string): Promise<ReviewComment[]> {
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    const { data: comments, error } = await supabase
      .from('review_comments')
      .select(`
        id,
        review_id,
        user_id,
        parent_id,
        content,
        created_at,
        updated_at
      `)
      .eq('review_id', reviewId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching review comments:', error);
      return [];
    }

    if (!comments || comments.length === 0) {
      return [];
    }

    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, username, avatar_url, is_verified, is_premium')
      .in('id', userIds);

    const usersMap = new Map(users?.map(u => [u.id, u]) || []);

    const enrichedComments = await Promise.all(
      comments.map(async (comment) => {
        const userData = usersMap.get(comment.user_id);

        const [likesResult, repliesResult, isLikedResult] = await Promise.all([
          supabase.rpc('get_comment_like_count', { p_comment_id: comment.id }),
          supabase.rpc('get_comment_reply_count', { p_comment_id: comment.id }),
          currentUser
            ? supabase.rpc('user_liked_comment', { p_comment_id: comment.id, p_user_id: currentUser.id })
            : Promise.resolve({ data: false })
        ]);

        return {
          ...comment,
          user: userData ? {
            username: userData.username,
            avatar_url: userData.avatar_url,
            is_verified: userData.is_verified,
            is_premium: userData.is_premium
          } : undefined,
          likes_count: likesResult.data || 0,
          replies_count: repliesResult.data || 0,
          is_liked: isLikedResult.data || false
        };
      })
    );

    return enrichedComments;
  } catch (error) {
    console.error('Error in getReviewComments:', error);
    return [];
  }
}

export async function getCommentReplies(commentId: string): Promise<ReviewComment[]> {
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    const { data: replies, error } = await supabase
      .from('review_comments')
      .select(`
        id,
        review_id,
        user_id,
        parent_id,
        content,
        created_at,
        updated_at
      `)
      .eq('parent_id', commentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comment replies:', error);
      return [];
    }

    if (!replies || replies.length === 0) {
      return [];
    }

    const userIds = [...new Set(replies.map(r => r.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, username, avatar_url, is_verified, is_premium')
      .in('id', userIds);

    const usersMap = new Map(users?.map(u => [u.id, u]) || []);

    const enrichedReplies = await Promise.all(
      replies.map(async (reply) => {
        const userData = usersMap.get(reply.user_id);

        const [likesResult, isLikedResult] = await Promise.all([
          supabase.rpc('get_comment_like_count', { p_comment_id: reply.id }),
          currentUser
            ? supabase.rpc('user_liked_comment', { p_comment_id: reply.id, p_user_id: currentUser.id })
            : Promise.resolve({ data: false })
        ]);

        return {
          ...reply,
          user: userData ? {
            username: userData.username,
            avatar_url: userData.avatar_url,
            is_verified: userData.is_verified,
            is_premium: userData.is_premium
          } : undefined,
          likes_count: likesResult.data || 0,
          replies_count: 0,
          is_liked: isLikedResult.data || false
        };
      })
    );

    return enrichedReplies;
  } catch (error) {
    console.error('Error in getCommentReplies:', error);
    return [];
  }
}

export async function createReviewComment(data: CreateReviewCommentData): Promise<{ success: boolean; comment?: ReviewComment; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data: comment, error } = await supabase
      .from('review_comments')
      .insert({
        review_id: data.review_id,
        user_id: user.id,
        parent_id: data.parent_id || null,
        content: data.content
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating review comment:', error);
      return { success: false, error: error.message };
    }

    const { data: userData } = await supabase
      .from('users')
      .select('username, avatar_url, is_verified, is_premium')
      .eq('id', user.id)
      .single();

    return {
      success: true,
      comment: {
        ...comment,
        user: userData ? {
          username: userData.username,
          avatar_url: userData.avatar_url,
          is_verified: userData.is_verified,
          is_premium: userData.is_premium
        } : undefined,
        likes_count: 0,
        replies_count: 0,
        is_liked: false
      }
    };
  } catch (error) {
    console.error('Error in createReviewComment:', error);
    return { success: false, error: 'Failed to create comment' };
  }
}

export async function updateReviewComment(commentId: string, content: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('review_comments')
      .update({
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating review comment:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateReviewComment:', error);
    return { success: false, error: 'Failed to update comment' };
  }
}

export async function deleteReviewComment(commentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('review_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting review comment:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteReviewComment:', error);
    return { success: false, error: 'Failed to delete comment' };
  }
}

export async function toggleReviewCommentLike(commentId: string): Promise<{ success: boolean; isLiked: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, isLiked: false, error: 'Not authenticated' };
    }

    const { data: existingLike } = await supabase
      .from('review_comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingLike) {
      const { error } = await supabase
        .from('review_comment_likes')
        .delete()
        .eq('id', existingLike.id);

      if (error) {
        console.error('Error unliking comment:', error);
        return { success: false, isLiked: false, error: error.message };
      }

      return { success: true, isLiked: false };
    } else {
      const { error } = await supabase
        .from('review_comment_likes')
        .insert({
          comment_id: commentId,
          user_id: user.id
        });

      if (error) {
        console.error('Error liking comment:', error);
        return { success: false, isLiked: false, error: error.message };
      }

      return { success: true, isLiked: true };
    }
  } catch (error) {
    console.error('Error in toggleReviewCommentLike:', error);
    return { success: false, isLiked: false, error: 'Failed to toggle like' };
  }
}
