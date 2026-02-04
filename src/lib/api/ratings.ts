import { supabase } from '../supabaseClient';
import { createActivity } from './activities';

export interface GameRating {
  id: string;
  user_id: string;
  game_id: string;
  game_slug: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface GameStats {
  game_id: string;
  game_slug: string;
  average_rating: number;
  total_ratings: number;
  updated_at: string;
}

export async function rateGame(
  gameId: string,
  gameSlug: string,
  rating: number,
  reviewText?: string,
  containsSpoilers?: boolean
): Promise<GameRating | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Utilisateur non authentifié');
  }

  const { data, error } = await supabase
    .from('game_ratings')
    .upsert({
      user_id: user.id,
      game_id: gameId,
      game_slug: gameSlug,
      rating: rating,
      review_text: reviewText || null,
      contains_spoilers: containsSpoilers || false,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,game_id'
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Erreur lors du vote:', error);
    throw error;
  }

  // Create activity for feed if there's a review text
  if (data && reviewText) {
    try {
      // Get game info from cache for the cover image
      const { data: gameCache } = await supabase
        .from('api_cache_rawg_igdb')
        .select('payload')
        .eq('game_id', `${gameId}_fr`)
        .maybeSingle();

      const gameCover = gameCache?.payload?.background_image || gameCache?.payload?.cover || null;

      // Get game name from games table
      const { data: gameData } = await supabase
        .from('games')
        .select('name')
        .eq('id', gameId)
        .maybeSingle();

      const gameName = gameData?.name || 'Unknown Game';

      await createActivity(
        gameId,
        gameName,
        gameCover,
        'review',
        {
          rating: rating,
          review_text: reviewText,
          contains_spoilers: containsSpoilers || false
        }
      );

      console.log('[ACTIVITY] Review activity created for game:', gameId);
    } catch (activityError) {
      console.error('[ACTIVITY] Failed to create activity:', activityError);
      // Don't fail the rating if activity creation fails
    }
  }

  return data;
}

export async function getUserRating(gameId: string): Promise<number | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('game_ratings')
    .select('rating')
    .eq('user_id', user.id)
    .eq('game_id', gameId)
    .maybeSingle();

  if (error) {
    console.error('Erreur lors de la récupération du vote:', error);
    return null;
  }

  return data?.rating || null;
}

export async function getGameStats(gameId: string): Promise<GameStats | null> {
  const { data, error } = await supabase
    .from('game_stats')
    .select('*')
    .eq('game_id', gameId)
    .maybeSingle();

  if (error) {
    console.error('Erreur lors de la récupération des stats:', error);
    return null;
  }

  return data;
}

export async function getTopRatedGames(limit: number = 10): Promise<GameStats[]> {
  const { data, error } = await supabase
    .from('game_stats')
    .select('*')
    .gte('total_ratings', 1)
    .order('average_rating', { ascending: false })
    .order('total_ratings', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Erreur lors de la récupération des meilleurs jeux:', error);
    return [];
  }

  return data || [];
}

export async function getTopRatedGamesWithCompositeScore(limit: number = 20): Promise<any[]> {
  const { data, error } = await supabase
    .from('games_with_composite_score')
    .select('*')
    .not('composite_score', 'is', null)
    .not('factiony_count', 'is', null)
    .gte('factiony_count', 1)
    .order('composite_score', { ascending: false })
    .order('factiony_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Erreur lors de la récupération des meilleurs jeux (composite score):', error);
    return [];
  }

  return data || [];
}

