import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Warm-Secret",
};

const TOP_75_GAMES = [
  { name: "Minecraft", slug: "minecraft" },
  { name: "Fortnite", slug: "fortnite" },
  { name: "Roblox", slug: "roblox" },
  { name: "League of Legends", slug: "league-of-legends" },
  { name: "Counter-Strike 2", slug: "counter-strike-2" },
  { name: "Grand Theft Auto V", slug: "grand-theft-auto-v" },
  { name: "Call of Duty: Warzone", slug: "call-of-duty-warzone" },
  { name: "Valorant", slug: "valorant" },
  { name: "Apex Legends", slug: "apex-legends" },
  { name: "PUBG: Battlegrounds", slug: "pubg-battlegrounds" },
  { name: "Dota 2", slug: "dota-2" },
  { name: "Genshin Impact", slug: "genshin-impact" },
  { name: "FIFA 23", slug: "fifa-23" },
  { name: "EA Sports FC 24", slug: "ea-sports-fc-24" },
  { name: "Rocket League", slug: "rocket-league" },
  { name: "Among Us", slug: "among-us" },
  { name: "World of Warcraft", slug: "world-of-warcraft" },
  { name: "The Sims 4", slug: "the-sims-4" },
  { name: "Rainbow Six Siege", slug: "rainbow-six-siege" },
  { name: "Overwatch 2", slug: "overwatch-2" },
  { name: "Elden Ring", slug: "elden-ring" },
  { name: "Hogwarts Legacy", slug: "hogwarts-legacy" },
  { name: "Dead by Daylight", slug: "dead-by-daylight" },
  { name: "Destiny 2", slug: "destiny-2" },
  { name: "Monster Hunter: World", slug: "monster-hunter-world" },
  { name: "Monster Hunter Rise", slug: "monster-hunter-rise" },
  { name: "ARK: Survival Evolved", slug: "ark-survival-evolved" },
  { name: "Rust", slug: "rust" },
  { name: "Fall Guys", slug: "fall-guys" },
  { name: "Teamfight Tactics", slug: "teamfight-tactics" },
  { name: "Clash of Clans", slug: "clash-of-clans" },
  { name: "Clash Royale", slug: "clash-royale" },
  { name: "Pokémon GO", slug: "pokemon-go" },
  { name: "Mobile Legends: Bang Bang", slug: "mobile-legends-bang-bang" },
  { name: "Free Fire", slug: "free-fire" },
  { name: "Brawl Stars", slug: "brawl-stars" },
  { name: "Path of Exile", slug: "path-of-exile" },
  { name: "Diablo IV", slug: "diablo-iv" },
  { name: "Lost Ark", slug: "lost-ark" },
  { name: "Final Fantasy XIV", slug: "final-fantasy-xiv" },
  { name: "Street Fighter 6", slug: "street-fighter-6" },
  { name: "Tekken 8", slug: "tekken-8" },
  { name: "Mortal Kombat 11", slug: "mortal-kombat-11" },
  { name: "NBA 2K24", slug: "nba-2k24" },
  { name: "Red Dead Redemption 2", slug: "red-dead-redemption-2" },
  { name: "Cyberpunk 2077", slug: "cyberpunk-2077" },
  { name: "Terraria", slug: "terraria" },
  { name: "Stardew Valley", slug: "stardew-valley" },
  { name: "Palworld", slug: "palworld" },
  { name: "Sea of Thieves", slug: "sea-of-thieves" },
  { name: "Warframe", slug: "warframe" },
  { name: "Escape from Tarkov", slug: "escape-from-tarkov" },
  { name: "The Elder Scrolls Online", slug: "the-elder-scrolls-online" },
  { name: "Black Desert Online", slug: "black-desert-online" },
  { name: "Forza Horizon 5", slug: "forza-horizon-5" },
  { name: "Gran Turismo 7", slug: "gran-turismo-7" },
  { name: "Mario Kart 8 Deluxe", slug: "mario-kart-8-deluxe" },
  { name: "Super Smash Bros. Ultimate", slug: "super-smash-bros-ultimate" },
  { name: "Animal Crossing: New Horizons", slug: "animal-crossing-new-horizons" },
  { name: "Zelda: Breath of the Wild", slug: "zelda-breath-of-the-wild" },
  { name: "Zelda: Tears of the Kingdom", slug: "zelda-tears-of-the-kingdom" },
  { name: "Football Manager 2024", slug: "football-manager-2024" },
  { name: "Valheim", slug: "valheim" },
  { name: "Subnautica", slug: "subnautica" },
  { name: "Baldur's Gate 3", slug: "baldurs-gate-3" },
  { name: "Hades", slug: "hades" },
  { name: "Stray", slug: "stray" },
  { name: "God of War", slug: "god-of-war" },
  { name: "Spider-Man", slug: "marvels-spider-man" },
  { name: "Horizon Zero Dawn", slug: "horizon-zero-dawn" },
  { name: "The Last of Us Part II", slug: "the-last-of-us-part-ii" },
  { name: "Ghost of Tsushima", slug: "ghost-of-tsushima" },
  { name: "Uncharted 4", slug: "uncharted-4-a-thiefs-end" },
  { name: "Bloodborne", slug: "bloodborne" },
  { name: "Dark Souls III", slug: "dark-souls-iii" }
];

