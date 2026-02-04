const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function call(path: string, params?: Record<string, any>) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration missing');
  }

  const url = new URL(`${SUPABASE_URL}/functions/v1/rawg-games${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      url.searchParams.set(k, String(v));
    });
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status >= 500) {
        throw new Error('Network error');
      }
      throw new Error(`API ${res.status}`);
    }

    return res.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Network error');
    }
    throw error;
  }
}

export const getTopRated = (pageSize = 20) =>
  call("/games", { ordering: "-metacritic", page_size: pageSize });

export const getMostAnticipated = (pageSize = 20) => {
  return call("/games", {
    dates: "2025-01-01,2026-12-31",
    ordering: "-added",
    page_size: pageSize
  });
};

export const getUpcoming = (pageSize = 20) =>
  call("/games", { dates: "2025-01-01,2025-12-31", ordering: "-added", page_size: pageSize });

export const getGameById = (id: number) => call(`/games/${id}`);

export const getGamesWithFilters = (params: Record<string, any>) => call("/games", params);

export const searchGames = async (query: string, pageSize = 20) => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const url = new URL(`${SUPABASE_URL}/functions/v1/search-games`);
  url.searchParams.set('query', query);
  url.searchParams.set('page_size', String(pageSize));

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) throw new Error(`Search API ${res.status}`);
  return res.json();
};

export type Game = {
  id: number;
  name: string;
  rating?: number | null;
  metacritic?: number | null;
  factiony_rating?: number | null;
  genres?: string[];
  images: { cover_url: string | null };
  released?: string | null;
};

export function convertMetacriticToFactiony(metacritic?: number | null): number | null {
  if (!metacritic || metacritic <= 0) return null;
  return parseFloat((metacritic / 20).toFixed(2));
}
