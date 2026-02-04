import { supabase } from '../supabaseClient';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  is_private: boolean;
  is_verified: boolean;
  is_premium: boolean;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  banner_url: string | null;
  join_date: string;
  updated_at: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  followed_id: string;
  created_at: string;
}

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user by username:', error);
    return null;
  }

  return data;
}

export async function getUserById(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user by id:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId
      });
      return null;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in getUserById:', { err, userId });
    return null;
  }
}

export async function searchUsers(query: string, limit: number = 20): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
    .eq('is_private', false)
    .limit(limit);

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  return data || [];
}

export async function followUser(followedId: string): Promise<Follow | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    if (user.id === followedId) {
      throw new Error('Vous ne pouvez pas vous suivre vous-même');
    }

    const payload = {
      follower_id: user.id,
      followed_id: followedId
    };

    console.log('followUser - payload envoyé:', payload);

    const { data, error } = await supabase
      .from('follows')
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error following user:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        follower_id: user.id,
        followed_id: followedId
      });
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in followUser:', { err, followedId });
    throw err;
  }
}

export async function unfollowUser(followedId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('followed_id', followedId);

    if (error) {
      console.error('Error unfollowing user:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        follower_id: user.id,
        followed_id: followedId
      });
      return false;
    }

    return true;
  } catch (err) {
    console.error('Unexpected error in unfollowUser:', { err, followedId });
    return false;
  }
}

export async function isFollowing(followedId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('followed_id', followedId)
    .maybeSingle();

  if (error) {
    console.error('Error checking follow status:', error);
    return false;
  }

  return !!data;
}

export async function getFollowers(userId: string): Promise<UserProfile[]> {
  try {
    const { data: followsData, error: followsError } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('followed_id', userId);

    if (followsError) {
      console.error('Error fetching followers:', {
        code: followsError.code,
        message: followsError.message,
        details: followsError.details,
        hint: followsError.hint
      });
      return [];
    }

    if (!followsData || followsData.length === 0) {
      return [];
    }

    const followerIds = followsData.map(f => f.follower_id);

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, username, avatar_url, is_premium, is_private, is_verified, bio')
      .in('id', followerIds);

    if (usersError) {
      console.error('Error fetching follower profiles:', {
        code: usersError.code,
        message: usersError.message,
        details: usersError.details,
        hint: usersError.hint
      });
      return [];
    }

    return usersData || [];
  } catch (err) {
    console.error('Unexpected error in getFollowers:', err);
    return [];
  }
}

export async function getFollowing(userId: string): Promise<UserProfile[]> {
  try {
    const { data: followsData, error: followsError } = await supabase
      .from('follows')
      .select('followed_id')
      .eq('follower_id', userId);

    if (followsError) {
      console.error('Error fetching following:', {
        code: followsError.code,
        message: followsError.message,
        details: followsError.details,
        hint: followsError.hint
      });
      return [];
    }

    if (!followsData || followsData.length === 0) {
      return [];
    }

    const followedIds = followsData.map(f => f.followed_id);

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, username, avatar_url, is_premium, is_private, is_verified, bio')
      .in('id', followedIds);

    if (usersError) {
      console.error('Error fetching following profiles:', {
        code: usersError.code,
        message: usersError.message,
        details: usersError.details,
        hint: usersError.hint
      });
      return [];
    }

    return usersData || [];
  } catch (err) {
    console.error('Unexpected error in getFollowing:', err);
    return [];
  }
}

export async function getFollowerCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('followed_id', userId);

  if (error) {
    console.error('Error counting followers:', error);
    return 0;
  }

  return count || 0;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId);

  if (error) {
    console.error('Error counting following:', error);
    return 0;
  }

  return count || 0;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'username' | 'bio' | 'location' | 'website' | 'is_private' | 'avatar_url' | 'banner_url'>>
): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    throw new Error('Non autorisé');
  }

  const { data, error } = await supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  return data;
}
