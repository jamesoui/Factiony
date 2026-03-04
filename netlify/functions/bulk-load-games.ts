// netlify/functions/bulk-load-games.ts

import { createClient } from "@supabase/supabase-js";

export const handler = async () => {
  try {
    console.log("[BULK] Starting bulk load of games...");

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const RAWG_API_KEY = process.env.RAWG_API_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RAWG_API_KEY) {
      throw new Error("Missing env vars");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Définir les différentes requêtes RAWG pour couvrir tous les types de jeux
    const queries = [
      // Top rated all-time
      `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-rating&page_size=100&page=1`,
      `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-rating&page_size=100&page=2`,
      `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-rating&page_size=100&page=3`,

      // Top 2024-2026
      `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&dates=2024-01-01,2026-12-31&ordering=-rating&page_size=100&page=1`,
      `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&dates=2024-01-01,2026-12-31&ordering=-rating&page_size=100&page=2`,

      // Most anticipated 2025-2026
      `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&dates=2025-01-01,2026-12-31&ordering=-added&page_size=100&page=1`,
      `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&dates=2025-01-01,2026-12-31&ordering=-added&page_size=100&page=2`,

      // Recently added
      `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-added&page_size=100&page=1`,
      `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-added&page_size=100&page=2`,
    ];

    let totalAdded = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    // Fetch all games from all queries
    for (const query of queries) {
      try {
        console.log(`[BULK] Fetching: ${query.split('&')[1]}`);

        const res = await fetch(query);
        if (!res.ok) {
          console.warn(`[BULK] Failed to fetch: ${res.status}`);
          continue;
        }

        const { results: games } = await res.json();

        if (!games || games.length === 0) {
          continue;
        }

        console.log(`[BULK] Processing ${games.length} games from query`);

        for (const game of games) {
          try {
            // Vérifier si jeu existe déjà
            const { data: existing, error: checkError } = await supabase
              .from("games")
              .select("id")
              .eq("id", game.id)
              .single();

            if (!checkError && existing) {
              totalSkipped++;
              continue;
            }

            // Ajouter le jeu
            const { error: insertError } = await supabase
              .from("games")
              .insert({
                id: game.id,
                slug: game.slug,
                name: game.name,
                released: game.released,
                description_raw: game.description,
                genres: game.genres || [],
                platforms: game.platforms || [],
                tags: game.tags || [],
                metacritic: game.metacritic,
                playtime: game.playtime,
                background_image: game.background_image,
                cover: game.cover_image,
                rating: game.rating,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (!insertError) {
              totalAdded++;
              if (totalAdded % 50 === 0) {
                console.log(`[BULK] Progress: ${totalAdded} added`);
              }
            } else {
              totalFailed++;
            }
          } catch (e) {
            console.error(`[BULK] Error processing game ${game.id}:`, e);
            totalFailed++;
          }

          // Rate limiting
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } catch (e) {
        console.error(`[BULK] Error fetching query:`, e);
      }

      // Pause between major queries
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(
      `[BULK] Complete. Added: ${totalAdded}, Skipped: ${totalSkipped}, Failed: ${totalFailed}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        added: totalAdded,
        skipped: totalSkipped,
        failed: totalFailed,
        message: `Bulk load complete: ${totalAdded} new games added`
      })
    };
  } catch (error) {
    console.error("[BULK] Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error"
      })
    };
  }
};