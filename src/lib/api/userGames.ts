import { supabase } from '../supabaseClient';
import { fetchGameFromCacheOrAPI } from './gameCache';
import { gameDataCache } from '../gameDataCache';

export interface UserGameRating {
  id: string;
  game_id: string;
  game_slug: string;
  rating: number;
  review_text?: string;
  created_at: string;
  updated_at: string;
  game_data?: any;
}

export interface UserStats {
  totalGames: number;
  averageRating: number;
  genreBreakdown: Record<string, number>;
  platformBreakdown: Record<string, number>;
  yearlyStats: Record<string, number>;
}

export async function getUserRatedGames(userId: string): Promise<UserGameRating[]> {
  try {
    const startTime = Date.now();

    const { data, error } = await supabase
      .from('game_ratings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Erreur récupération jeux notés:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const locale = localStorage.getItem('language') || 'fr';
    const gameIds = data.map(rating => rating.game_id);

    console.log(`📊 [PROFILE] Fetching ${gameIds.length} rated games for user`);

    const gamesData = await gameDataCache.getGames(gameIds, locale);

    const enrichedRatings = data.map(rating => ({
      ...rating,
      game_data: gamesData[rating.game_id] || null
    }));

    const elapsed = Date.now() - startTime;
    console.log(`✅ [PROFILE] Loaded ${gameIds.length} games in ${elapsed}ms (${(elapsed / gameIds.length).toFixed(1)}ms per game)`);

    return enrichedRatings;
  } catch (error) {
    console.error('Exception récupération jeux notés:', error);
    return [];
  }
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const ratedGames = await getUserRatedGames(userId);

  if (ratedGames.length === 0) {
    return {
      totalGames: 0,
      averageRating: 0,
      genreBreakdown: {},
      platformBreakdown: {},
      yearlyStats: {}
    };
  }

  const totalRating = ratedGames.reduce((sum, game) => sum + game.rating, 0);
  const averageRating = totalRating / ratedGames.length;

  const genreBreakdown: Record<string, number> = {};
  const platformBreakdown: Record<string, number> = {};
  const yearlyStats: Record<string, number> = {};

  ratedGames.forEach((game) => {
    if (game.game_data) {
      if (game.game_data.genres && Array.isArray(game.game_data.genres)) {
        game.game_data.genres.forEach((genre: string) => {
          genreBreakdown[genre] = (genreBreakdown[genre] || 0) + 1;
        });
      }

      if (game.game_data.platforms && Array.isArray(game.game_data.platforms)) {
        game.game_data.platforms.forEach((platform: string) => {
          platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
        });
      }

      if (game.game_data.released) {
        const year = new Date(game.game_data.released).getFullYear();
        if (!isNaN(year)) {
          yearlyStats[year] = (yearlyStats[year] || 0) + 1;
        }
      }
    }
  });

  return {
    totalGames: ratedGames.length,
    averageRating: parseFloat(averageRating.toFixed(2)),
    genreBreakdown,
    platformBreakdown,
    yearlyStats
  };
}

export async function getUserRatingForGame(userId: string, gameId: string): Promise<UserGameRating | null> {
  try {
    const { data, error } = await supabase
      .from('game_ratings')
      .select('*')
      .eq('user_id', userId)
      .eq('game_id', gameId)
      .maybeSingle();

    if (error) {
      console.error('Erreur récupération note du jeu:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception récupération note du jeu:', error);
    return null;
  }
}

export async function getRecentUserActivity(userId: string, limit: number = 10): Promise<UserGameRating[]> {
  try {
    const startTime = Date.now();

    const { data, error } = await supabase
      .from('game_ratings')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erreur récupération activité récente:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const locale = localStorage.getItem('language') || 'fr';
    const gameIds = data.map(rating => rating.game_id);

    console.log(`📊 [ACTIVITY] Fetching ${gameIds.length} recent games for user`);

    const gamesData = await gameDataCache.getGames(gameIds, locale);

    const enrichedRatings = data.map(rating => ({
      ...rating,
      game_data: gamesData[rating.game_id] || null
    }));

    const elapsed = Date.now() - startTime;
    console.log(`✅ [ACTIVITY] Loaded ${gameIds.length} games in ${elapsed}ms`);

    return enrichedRatings;
  } catch (error) {
    console.error('Exception récupération activité récente:', error);
    return [];
  }
}
