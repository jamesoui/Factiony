import { supabase } from '../supabaseClient';

export interface GameFollow {
  id: string;
  user_id: string;
  game_id: string;
  game_name: string;
  created_at: string;
}

export interface GameNotification {
  id: string;
  user_id: string;
  game_id: string;
  game_name: string;
  notification_type: string;
  old_value: string | null;
  new_value: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export async function getUserFollowedGamesCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('game_follows')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting user followed games count:', error);
      return 0;
    }

    return count || 0;
  } catch (e) {
    console.error('Error getting user followed games count:', e);
    return 0;
  }
}

export async function getGameFollowersCount(gameId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('game_follows')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId.toString());

    if (error) {
      console.error('Error getting followers count:', error);
      return 0;
    }

    return count || 0;
  } catch (e) {
    console.error('Error getting followers count:', e);
    return 0;
  }
}

export async function getUserGameNotifications(userId: string): Promise<GameNotification[]> {
  try {
    const { data, error } = await supabase
      .from('game_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error getting notifications:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('Error getting notifications:', e);
    return [];
  }
}

export async function getUnreadNotificationsCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('game_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  } catch (e) {
    console.error('Error getting unread count:', e);
    return 0;
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('game_notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Error marking notification as read:', e);
    return false;
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('game_notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Error marking all notifications as read:', e);
    return false;
  }
}

export async function getUserFollowedGames(userId: string): Promise<GameFollow[]> {
  try {
    const { data, error } = await supabase
      .from('game_follows')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting user followed games:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('Error getting user followed games:', e);
    return [];
  }
}

export async function followGame(gameId: string, gameName: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('game_follows')
      .upsert(
        {
          user_id: user.id,
          game_id: gameId.toString(),
          game_name: gameName,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,game_id' }
      );

    if (error) {
      console.error('Error following game:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Error following game:', e);
    return false;
  }
}

export async function unfollowGame(gameId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('game_follows')
      .delete()
      .eq('user_id', user.id)
      .eq('game_id', gameId.toString());

    if (error) {
      console.error('Error unfollowing game:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Error unfollowing game:', e);
    return false;
  }
}

export async function isUserFollowingGame(userId: string, gameId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('game_follows')
      .select('id')
      .eq('user_id', userId)
      .eq('game_id', gameId.toString())
      .maybeSingle();

    if (error) {
      console.error('Error checking if user is following game:', error);
      return false;
    }

    return !!data;
  } catch (e) {
    console.error('Error checking if user is following game:', e);
    return false;
  }
}

export interface MostFollowedGame {
  game_id: string;
  followers_count: number;
}

export async function getMostFollowedUnreleasedGames(limit: number = 15): Promise<MostFollowedGame[]> {
  try {
    const { data, error } = await supabase
      .from('game_follows')
      .select('game_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting most followed games:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const gameIdCounts = new Map<string, number>();
    data.forEach(follow => {
      const count = gameIdCounts.get(follow.game_id) || 0;
      gameIdCounts.set(follow.game_id, count + 1);
    });

    const sortedGames = Array.from(gameIdCounts.entries())
      .map(([game_id, followers_count]) => ({ game_id, followers_count }))
      .sort((a, b) => b.followers_count - a.followers_count);

    const gameIds = sortedGames.map(g => g.game_id);

    const { data: gamesData, error: gamesError } = await supabase
      .from('games')
      .select('id, released')
      .in('id', gameIds);

    if (gamesError) {
      console.error('Error getting games data:', gamesError);
      return sortedGames.slice(0, limit);
    }

    const today = new Date();
    const unreleasedGameIds = new Set(
      (gamesData || [])
        .filter(game => {
          if (!game.released) return true;
          const releaseDate = new Date(game.released);
          return releaseDate.getTime() > today.getTime();
        })
        .map(game => game.id)
    );

    const unreleasedFollowed = sortedGames.filter(g => unreleasedGameIds.has(g.game_id));

    return unreleasedFollowed.slice(0, limit);
  } catch (e) {
    console.error('Error getting most followed unreleased games:', e);
    return [];
  }
}
