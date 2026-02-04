import { supabase } from '../supabaseClient';
import { GameData } from './games';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface CachedGameData extends GameData {
  from_cache: boolean;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function fetchGameFromCacheOrAPI(
  gameIdOrSlug: string,
  locale: string = 'fr'
): Promise<CachedGameData | null> {
  try {
    const cacheKey = `${gameIdOrSlug}_${locale}`;

    const { data: cacheEntry, error: cacheError } = await supabase
      .from('api_cache_rawg_igdb')
      .select('*')
      .eq('game_id', cacheKey)
      .maybeSingle();

    if (cacheEntry && new Date(cacheEntry.expires_at) > new Date()) {
      return {
        ...cacheEntry.payload,
        from_cache: true,
      };
    }

    const res = await fetchWithTimeout(
      `${SUPABASE_URL}/functions/v1/fetch-game-data?gameId=${encodeURIComponent(gameIdOrSlug)}&locale=${locale}`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      },
      8000
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data?.ok && data?.game) {
      return {
        ...data.game,
        from_cache: false,
      };
    }

    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`Timeout fetching game ${gameIdOrSlug}`);
    }
    return null;
  }
}

export async function fetchMultipleGamesFromCache(
  gameIdsOrSlugs: string[],
  locale: string = 'fr'
): Promise<CachedGameData[]> {
  const results: CachedGameData[] = [];

  for (const gameId of gameIdsOrSlugs) {
    try {
      const game = await fetchGameFromCacheOrAPI(gameId, locale);
      if (game) {
        results.push(game);
      }
    } catch (error) {
      console.warn(`Failed to fetch game ${gameId}:`, error);
    }
  }

  return results;
}

export async function searchGamesWithCache(
  query: string,
  locale: string = 'fr'
): Promise<CachedGameData[]> {
  try {
    const RAWG_KEY = import.meta.env.VITE_RAWG_API_KEY || import.meta.env.VITE_RAWG_KEY;

    if (!RAWG_KEY) {
      console.error('RAWG API key not found');
      return [];
    }

    const searchUrl = `https://api.rawg.io/api/games?key=${RAWG_KEY}&search=${encodeURIComponent(query)}&page_size=20&search_precise=false`;
    console.log(`SEARCH_DEBUG: Querying RAWG for "${query}"`);

    const res = await fetch(searchUrl);

    if (!res.ok) {
      console.error(`RAWG search error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const games: CachedGameData[] = [];

    const top5 = (data.results || []).slice(0, 5).map((g: any) => ({ id: g.id, name: g.name }));
    console.log(`SEARCH_DEBUG: { query: "${query}", count: ${data.count || 0}, resultsLength: ${(data.results || []).length}, top5: ${JSON.stringify(top5)} }`);

    for (const rawgGame of data.results || []) {
      const game: CachedGameData = {
        id: rawgGame.id,
        slug: rawgGame.slug,
        name: rawgGame.name,
        background_image: rawgGame.background_image,
        rating: rawgGame.rating,
        released: rawgGame.released,
        metacritic: rawgGame.metacritic,
        genres: rawgGame.genres,
        platforms: rawgGame.platforms,
        from_cache: false,
      };
      games.push(game);
    }

    return games;
  } catch (error) {
    console.error('Error searching games:', error);
    return [];
  }
}

export async function clearExpiredCache(): Promise<void> {
  try {
    const { error } = await supabase
      .from('api_cache_rawg_igdb')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error clearing expired cache:', error);
    } else {
      console.log('✅ Expired cache entries cleared');
    }
  } catch (error) {
    console.error('Error in clearExpiredCache:', error);
  }
}
