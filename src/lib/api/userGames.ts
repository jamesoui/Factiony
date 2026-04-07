import { supabase } from '../supabaseClient';
import { fetchGameFromCacheOrAPI } from './gameCache';
import { gameDataCache } from '../gameDataCache';

export interface UserGameRating {
  id: string;
  game_id: string;
  game_slug: string;
  rating: number;
  review_text?: string;
  platform?: string;
  game_status?: string;
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
  statusBreakdown: Record<string, number>;
  ratingDistribution: Record<string, number>;
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
  const statusBreakdown: Record<string, number> = {};
  const ratingDistribution: Record<string, number> = {};

  ratedGames.forEach((game) => {
    // Genres
    if (game.game_data?.genres && Array.isArray(game.game_data.genres)) {
      game.game_data.genres.forEach((genre: any) => {
        const name = typeof genre === 'string' ? genre : genre?.name;
        if (name) genreBreakdown[name] = (genreBreakdown[name] || 0) + 1;
      });
    }

    // Plateformes (multi, séparées par virgule)
    if ((game as any).platform) {
      const platforms = (game as any).platform.split(',').map((p: string) => p.trim()).filter(Boolean);
      platforms.forEach((p: string) => {
        platformBreakdown[p] = (platformBreakdown[p] || 0) + 1;
      });
    }

    // Année de sortie
    if (game.game_data?.released) {
      const year = new Date(game.game_data.released).getFullYear();
      if (!isNaN(year)) yearlyStats[year] = (yearlyStats[year] || 0) + 1;
    }

    // Statut
    if ((game as any).game_status) {
      const s = (game as any).game_status;
      statusBreakdown[s] = (statusBreakdown[s] || 0) + 1;
    }

    // Distribution des notes (par tranche de 0.5)
    const bucket = (Math.round(game.rating * 2) / 2).toFixed(1);
    ratingDistribution[bucket] = (ratingDistribution[bucket] || 0) + 1;
  });

  return {
    totalGames: ratedGames.length,
    averageRating: parseFloat(averageRating.toFixed(2)),
    genreBreakdown,
    platformBreakdown,
    yearlyStats,
    statusBreakdown,
    ratingDistribution
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
