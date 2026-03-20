import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RAWG_API_KEY = process.env.RAWG_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFromRawg(query) {
  const res = await fetch(query);
  if (!res.ok) throw new Error(`RAWG error: ${res.status}`);
  return res.json();
}

async function main() {
  console.log("🚀 Starting bulk load of 6900 games from 12 sources...\n");

  let allGames = [];
  let totalQueries = 0;

  const sources = [
    {
      name: "Top-rated all-time",
      pages: 10,
      query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-rating&page_size=100&page=${page}`,
    },
    {
      name: "Top-rated 2024-2026",
      pages: 20,
      query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&dates=2024-01-01,2026-12-31&ordering=-rating&page_size=100&page=${page}`,
    },
    {
      name: "Upcoming 2026-2029",
      pages: 5,
      query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&dates=2026-01-01,2029-12-31&ordering=-released&page_size=100&page=${page}`,
    },
    {
      name: "Recently added",
      pages: 5,
      query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-added&page_size=100&page=${page}`,
    },
    {
      name: "Action games",
      pages: 4,
      query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&genres=action&ordering=-rating&page_size=100&page=${page}`,
    },
    {
      name: "RPG games",
      pages: 4,
      query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&genres=role-playing-games-rpg&ordering=-rating&page_size=100&page=${page}`,
    },
    {
      name: "Indie games",
      pages: 4,
      query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&genres=indie&ordering=-rating&page_size=100&page=${page}`,
    },
    {
      name: "Strategy games",
      pages: 4,
      query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&genres=strategy&ordering=-rating&page_size=100&page=${page}`,
    },
    {
      name: "Adventure games",
      pages: 4,
      query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&genres=adventure&ordering=-rating&page_size=100&page=${page}`,
    },
    {
      name: "Simulation games",
      pages: 3,
      query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&genres=simulation&ordering=-rating&page_size=100&page=${page}`,
    },
    {
      name: "Sports games",
      pages: 3,
      query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&genres=sports&ordering=-rating&page_size=100&page=${page}`,
    },
    {
      name: "Puzzle games",
      pages: 3,
      query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&genres=puzzle&ordering=-rating&page_size=100&page=${page}`,
    },
  ];

  // Fetch from all sources
  for (const source of sources) {
    console.log(`\n📥 Fetching: ${source.name}`);

    for (let page = 1; page <= source.pages; page++) {
      try {
        totalQueries++;
        const query = source.query(page);
        const data = await fetchFromRawg(query);

        if (data.results && data.results.length > 0) {
          allGames.push(...data.results);
          console.log(
            `   ✅ Page ${page}/${source.pages}: ${data.results.length} games (total: ${allGames.length})`
          );
        }

        await sleep(2000); // Rate limit RAWG
      } catch (e) {
        console.error(`   ❌ Error page ${page}:`, e.message);
      }
    }
  }

  console.log(`\n📊 Total games fetched: ${allGames.length}`);
  console.log(`📊 Total queries: ${totalQueries}\n`);

  // Déduplicate
  const uniqueMap = new Map();
  allGames.forEach((g) => {
    if (!uniqueMap.has(g.id)) {
      uniqueMap.set(g.id, g);
    }
  });

  const uniqueGames = Array.from(uniqueMap.values());
  console.log(`🎯 Unique games after dedup: ${uniqueGames.length}\n`);

  // Check existants
  console.log("🔍 Checking existing games in DB...");
  const { data: existingGames } = await supabase
    .from("games")
    .select("id");

  const existingIds = new Set(existingGames?.map((g) => g.id) || []);
  const newGames = uniqueGames.filter((g) => !existingIds.has(g.id));

  console.log(`✅ New games to add: ${newGames.length}\n`);

  if (newGames.length === 0) {
    console.log("⚠️  All games already in DB!");
    return;
  }

  // Insert by batch
  const batchSize = 100;
  let totalAdded = 0;

  console.log("📤 Uploading to DB...\n");

  for (let i = 0; i < newGames.length; i += batchSize) {
    const batch = newGames.slice(i, i + batchSize);
    const progress = Math.round((i / newGames.length) * 100);

    const gamesToAdd = batch.map((game) => ({
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
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("games").insert(gamesToAdd);

    if (error) {
      console.error(`❌ Batch error:`, error);
    } else {
      totalAdded += batch.length;
      console.log(`   [${progress}%] Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} added`);
    }
  }

  console.log(`\n🎉 DONE! Added ${totalAdded} games to DB`);
  console.log(`📊 Final DB size: ${existingIds.size + totalAdded} games`);
  console.log(`⏱️  Total time: ~${Math.round((totalQueries * 2) / 60)} minutes for fetching`);
}

main().catch(console.error);