interface CoverCacheEntry {
  slug: string;
  updated_at: string;
  version: number;
}

async function resizeImage(buffer: ArrayBuffer, maxWidth: number = 600): Promise<Blob> {
  return new Blob([buffer], { type: 'image/jpeg' });
}

async function downloadAndUploadCover(
  supabaseAdmin: any,
  game: { name: string; slug: string },
  rawgKey: string,
  force: boolean = false
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: existingCache, error: cacheError } = await supabaseAdmin
      .from('top_games_covers_cache')
      .select('updated_at, version')
      .eq('slug', game.slug)
      .maybeSingle();

    if (!force && existingCache && existingCache.updated_at) {
      const cacheAge = Date.now() - new Date(existingCache.updated_at).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      if (cacheAge < thirtyDaysMs) {
        return {
          success: true,
          message: `Cache still valid for ${game.slug} (${Math.floor(cacheAge / (24 * 60 * 60 * 1000))} days old)`
        };
      }
    }

    console.log(`🎮 Processing ${game.slug}...`);

    // Try direct slug lookup first
    let rawgUrl = `https://api.rawg.io/api/games/${game.slug}`;
    let rawgResponse = await fetch(`${rawgUrl}?key=${rawgKey}`);
    let rawgData = null;

    if (!rawgResponse.ok) {
      console.warn(`⚠️ RAWG slug lookup failed for ${game.slug}: ${rawgResponse.status}, trying search fallback...`);

      // Fallback: search by game name
      const searchUrl = `https://api.rawg.io/api/games?search=${encodeURIComponent(game.name)}&page_size=1`;
      const searchResponse = await fetch(`${searchUrl}&key=${rawgKey}`);

      if (!searchResponse.ok) {
        console.warn(`⚠️ RAWG search also failed for ${game.name}: ${searchResponse.status}`);
        return { success: false, message: `RAWG search failed: ${searchResponse.status}` };
      }

      const searchData = await searchResponse.json();

      if (!searchData.results || searchData.results.length === 0) {
        console.warn(`⚠️ RAWG search found no results for ${game.name}`);
        return { success: false, message: 'RAWG search found no results' };
      }

      rawgData = searchData.results[0];
      console.log(`✅ Found via search: ${rawgData.name} (id: ${rawgData.id})`);
    } else {
      rawgData = await rawgResponse.json();
    }

    const coverUrl = rawgData.background_image;

    if (!coverUrl) {
      console.warn(`⚠️ No cover URL found for ${game.slug}`);
      return { success: false, message: 'No cover URL found' };
    }

    console.log(`📥 Downloading cover for ${game.slug} from ${coverUrl}`);
    const imageResponse = await fetch(coverUrl);

    if (!imageResponse.ok) {
      console.warn(`⚠️ Failed to download image for ${game.slug}: ${imageResponse.status}`);
      return { success: false, message: `Image download failed: ${imageResponse.status}` };
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBlob = await resizeImage(imageBuffer, 600);

    const storagePath = `top50/${game.slug}.jpg`;
    console.log(`📤 Uploading to storage: ${storagePath}`);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('top-game-covers')
      .upload(storagePath, imageBlob, {
        contentType: 'image/jpeg',
        upsert: true,
        cacheControl: '2592000'
      });

    if (uploadError) {
      console.error(`❌ Upload error for ${game.slug}:`, uploadError);
      return { success: false, message: `Upload error: ${uploadError.message}` };
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('top-game-covers')
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`✅ Public URL: ${publicUrl}`);

    const { error: dbError } = await supabaseAdmin
      .from('top_games_covers_cache')
      .upsert({
        slug: game.slug,
        game_id: rawgData.id?.toString() || game.slug,
        title: rawgData.name || game.name,
        source_cover_url: coverUrl,
        storage_path: storagePath,
        public_url: publicUrl,
        updated_at: new Date().toISOString(),
        version: (existingCache?.version || 0) + 1,
        width: 600,
        height: null
      });

    if (dbError) {
      console.error(`❌ DB error for ${game.slug}:`, dbError);
      return { success: false, message: `DB error: ${dbError.message}` };
    }

    console.log(`✅ Successfully cached ${game.slug}`);
    return { success: true, message: 'Success' };

  } catch (error) {
    console.error(`❌ Error processing ${game.slug}:`, error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const url = new URL(req.url);
  if (url.searchParams.get("diag") === "1") {
    const diagnostics = {
      hasWarmV2: !!Deno.env.get("WARM_SECRET_V2"),
      hasWarmSecret: !!Deno.env.get("WARM_SECRET"),
      hasWarmTopNamed: !!Deno.env.get("WARM_TOP_COVERS_SECRET"),
      hasPing: !!Deno.env.get("PING_SECRET"),
      hasRawg: !!Deno.env.get("RAWG_API_KEY"),
      hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
      hasServiceRole: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    };

    return new Response(
      JSON.stringify(diagnostics),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const warmSecret =
      Deno.env.get("WARM_SECRET_V2")
      ?? Deno.env.get("WARM_SECRET")
      ?? Deno.env.get("WARM_TOP_COVERS_SECRET");
    const providedSecret = req.headers.get("X-Warm-Secret");

    if (!warmSecret) {
      console.error("Warm secret not configured in Edge Function secrets");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!providedSecret || providedSecret !== warmSecret) {
      console.warn("Unauthorized access attempt to warm-top-game-covers");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or missing X-Warm-Secret header" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const rawgKey = Deno.env.get("RAWG_API_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase credentials in Edge Function secrets" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!rawgKey) {
      return new Response(
        JSON.stringify({ error: "RAWG_API_KEY missing in Edge Function secrets" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { force = false, limit = 75 } = await req.json().catch(() => ({ force: false, limit: 75 }));

    console.log(`🚀 Starting warm-top-game-covers (force: ${force}, limit: ${limit})`);

    const gamesToProcess = TOP_75_GAMES.slice(0, limit);
    const results = {
      total: gamesToProcess.length,
      processed: 0,
      updated: 0,
      cached: 0,
      failed: 0,
      details: [] as any[]
    };

    const MAX_CONCURRENT = 3;
    for (let i = 0; i < gamesToProcess.length; i += MAX_CONCURRENT) {
      const batch = gamesToProcess.slice(i, i + MAX_CONCURRENT);
      const batchResults = await Promise.all(
        batch.map(game => downloadAndUploadCover(supabaseAdmin, game, rawgKey, force))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const game = batch[j];

        results.processed++;
        if (result.success) {
          if (result.message.includes('Cache still valid')) {
            results.cached++;
          } else {
            results.updated++;
          }
        } else {
          results.failed++;
        }

        results.details.push({
          slug: game.slug,
          success: result.success,
          message: result.message
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Completed: ${results.updated} updated, ${results.cached} cached, ${results.failed} failed`);

    return new Response(
      JSON.stringify(results),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Error in warm-top-game-covers:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
