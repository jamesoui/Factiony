import { supabase } from '../supabaseClient';
import { TOP_100_GAMES } from '../../data/top100Games';

export interface TopGameCover {
  slug: string;
  game_id: string;
  title: string;
  public_url: string;
  updated_at: string;
  version: number;
  width?: number | null;
  height?: number | null;
}

export interface TopGameWithCover {
  name: string;
  slug: string;
  coverUrl: string | null;
  isCached: boolean;
}

const PLACEHOLDER_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"%3E%3Crect fill="%23374151" width="600" height="400"/%3E%3Ctext fill="%239CA3AF" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Image%3C/text%3E%3C/svg%3E';

export async function getTopGamesCached(limit: number = 75): Promise<TopGameWithCover[]> {
  try {
    const topGamesSlice = TOP_100_GAMES.slice(0, limit);
    const slugs = topGamesSlice.map(game => game.slug);

    const { data: cachedCovers, error } = await supabase
      .from('top_games_covers_cache')
      .select('slug, game_id, title, public_url, updated_at, version, width, height')
      .in('slug', slugs);

    if (error) {
      console.error('Error fetching cached covers:', error);
      return topGamesSlice.map(game => ({
        name: game.name,
        slug: game.slug,
        coverUrl: PLACEHOLDER_IMAGE,
        isCached: false
      }));
    }

    const coverMap = new Map<string, TopGameCover>();
    (cachedCovers || []).forEach(cover => {
      coverMap.set(cover.slug, cover);
    });

    return topGamesSlice.map(game => {
      const cached = coverMap.get(game.slug);
      return {
        name: game.name,
        slug: game.slug,
        coverUrl: cached?.public_url || PLACEHOLDER_IMAGE,
        isCached: !!cached
      };
    });
  } catch (error) {
    console.error('Error in getTopGamesCached:', error);
    return TOP_100_GAMES.slice(0, limit).map(game => ({
      name: game.name,
      slug: game.slug,
      coverUrl: PLACEHOLDER_IMAGE,
      isCached: false
    }));
  }
}

export async function preloadTopCovers(slugs: string[]): Promise<void> {
  const preloadPromises = slugs.slice(0, 8).map(slug => {
    return new Promise<void>((resolve) => {
      supabase
        .from('top_games_covers_cache')
        .select('public_url')
        .eq('slug', slug)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.public_url) {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = data.public_url;
          } else {
            resolve();
          }
        })
        .catch(() => resolve());
    });
  });

  await Promise.all(preloadPromises);
}
