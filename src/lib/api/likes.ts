import { supabase } from '../supabaseClient';

export interface ActivityLike {
  id: string;
  activity_id: string;
  user_id: string;
  created_at: string;
}

export interface CommentLike {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
}

export async function likeActivity(activityId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('activity_likes')
      .insert({
        activity_id: activityId,
        user_id: user.id
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Already liked' };
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error liking activity:', error);
    return { success: false, error: 'Failed to like activity' };
  }
}

export async function unlikeActivity(activityId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('activity_likes')
      .delete()
      .eq('activity_id', activityId)
      .eq('user_id', user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error unliking activity:', error);
    return { success: false, error: 'Failed to unlike activity' };
  }
}

export async function isActivityLikedByUser(activityId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data, error } = await supabase
      .from('activity_likes')
      .select('id')
      .eq('activity_id', activityId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return !!data;
  } catch (error) {
    console.error('Error checking activity like status:', error);
    return false;
  }
}

export async function getActivityLikesCount(activityId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('activity_likes')
      .select('*', { count: 'exact', head: true })
      .eq('activity_id', activityId);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting activity likes count:', error);
    return 0;
  }
}

export async function likeComment(commentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        user_id: user.id
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Already liked' };
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error liking comment:', error);
    return { success: false, error: 'Failed to like comment' };
  }
}

export async function unlikeComment(commentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error unliking comment:', error);
    return { success: false, error: 'Failed to unlike comment' };
  }
}

export async function isCommentLikedByUser(commentId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data, error } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return !!data;
  } catch (error) {
    console.error('Error checking comment like status:', error);
    return false;
  }
}

export async function getCommentLikesCount(commentId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting comment likes count:', error);
    return 0;
  }
}

export interface ReviewLike {
  id: string;
  review_id: string;
  user_id: string;
  created_at: string;
}

export async function likeReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('review_likes')
      .insert({
        review_id: reviewId,
        user_id: user.id
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Already liked' };
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error liking review:', error);
    return { success: false, error: 'Failed to like review' };
  }
}

export async function unlikeReview(reviewId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('review_likes')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error unliking review:', error);
    return { success: false, error: 'Failed to unlike review' };
  }
}

export async function isReviewLikedByUser(reviewId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data, error } = await supabase
      .from('review_likes')
      .select('id')
      .eq('review_id', reviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return !!data;
  } catch (error) {
    console.error('Error checking review like status:', error);
    return false;
  }
}

export async function getReviewLikesCount(reviewId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('review_likes')
      .select('*', { count: 'exact', head: true })
      .eq('review_id', reviewId);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting review likes count:', error);
    return 0;
  }
}
