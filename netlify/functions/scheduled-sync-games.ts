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

    // Get today's date for filtering
    const today = new Date().toISOString().split('T')[0];

    // PART 1: Syncer SEULEMENT les jeux non sortis (released > today)
    console.log("[SYNC] Syncing unreleased games...");

    const { data: gamesToSync, error: fetchError } = await supabase
      .from("games")
      .select("id, slug, name, released")
      .gt("released", today)
      .order("released")
      .limit(500);

    if (fetchError) throw fetchError;

    let updated = 0;
    let failed = 0;

    if (gamesToSync && gamesToSync.length > 0) {
      console.log(`[SYNC] Found ${gamesToSync.length} unreleased games to sync`);

      for (const game of gamesToSync) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 100));

          const rawgRes = await fetch(
            `https://api.rawg.io/api/games/${game.id}?key=${RAWG_API_KEY}`
          );

          if (!rawgRes.ok) {
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
              description_raw: rawgData.description,
              genres: rawgData.genres || [],
              platforms: rawgData.platforms || [],
              tags: rawgData.tags || [],
              playtime: rawgData.playtime,
              updated_at: new Date().toISOString()
            })
            .eq("id", game.id);

          if (!error) {
            updated++;
            console.log(`[SYNC] Updated: ${game.name}`);
          } else {
            failed++;
          }
        } catch (e) {
          console.error(`[SYNC] Error for game ${game.id}:`, e);
          failed++;
        }
      }
    } else {
      console.log("[SYNC] No unreleased games to sync");
    }

    // PART 2: Ajouter les NOUVEAUX jeux (recently added to RAWG)
    console.log("[SYNC] Searching for newly added games on RAWG...");
    let newAdded = 0;

    try {
      const newGamesRes = await fetch(
        `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-added&page_size=50`
      );

      if (newGamesRes.ok) {
        const { results: newGames } = await newGamesRes.json();

        if (newGames && newGames.length > 0) {
          console.log(`[SYNC] Found ${newGames.length} recently added games`);

          for (const game of newGames) {
            try {
              // Vérifier si jeu existe déjà
              const { data: existing, error: checkError } = await supabase
                .from("games")
                .select("id")
                .eq("id", game.id)
                .single();

              // Si pas d'erreur et data existe = jeu est déjà en DB
              if (!checkError && existing) {
                continue;
              }

              // Ajouter le nouveau jeu
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
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });

              if (!insertError) {
                newAdded++;
                console.log(`[SYNC] Added new: ${game.name}`);
              }
            } catch (e) {
              console.error(`[SYNC] Error adding game ${game.id}:`, e);
            }
          }
        }
      }
    } catch (e) {
      console.error("[SYNC] Error checking new games:", e);
    }

    console.log(
      `[SYNC] Complete. Updated: ${updated}, Failed: ${failed}, New added: ${newAdded}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        updated,
        failed,
        newAdded,
        message: `Updated ${updated} unreleased games, Added ${newAdded} new games`
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