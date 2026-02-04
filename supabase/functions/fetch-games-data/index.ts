import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_CONCURRENT_API_CALLS = 6;

async function fetchGameDataMinimal(
  gameId: string,
  locale: string,
  supabase: any,
  rawgKey: string | undefined
): Promise<any | null> {
  try {
    const dbLookupStart = Date.now();

    const { data: gameFromDb } = await supabase
      .from("games")
      .select("id, slug, name, cover, background_image, metacritic, released, genres, platforms, updated_at")
      .eq("id", gameId.toString())
      .maybeSingle();

    const dbLookupMs = Date.now() - dbLookupStart;

    if (gameFromDb) {
      const dataAge = new Date().getTime() - new Date(gameFromDb.updated_at).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      if (dataAge < sevenDays) {
        console.log(`✅ [BATCH] Cache HIT for ${gameId} from games table (${dbLookupMs}ms)`);

        const { data: statsData } = await supabase
          .from('game_stats')
          .select('average_rating')
          .eq('game_id', gameId.toString())
          .maybeSingle();

        return {
          ...gameFromDb,
          factiony_rating: statsData?.average_rating || null
        };
      }
    }

    const cacheKey = `${gameId}_${locale}`;
    const { data: cacheEntry } = await supabase
      .from("api_cache_rawg_igdb")
      .select("payload, expires_at")
      .eq("game_id", cacheKey)
      .maybeSingle();

    if (cacheEntry && new Date(cacheEntry.expires_at) > new Date()) {
      console.log(`✅ [BATCH] Cache HIT for ${gameId} from api_cache (${dbLookupMs}ms)`);

      const { data: statsData } = await supabase
        .from('game_stats')
        .select('average_rating')
        .eq('game_id', cacheEntry.payload?.id?.toString() || gameId.toString())
        .maybeSingle();

      return {
        ...cacheEntry.payload,
        factiony_rating: statsData?.average_rating || null
      };
    }

    console.log(`⚠️ [BATCH] Cache MISS for ${gameId}, would fetch from API`);

    if (!rawgKey) {
      return null;
    }

    const isNumericId = /^\d+$/.test(gameId);
    const rawgEndpoint = `https://api.rawg.io/api/games/${gameId}?key=${rawgKey}`;

    const rawgRes = await fetch(rawgEndpoint);
    if (!rawgRes.ok) {
      console.error(`❌ [BATCH] RAWG API error for ${gameId}: ${rawgRes.status}`);
      return null;
    }

    const rawgData = await rawgRes.json();

    const minimalGame = {
      id: isNumericId ? Number(gameId) : rawgData?.id || 0,
      slug: rawgData?.slug || gameId,
      name: rawgData?.name || "Unknown",
      cover: rawgData?.background_image || null,
      background_image: rawgData?.background_image || null,
      metacritic: rawgData?.metacritic ? Number(rawgData.metacritic).toFixed(1) : null,
      released: rawgData?.released || null,
      genres: rawgData?.genres || [],
      platforms: rawgData?.platforms || [],
    };

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await supabase
      .from("api_cache_rawg_igdb")
      .upsert({
        game_id: cacheKey,
        payload: minimalGame,
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: "game_id",
      });

    await supabase
      .from("games")
      .upsert({
        id: minimalGame.id.toString(),
        slug: minimalGame.slug,
        name: minimalGame.name,
        cover: minimalGame.cover,
        background_image: minimalGame.background_image,
        metacritic: minimalGame.metacritic,
        released: minimalGame.released,
        genres: minimalGame.genres,
        platforms: minimalGame.platforms,
        source: 'rawg',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "id",
      });

    console.log(`✅ [BATCH] Fetched and cached ${gameId} from RAWG API`);

    return minimalGame;
  } catch (err) {
    console.error(`❌ [BATCH] Error fetching game ${gameId}:`, err);
    return null;
  }
}

async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  maxConcurrent: number
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += maxConcurrent) {
    const batch = items.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }

  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const startTime = Date.now();

  try {
    const url = new URL(req.url);
    const idsParam = url.searchParams.get("ids");
    const locale = url.searchParams.get("locale") || "en";

    if (!idsParam) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing ids query param" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const gameIds = [...new Set(idsParam.split(",").map(id => id.trim()).filter(Boolean))];

    if (gameIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "No valid game IDs provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`📝 [BATCH-PERF] Fetching ${gameIds.length} games (locale: ${locale})`);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RAWG_KEY = Deno.env.get("VITE_RAWG_API_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const results = await processBatch(
      gameIds,
      (gameId) => fetchGameDataMinimal(gameId, locale, supabase, RAWG_KEY),
      MAX_CONCURRENT_API_CALLS
    );

    const gamesMap: { [key: string]: any } = {};
    let successCount = 0;
    let failCount = 0;

    results.forEach((game, index) => {
      const gameId = gameIds[index];
      if (game) {
        gamesMap[gameId] = game;
        successCount++;
      } else {
        gamesMap[gameId] = null;
        failCount++;
      }
    });

    const totalMs = Date.now() - startTime;
    console.log(`✅ [BATCH-PERF] Completed: ${successCount} success, ${failCount} fail, total_ms: ${totalMs}, avg_per_game: ${(totalMs / gameIds.length).toFixed(1)}ms`);

    return new Response(
      JSON.stringify({ ok: true, games: gamesMap }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=604800"
        },
      }
    );
  } catch (err: any) {
    console.error("❌ fetch-games-data server error:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Server error",
        details: err?.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