export async function getTrendingGames(limit: number = 10): Promise<GameStats[]> {
  const hoursAgo144 = new Date();
  hoursAgo144.setHours(hoursAgo144.getHours() - 144);

  const { data, error } = await supabase
    .from('game_ratings')
    .select('game_id, game_slug')
    .gte('created_at', hoursAgo144.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur lors de la récupération des jeux en tendance:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  const gameCounts = data.reduce((acc: Record<string, { count: number; slug: string }>, rating) => {
    if (!acc[rating.game_id]) {
      acc[rating.game_id] = { count: 0, slug: rating.game_slug };
    }
    acc[rating.game_id].count++;
    return acc;
  }, {});

  const sortedGames = Object.entries(gameCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([gameId]) => gameId);

  const { data: statsData, error: statsError } = await supabase
    .from('game_stats')
    .select('*')
    .in('game_id', sortedGames);

  if (statsError) {
    console.error('Erreur lors de la récupération des stats des jeux en tendance:', statsError);
    return [];
  }

  const statsMap = new Map(statsData?.map(stat => [stat.game_id, stat]) || []);
  return sortedGames.map(gameId => statsMap.get(gameId)).filter(Boolean) as GameStats[];
}

export async function getRecentlyRatedGames(limit: number = 10): Promise<GameStats[]> {
  const { data, error } = await supabase
    .from('game_ratings')
    .select('game_id, game_slug, created_at')
    .order('created_at', { ascending: false })
    .limit(limit * 3);

  if (error) {
    console.error('Erreur lors de la récupération des jeux récemment notés:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  const uniqueGameIds = [...new Set(data.map(r => r.game_id))].slice(0, limit);

  const { data: statsData, error: statsError } = await supabase
    .from('game_stats')
    .select('*')
    .in('game_id', uniqueGameIds);

  if (statsError) {
    console.error('Erreur lors de la récupération des stats des jeux récemment notés:', statsError);
    return [];
  }

  const statsMap = new Map(statsData?.map(stat => [stat.game_id, stat]) || []);
  return uniqueGameIds.map(gameId => statsMap.get(gameId)).filter(Boolean) as GameStats[];
}

export async function getTopRatedGamesHybrid(limit: number = 15): Promise<any[]> {
  console.log('[TOP_RATED] Fetching top rated games with limit:', limit);

  const { data, error } = await supabase.rpc('get_top_rated_games', {
    limit_count: limit
  });

  if (error) {
    console.error('[TOP_RATED] Error calling RPC:', error);
    return [];
  }

  if (!data || data.length === 0) {
    console.warn('[TOP_RATED] No games returned from RPC, using RAWG fallback');

    try {
      const API_URL = import.meta.env.VITE_API_URL ?? 'https://europe-west1-factiony-1fc0f.cloudfunctions.net/apiFunction';
      const FACTIONY_KEY = import.meta.env.VITE_FACTIONY_KEY ?? 'FACTIONY_KEY_35d39805f838ac70aa9dca01e4e3ff0764e638dd341728f4';

      const response = await fetch(`${API_URL}/games?ordering=-metacritic&metacritic=80,100&page_size=${limit}`, {
        headers: { 'x-factiony-key': FACTIONY_KEY }
      });

      const rawgData = await response.json();

      if (rawgData.results && rawgData.results.length > 0) {
        console.log('[TOP_RATED] RAWG fallback returned:', rawgData.results.length, 'games');

        return rawgData.results.map((game: any) => ({
          id: game.id,
          name: game.name,
          metacritic: game.metacritic,
          background_image: game.background_image,
          genres: game.genres,
          released: game.released,
          images: { cover_url: game.background_image }
        }));
      }
    } catch (error) {
      console.error('[TOP_RATED] RAWG fallback error:', error);
    }

    return [];
  }

  console.log('[TOP_RATED] RPC returned', data.length, 'games');

  const formattedGames = data.map((game: any) => ({
    id: game.id,
    name: game.name,
    metacritic: game.metacritic_numeric,
    background_image: game.background_image || game.cover,
    genres: game.genres,
    released: game.released,
    ranking_score: game.ranking_score,
    factiony_rating: game.factiony_rating_avg,
    images: { cover_url: game.background_image || game.cover }
  }));

  console.log('[TOP_RATED] Formatted games:', formattedGames.length);

  return formattedGames;
}

export async function getGameAverageRating(gameId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('game_ratings')
      .select('rating')
      .eq('game_id', gameId.toString());

    if (error) {
      console.error('Error fetching game ratings:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
    const average = sum / data.length;

    return Math.round(average * 10) / 10;
  } catch (e) {
    console.error('Error calculating average rating:', e);
    return null;
  }
}

export async function getGameReviews(gameId: string, limit: number = 50): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    const { data: reviews, error } = await supabase
      .from('game_ratings')
      .select('id, user_id, rating, review_text, created_at, contains_spoilers')
      .eq('game_id', gameId.toString())
      .not('review_text', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching game reviews:', error);
      return [];
    }

    if (!reviews || reviews.length === 0) {
      return [];
    }

    const userIds = [...new Set(reviews.map(r => r.user_id))];
    const { data: users } = await supabase
      .from('users')
      .select('id, username, avatar_url, is_verified, is_premium')
      .in('id', userIds);

    const usersMap = new Map(users?.map(u => [u.id, u]) || []);

    const reviewsWithDetails = await Promise.all(
      reviews.map(async (review) => {
        const userData = usersMap.get(review.user_id);

        const { count: commentsCount } = await supabase
          .from('review_comments')
          .select('*', { count: 'exact', head: true })
          .eq('review_id', review.id);

        const { count: likesCount } = await supabase
          .from('review_likes')
          .select('*', { count: 'exact', head: true })
          .eq('review_id', review.id);

        let isLiked = false;
        if (currentUserId) {
          const { data: likeData } = await supabase
            .from('review_likes')
            .select('id')
            .eq('review_id', review.id)
            .eq('user_id', currentUserId)
            .maybeSingle();

          isLiked = !!likeData;
        }

        return {
          id: review.id,
          userId: review.user_id,
          username: userData?.username || 'Anonymous',
          avatar: userData?.avatar_url || '',
          is_verified: userData?.is_verified || false,
          is_premium: userData?.is_premium || false,
          rating: review.rating,
          content: review.review_text,
          date: review.created_at,
          spoilers: review.contains_spoilers || false,
          commentsCount: commentsCount || 0,
          likesCount: likesCount || 0,
          isLiked: isLiked
        };
      })
    );

    return reviewsWithDetails;
  } catch (error) {
    console.error('Error in getGameReviews:', error);
    return [];
  }
}

export function subscribeToGameStats(callback: (stats: GameStats[]) => void) {
  const channel = supabase
    .channel('game_stats_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_stats'
      },
      () => {
        getTopRatedGames(10).then(callback);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
