import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TopRatedGame {
  id: string;
  name: string;
  background_image: string;
  cover?: string;
  released: string;
  genres: any;
  metacritic_numeric?: number;
  factiony_rating_avg?: number;
  ranking_score?: number;
}

async function getTopRatedFromDB(supabase: any, limit: number): Promise<TopRatedGame[]> {
  console.log('[TOP_RATED_DB] Querying database for top rated games...');
  
  const { data, error } = await supabase.rpc('get_top_rated_games', {
    limit_count: limit
  });

  if (error) {
    console.error('[TOP_RATED_DB] RPC error:', error);
    return [];
  }

  const games = (data || []).map((game: any) => ({
    id: game.id,
    name: game.name,
    background_image: game.background_image || game.cover,
    cover: game.cover || game.background_image,
    released: game.released,
    genres: game.genres,
    metacritic: game.metacritic_numeric,
    factiony_rating: game.factiony_rating_avg,
    ranking_score: game.ranking_score,
    images: { cover_url: game.background_image || game.cover }
  }));

  console.log(`[TOP_RATED_DB] Found ${games.length} games in database`);
  return games;
}

async function fetchAndStoreTopRatedFromRAWG(
  supabase: any,
  rawgApiUrl: string,
  rawgKey: string,
  limit: number
): Promise<TopRatedGame[]> {
  console.log('[TOP_RATED_RAWG] Fetching from RAWG API...');

  try {
    const response = await fetch(
      `${rawgApiUrl}/games?ordering=-metacritic&metacritic=80,100&dates=2010-01-01,${new Date().toISOString().split('T')[0]}&page_size=${limit * 2}`,
      {
        headers: { 'x-factiony-key': rawgKey }
      }
    );

    if (!response.ok) {
      console.error(`[TOP_RATED_RAWG] RAWG API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const rawgGames = data.results || [];
    
    console.log(`[TOP_RATED_RAWG] Fetched ${rawgGames.length} games from RAWG`);

    const gamesToStore = rawgGames
      .filter((g: any) => {
        const hasReleaseDate = g.released && new Date(g.released) <= new Date();
        const hasMetacritic = g.metacritic && typeof g.metacritic === 'number';
        return hasReleaseDate && hasMetacritic;
      })
      .slice(0, limit);

    console.log(`[TOP_RATED_RAWG] Filtered to ${gamesToStore.length} valid games`);

    for (const game of gamesToStore) {
      const metacriticValue = game.metacritic && typeof game.metacritic === 'number' 
        ? game.metacritic 
        : null;

      const gameToUpsert = {
        id: game.id.toString(),
        slug: game.slug,
        name: game.name,
        description_raw: game.description_raw || null,
        metacritic: metacriticValue ? metacriticValue.toString() : null,
        playtime: game.playtime || null,
        released: game.released,
        developers: game.developers || [],
        publishers: game.publishers || [],
        genres: game.genres || [],
        platforms: game.platforms || [],
        tags: game.tags || [],
        background_image: game.background_image,
        cover: game.background_image,
        rating: game.rating || null,
        source: 'rawg',
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('games')
        .upsert(gameToUpsert, { onConflict: 'id' });

      if (upsertError) {
        console.error(`[TOP_RATED_RAWG] Error upserting game ${game.id}:`, upsertError);
      } else {
        console.log(`[TOP_RATED_RAWG] Stored game: ${game.name} (metacritic: ${metacriticValue})`);
      }
    }

    const formattedGames = gamesToStore.map((game: any) => ({
      id: game.id,
      name: game.name,
      background_image: game.background_image,
      cover: game.background_image,
      released: game.released,
      genres: game.genres,
      metacritic: game.metacritic,
      images: { cover_url: game.background_image }
    }));

    console.log(`[TOP_RATED_RAWG] Returning ${formattedGames.length} games`);
    return formattedGames;
  } catch (error) {
    console.error('[TOP_RATED_RAWG] Error:', error);
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 12;

    console.log(`[DISCOVERY] Request for top rated games with limit: ${limit}`);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const RAWG_API_URL = Deno.env.get('VITE_API_URL') || 'https://europe-west1-factiony-1fc0f.cloudfunctions.net/apiFunction';
    const RAWG_KEY = Deno.env.get('VITE_FACTIONY_KEY') || 'FACTIONY_KEY_35d39805f838ac70aa9dca01e4e3ff0764e638dd341728f4';

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let topRatedGames = await getTopRatedFromDB(supabase, limit);
    const dbCount = topRatedGames.length;
    let usedRawgFallback = false;

    console.log(`[DISCOVERY] TOP_RATED_DB_COUNT: ${dbCount}`);

    if (dbCount < 8) {
      console.log(`[DISCOVERY] Not enough games in DB (${dbCount} < 8), using RAWG fallback`);
      usedRawgFallback = true;
      
      const rawgGames = await fetchAndStoreTopRatedFromRAWG(
        supabase,
        RAWG_API_URL,
        RAWG_KEY,
        limit
      );

      topRatedGames = await getTopRatedFromDB(supabase, limit);

      if (topRatedGames.length === 0) {
        console.log('[DISCOVERY] DB still empty after RAWG fetch, using RAWG results directly');
        topRatedGames = rawgGames;
      }
    }

    const finalCount = topRatedGames.length;

    console.log(`[DISCOVERY] TOP_RATED_RAWG_USED: ${usedRawgFallback}`);
    console.log(`[DISCOVERY] TOP_RATED_FINAL_COUNT: ${finalCount}`);

    return new Response(
      JSON.stringify({
        ok: true,
        topRated: topRatedGames,
        stats: {
          dbCount,
          usedRawgFallback,
          finalCount
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('[DISCOVERY] Error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'Server error',
        details: error?.message,
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
