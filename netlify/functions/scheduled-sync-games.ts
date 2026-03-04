// netlify/functions/scheduled-sync-games.ts

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

export default async () => {
  const RAWG_API_KEY = Deno.env.get("RAWG_API_KEY");

  try {
    console.log("[SYNC] Starting daily RAWG sync rotation...");

    // Calcule quel batch syncer aujourd'hui (rotation)
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const batchNumber = dayOfYear % 100; // 0-99 (100 jours de rotation)
    const offset = batchNumber * 100;

    console.log(`[SYNC] Batch ${batchNumber}, offset ${offset}`);

    // Fetch jeux par batch (rotation sur tous les jeux)
    const { data: gamesToSync, error: fetchError } = await supabase
      .from("games")
      .select("id, slug, name")
      .order("id")
      .range(offset, offset + 99); // 100 jeux par jour

    if (fetchError || !gamesToSync || gamesToSync.length === 0) {
      console.log("[SYNC] No games to sync in this batch");
      return new Response(
        JSON.stringify({ success: true, updated: 0, message: "No games in batch" }),
        { status: 200 }
      );
    }

    let updated = 0;
    let failed = 0;

    for (const game of gamesToSync) {
      try {
        // Rate limit: 100ms entre requêtes
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Fetch depuis RAWG
        const rawgRes = await fetch(
          `https://api.rawg.io/api/games/${game.id}?key=${RAWG_API_KEY}`
        );

        if (!rawgRes.ok) {
          console.warn(`[SYNC] RAWG error for game ${game.id}: ${rawgRes.status}`);
          failed++;
          continue;
        }

        const rawgData = await rawgRes.json();

        // Update dans Supabase
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
            updated_at: new Date().toISOString(),
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

    console.log(`[SYNC] Batch ${batchNumber} complete. Updated: ${updated}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        batch: batchNumber,
        updated,
        failed,
        message: `Synced batch ${batchNumber} (100 games)`
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("[SYNC] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
};

export const config = {
  schedule: "0 2 * * *", // Chaque jour à 2am
};
```

---

## 🔄 **Ce que ça change:**
```
AVANT:
  - Synce 100 jeux modifiés sur RAWG
  - Les autres restent statiques
  - ❌ 10k jeux jamais tous à jour

APRÈS:
  - Jour 1: Synce jeux 0-99
  - Jour 2: Synce jeux 100-199
  - ...
  - Jour 100: Synce jeux 9900-9999
  - Jour 101: Restart (jeux 0-99)
  
  ✅ Après 100 jours, tous les jeux sont sync!