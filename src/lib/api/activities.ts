import { supabase } from '../supabaseClient';
import { fetchGameFromCacheOrAPI } from './gameCache';

export interface UserActivity {
  id: string;
  user_id: string;
  username: string;
  user_avatar: string | null;
  game_id: string;
  game_name: string;
  game_image: string | null;
  activity_type: 'rating' | 'review' | 'comment' | 'like' | 'follow_game';
  activity_data: {
    rating?: number;
    review_text?: string;
    [key: string]: any;
  };
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  interaction_count?: number;
}

export async function getFriendsActivities(limit: number = 20): Promise<UserActivity[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('User not authenticated');
      return [];
    }

    const { data, error } = await supabase.rpc('get_friends_activities', {
      p_user_id: user.id,
      p_limit: limit
    });

    if (error) {
      console.error('Error fetching friends activities:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getFriendsActivities:', error);
    return [];
  }
}

export async function getFriendsActivitiesWithInteractions(limit: number = 50): Promise<UserActivity[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('User not authenticated');
      return [];
    }

    const { data, error } = await supabase.rpc('get_friends_activities_with_interactions', {
      p_user_id: user.id,
      p_limit: limit
    });

    if (error) {
      console.error('Error fetching friends activities with interactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getFriendsActivitiesWithInteractions:', error);
    return [];
  }
}

export async function getPublicActivitiesWithInteractions(limit: number = 50): Promise<UserActivity[]> {
  try {
    const { data, error } = await supabase.rpc('get_public_activities_with_interactions', {
      p_limit: limit
    });

    if (error) {
      console.error('Error fetching public activities with interactions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPublicActivitiesWithInteractions:', error);
    return [];
  }
}

export async function createActivity(
  gameId: string,
  gameName: string,
  gameImage: string | null,
  activityType: 'rating' | 'review' | 'comment' | 'like' | 'follow_game',
  activityData: any
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('User not authenticated');
      return false;
    }

    const { error } = await supabase
      .from('user_activities')
      .insert({
        user_id: user.id,
        game_id: gameId,
        game_name: gameName,
        game_image: gameImage,
        activity_type: activityType,
        activity_data: activityData
      });

    if (error) {
      console.error('Error creating activity:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in createActivity:', error);
    return false;
  }
}

export async function enrichActivitiesWithGameData(
  activities: UserActivity[],
  locale: string = 'fr'
): Promise<UserActivity[]> {
  const enrichmentPromises = activities.map(async (activity) => {
    if (!activity.game_image) {
      try {
        const game = await fetchGameFromCacheOrAPI(activity.game_id, locale);
        if (game) {
          return {
            ...activity,
            game_image: game.background_image || game.cover || null,
          };
        }
      } catch (error) {
        console.warn(`Failed to enrich game data for ${activity.game_id}`);
      }
    }
    return activity;
  });

  const results = await Promise.allSettled(enrichmentPromises);

  return results
    .filter(result => result.status === 'fulfilled')
    .map(result => (result as PromiseFulfilledResult<UserActivity>).value);
}

export function getActivityMessage(activity: UserActivity, locale: string = 'fr'): string {
  const translations = {
    fr: {
      rating: 'a noté',
      review: 'a critiqué',
      comment: 'a commenté',
      like: 'a aimé',
      follow_game: 'suit maintenant'
    },
    en: {
      rating: 'rated',
      review: 'reviewed',
      comment: 'commented on',
      like: 'liked',
      follow_game: 'is now following'
    }
  };

  const messages = translations[locale as keyof typeof translations] || translations.en;
  return messages[activity.activity_type] || activity.activity_type;
}

export function getActivityDetails(activity: UserActivity, locale: string = 'fr'): string {
  if (activity.activity_type === 'rating' && activity.activity_data.rating) {
    return `${activity.activity_data.rating}/5 ★`;
  }

  if (activity.activity_type === 'review' && activity.activity_data.review_text) {
    const text = activity.activity_data.review_text;
    return text.length > 100 ? `${text.substring(0, 100)}...` : text;
  }

  return '';
}

export function formatActivityDate(dateString: string, locale: string = 'fr'): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / 60000);
  const diffInHours = Math.floor(diffInMs / 3600000);
  const diffInDays = Math.floor(diffInMs / 86400000);

  if (locale === 'fr') {
    if (diffInMinutes < 1) return 'À l\'instant';
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } else {
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }
}
