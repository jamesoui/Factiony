// netlify/functions/scheduled-sync-games.ts

import { createClient } from "@supabase/supabase-js";

export default async (req: any, context: any) => {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RAWG_API_KEY = process.env.RAWG_API_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RAWG_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing env vars" })
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log("[SYNC] Starting daily RAWG sync rotation...");

    const today = new Date();
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    );
    const batchNumber = dayOfYear % 100;
    const offset = batchNumber * 100;

    console.log(`[SYNC] Batch ${batchNumber}, offset ${offset}`);

    const { data: gamesToSync, error: fetchError } = await supabase
      .from("games")
      .select("id, slug, name")
      .order("id")
      .range(offset, offset + 99);

    if (fetchError || !gamesToSync || gamesToSync.length === 0) {
      console.log("[SYNC] No games to sync in this batch");
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          updated: 0,
          message: "No games in batch"
        })
      };
    }

    let updated = 0;
    let failed = 0;

    for (const game of gamesToSync) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const rawgRes = await fetch(
          `https://api.rawg.io/api/games/${game.id}?key=${RAWG_API_KEY}`
        );

        if (!rawgRes.ok) {
          console.warn(`[SYNC] RAWG error for game ${game.id}: ${rawgRes.status}`);
          failed++;
          continue;
        }

        const rawgData = await rawgRes.json();

        const { error } = await supabase
          .from("games")
          .update({
            slug: rawgData.slug || game.slug,
            name: rawgData.name || game.name,
            released: rawgData.released,
            description_raw: rawgData.description || rawgData.description_raw,
            genres: rawgData.genres || [],
            platforms: rawgData.platforms || [],
            tags: rawgData.tags || [],
            metacritic: rawgData.metacritic,
            playtime: rawgData.playtime,
            updated_at: new Date().toISOString()
          })
          .eq("id", game.id);

        if (!error) {
          updated++;
          console.log(`[SYNC] Updated: ${game.name}`);
        } else {
          failed++;
          console.warn(`[SYNC] DB error for ${game.id}:`, error);
        }
      } catch (e) {
        console.error(`[SYNC] Error processing game ${game.id}:`, e);
        failed++;
      }
    }

    console.log(
      `[SYNC] Batch ${batchNumber} complete. Updated: ${updated}, Failed: ${failed}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        batch: batchNumber,
        updated,
        failed,
        message: `Synced batch ${batchNumber} (100 games)`
      })
    };
  } catch (error) {
    console.error("[SYNC] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error"
      })
    };
  }
};

export const config = {
  schedule: "0 2 * * *"
};