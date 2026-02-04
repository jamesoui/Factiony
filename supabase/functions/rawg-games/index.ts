import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const RAWG_API_KEY = Deno.env.get('VITE_RAWG_API_KEY') || '11b490685c024c71a0c6562e37e1a87d';
const CACHE_TTL_HOURS = 24;

function normalizeCacheKey(pathname: string, searchParams: URLSearchParams): string {
  const sortedParams = Array.from(searchParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `${pathname}?${sortedParams}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;

    let gameId: string | null = null;
    const gamesIdMatch = pathname.match(/\/rawg-games\/games\/(\d+)/);
    const directIdMatch = pathname.match(/\/rawg-games\/(\d+)/);

    if (gamesIdMatch) {
      gameId = gamesIdMatch[1];
    } else if (directIdMatch) {
      gameId = directIdMatch[1];
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (gameId) {
      const rawgUrl = `https://api.rawg.io/api/games/${gameId}?key=${RAWG_API_KEY}`;
      const response = await fetch(rawgUrl);

      if (!response.ok) {
        throw new Error(`RAWG API error: ${response.status}`);
      }

      const data = await response.json();

      const { data: statsData } = await supabase
        .from('game_stats')
        .select('average_rating')
        .eq('game_id', gameId)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          ...data,
          factiony_rating: statsData?.average_rating || null,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    let ordering = url.searchParams.get('ordering');
    if (!ordering || ordering === '-rating') {
      ordering = '-metacritic';
      url.searchParams.set('ordering', ordering);
    }

    let pageSize = parseInt(url.searchParams.get('page_size') || '20');
    if (pageSize > 40) pageSize = 40;
    url.searchParams.set('page_size', String(pageSize));

    const cacheKey = normalizeCacheKey('/games', url.searchParams);

    const { data: cachedData } = await supabase
      .from('api_cache_rawg_lists')
      .select('data, created_at')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (cachedData) {
      const cacheAge = Date.now() - new Date(cachedData.created_at).getTime();
      const cacheAgeHours = cacheAge / (1000 * 60 * 60);

      if (cacheAgeHours < CACHE_TTL_HOURS) {
        console.log(`✅ Cache HIT for ${cacheKey} (age: ${cacheAgeHours.toFixed(1)}h)`);
        return new Response(
          JSON.stringify(cachedData.data),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'X-Cache': 'HIT',
            },
          }
        );
      } else {
        console.log(`⏰ Cache EXPIRED for ${cacheKey} (age: ${cacheAgeHours.toFixed(1)}h)`);
      }
    }

    const rawgUrl = new URL('https://api.rawg.io/api/games');
    rawgUrl.searchParams.set('key', RAWG_API_KEY);

    url.searchParams.forEach((value, key) => {
      rawgUrl.searchParams.set(key, value);
    });

    let tagMode = 'primary';
    const tagsParam = url.searchParams.get('tags');

    console.log(`🌐 Fetching from RAWG: ${rawgUrl.pathname}?${rawgUrl.searchParams.toString()}`);
    let response = await fetch(rawgUrl.toString());

    if (!response.ok) {
      throw new Error(`RAWG API error: ${response.status}`);
    }

    let data = await response.json();

    if (tagsParam === 'battle-royale' && (!data.results || data.results.length === 0)) {
      console.log(`⚠️ Battle-royale tag returned 0 results, trying fallback`);
      tagMode = 'fallback';

      const fallbackUrl = new URL('https://api.rawg.io/api/games');
      fallbackUrl.searchParams.set('key', RAWG_API_KEY);

      url.searchParams.forEach((value, key) => {
        if (key !== 'tags') {
          fallbackUrl.searchParams.set(key, value);
        }
      });

      fallbackUrl.searchParams.set('search', 'battle royale');
      fallbackUrl.searchParams.set('genres', 'shooter,action');

      console.log(`🔄 Fallback URL: ${fallbackUrl.toString()}`);
      const fallbackResponse = await fetch(fallbackUrl.toString());

      if (fallbackResponse.ok) {
        data = await fallbackResponse.json();
        console.log(`✅ Fallback returned ${data.results?.length || 0} results`);
      }
    }

    const gameIds = data.results?.map((game: any) => game.id.toString()) || [];

    const { data: statsData } = await supabase
      .from('game_stats')
      .select('game_id, average_rating')
      .in('game_id', gameIds);

    const statsMap = new Map();
    if (statsData) {
      statsData.forEach((stat: any) => {
        statsMap.set(stat.game_id, stat.average_rating);
      });
    }

    const results = data.results?.map((game: any) => ({
      ...game,
      factiony_rating: statsMap.get(game.id.toString()) || null,
    })) || [];

    const responseData = {
      ...data,
      results,
    };

    await supabase
      .from('api_cache_rawg_lists')
      .upsert({
        cache_key: cacheKey,
        data: responseData,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'cache_key',
      });

    console.log(`💾 Cached response for ${cacheKey}`);

    return new Response(
      JSON.stringify(responseData),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
          'X-Factiony-Tag-Mode': tagMode,
        },
      }
    );
  } catch (error) {
    console.error('Error in rawg-games function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
