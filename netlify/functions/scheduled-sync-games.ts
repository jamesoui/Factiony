// netlify/functions/scheduled-sync-games.ts

import { createClient } from "@supabase/supabase-js";

export const handler = async () => {
  try {
    console.log("[SYNC] Starting daily sync...");

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const RAWG_API_KEY = process.env.RAWG_API_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RAWG_API_KEY) {
      throw new Error("Missing env vars");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Cutoff : tout ce que RAWG a modifié dans les dernières 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    let page = 1;
    let totalUpserted = 0;
    let totalFailed = 0;
    let done = false;

    while (!done) {
      console.log(`[SYNC] Fetching page ${page}...`);

      const res = await fetch(
        `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-updated&page_size=100&page=${page}`
      );

      if (!res.ok) {
        console.error(`[SYNC] RAWG error on page ${page}: ${res.status}`);
        break;
      }

      const { results, next } = await res.json();

      if (!results || results.length === 0) break;

      for (const game of results) {
        // Dès qu'on trouve un jeu modifié avant le cutoff, on arrête tout
        if (game.updated && new Date(game.updated) < cutoff) {
          console.log(`[SYNC] Reached games older than 24h at page ${page}. Stopping.`);
          done = true;
          break;
        }

        const { error } = await supabase.from("games").upsert(
          {
            id: game.id,
            slug: game.slug,
            name: game.name,
            released: game.released,
            background_image: game.background_image,
            genres: game.genres || [],
            platforms: game.platforms || [],
            tags: game.tags || [],
            metacritic: game.metacritic,
            playtime: game.playtime,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

        if (error) {
          console.error(`[SYNC] Upsert error for ${game.name}:`, error.message);
          totalFailed++;
        } else {
          totalUpserted++;
        }
      }

      // Plus de pages dispo côté RAWG
      if (!next) break;

      page++;

      // Pause entre pages pour ne pas spammer RAWG
      await new Promise((r) => setTimeout(r, 300));
    }

    console.log(
      `[SYNC] Complete. Pages fetched: ${page}, Upserted: ${totalUpserted}, Failed: ${totalFailed}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        pages: page,
        upserted: totalUpserted,
        failed: totalFailed,
      }),
    };
  } catch (error) {
    console.error("[SYNC] Fatal error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

export const config = {
  schedule: "0 2 * * *",
};