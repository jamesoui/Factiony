import { fetchGameFromCacheOrAPI, CachedGameData } from './gameCache';
import { TOP_100_GAMES } from '../../data/top100Games';

const MAX_CONCURRENT_REQUESTS = 8;

async function pLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const promise = task().then((result) => {
      results.push(result);
      executing.splice(executing.indexOf(promise), 1);
    });

    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

export interface HydratedTopGame {
  id: string;
  name: string;
  slug: string;
  coverUrl: string | null;
  rating: number | null;
  metacritic: number | null;
  released: string | null;
  genres?: any[];
  platforms?: any[];
  factiony_rating?: number | null;
}

export async function getTopGamesHydrated(
  locale: string = 'fr',
  limit: number = 75
): Promise<HydratedTopGame[]> {
  const topGamesSlice = TOP_100_GAMES.slice(0, limit);

  const tasks = topGamesSlice.map((topGame) => {
    return async (): Promise<HydratedTopGame | null> => {
      try {
        const gameData = await fetchGameFromCacheOrAPI(topGame.slug, locale);

        if (!gameData) {
          return {
            id: topGame.slug,
            name: topGame.name,
            slug: topGame.slug,
            coverUrl: null,
            rating: null,
            metacritic: null,
            released: null,
          };
        }

        return {
          id: gameData.id?.toString() || topGame.slug,
          name: gameData.name || topGame.name,
          slug: gameData.slug || topGame.slug,
          coverUrl: gameData.images?.cover_url || gameData.background_image || null,
          rating: gameData.rating || null,
          metacritic: gameData.metacritic || null,
          released: gameData.released || null,
          genres: gameData.genres || [],
          platforms: gameData.platforms || [],
          factiony_rating: (gameData as any).factiony_rating || null,
        };
      } catch (error) {
        console.warn(`Failed to hydrate top game ${topGame.slug}:`, error);
        return {
          id: topGame.slug,
          name: topGame.name,
          slug: topGame.slug,
          coverUrl: null,
          rating: null,
          metacritic: null,
          released: null,
        };
      }
    };
  });

  const results = await pLimit(tasks, MAX_CONCURRENT_REQUESTS);

  return results.filter((game): game is HydratedTopGame => game !== null);
}
