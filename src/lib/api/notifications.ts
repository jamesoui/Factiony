import { supabase } from '../supabaseClient';

export interface UserNotification {
  id: string;
  user_id: string;
  actor_id: string;
  notification_type: 'comment_like' | 'comment_reply' | 'activity_like' | 'activity_comment' | 'new_follower';
  reference_id: string;
  reference_type: 'activity' | 'comment';
  message: string;
  read: boolean;
  created_at: string;
  game_slug?: string | null;
  review_id?: string | null;
  comment_id?: string | null;
  actor?: {
    username: string;
    avatar_url: string | null;
    is_verified: boolean;
  };
}

export async function getUserNotifications(limit: number = 50): Promise<UserNotification[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!data) return [];

    const notificationsWithActors = await Promise.all(
      data.map(async (notification) => {
        const { data: actorData } = await supabase
          .from('users')
          .select('username, avatar_url, is_verified')
          .eq('id', notification.actor_id)
          .single();

        return {
          ...notification,
          actor: actorData || { username: 'Unknown', avatar_url: null, is_verified: false }
        };
      })
    );

    return notificationsWithActors;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    return [];
  }
}

export async function getUnreadNotificationsCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return 0;

    const { count, error } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting unread notifications count:', error);
    return 0;
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: 'Failed to mark notification as read' };
  }
}

export async function markAllNotificationsAsRead(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error: 'Failed to mark all notifications as read' };
  }
}

export async function deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error deleting notification:', error);
    return { success: false, error: 'Failed to delete notification' };
  }
}

export async function subscribeToNotifications(
  callback: (notification: UserNotification) => void
): Promise<() => void> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return () => {};
  }

  const channel = supabase
    .channel('user_notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${user.id}`
      },
      async (payload) => {
        const notification = payload.new as UserNotification;

        const { data: actorData } = await supabase
          .from('users')
          .select('username, avatar_url, is_verified')
          .eq('id', notification.actor_id)
          .single();

        callback({
          ...notification,
          actor: actorData || { username: 'Unknown', avatar_url: null, is_verified: false }
        });
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}
