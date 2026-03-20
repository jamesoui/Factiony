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
  console.log("🚀 Starting bulk load...\n");

  let allGames = [];
  let totalQueries = 0;

  const sources = [
    { name: "PC Top-rated All-time", pages: 30, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&platforms=4&ordering=-rating&page_size=100&page=${page}` },
    { name: "PC Top-rated 2024-2026", pages: 20, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&platforms=4&dates=2024-01-01,2026-12-31&ordering=-rating&page_size=100&page=${page}` },
    { name: "PS5 Top-rated All-time", pages: 25, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&platforms=187&ordering=-rating&page_size=100&page=${page}` },
    { name: "PS5 Top-rated 2024-2026", pages: 20, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&platforms=187&dates=2024-01-01,2026-12-31&ordering=-rating&page_size=100&page=${page}` },
    { name: "Xbox Series X/S Top-rated", pages: 25, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&platforms=186&ordering=-rating&page_size=100&page=${page}` },
    { name: "Xbox Series 2024-2026", pages: 15, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&platforms=186&dates=2024-01-01,2026-12-31&ordering=-rating&page_size=100&page=${page}` },
    { name: "Nintendo Switch Top-rated", pages: 25, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&platforms=7&ordering=-rating&page_size=100&page=${page}` },
    { name: "Nintendo Switch 2024-2026", pages: 15, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&platforms=7&dates=2024-01-01,2026-12-31&ordering=-rating&page_size=100&page=${page}` },
    { name: "PS4 Top-rated All-time", pages: 20, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&platforms=18&ordering=-rating&page_size=100&page=${page}` },
    { name: "PS4 Top-rated 2024-2026", pages: 15, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&platforms=18&dates=2024-01-01,2026-12-31&ordering=-rating&page_size=100&page=${page}` },
    { name: "Upcoming 2026-2027", pages: 20, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&dates=2026-01-01,2027-12-31&ordering=-released&page_size=100&page=${page}` },
    { name: "Indie games", pages: 15, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&genres=indie&ordering=-rating&page_size=100&page=${page}` },
    { name: "Action games", pages: 12, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&genres=action&ordering=-rating&page_size=100&page=${page}` },
    { name: "RPG games", pages: 12, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&genres=role-playing-games-rpg&ordering=-rating&page_size=100&page=${page}` },
    { name: "Strategy games", pages: 10, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&genres=strategy&ordering=-rating&page_size=100&page=${page}` },
    { name: "Adventure games", pages: 10, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&genres=adventure&ordering=-rating&page_size=100&page=${page}` },
    { name: "Recently added 2026", pages: 15, query: (page) => `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-added&page_size=100&page=${page}` },
  ];

  for (const source of sources) {
    console.log(`\n📥 ${source.name}`);
    for (let page = 1; page <= source.pages; page++) {
      try {
        totalQueries++;
        const data = await fetchFromRawg(source.query(page));
        if (data.results?.length > 0) {
          allGames.push(...data.results);
          console.log(`   ✅ Page ${page}/${source.pages}`);
        }
        await sleep(2000);
      } catch (e) {
        console.error(`   ❌ Page ${page}:`, e.message);
      }
    }
  }

  console.log(`\n📊 Total: ${allGames.length} games\n`);

  const uniqueMap = new Map();
  allGames.forEach((g) => uniqueMap.set(g.id, g));
  const uniqueGames = Array.from(uniqueMap.values());

  console.log(`🎯 Unique: ${uniqueGames.length}\n`);

  const { data: existingGames } = await supabase.from("games").select("id");
  const existingIds = new Set(existingGames?.map((g) => g.id.toString()) || []);
  const newGames = uniqueGames.filter((g) => !existingIds.has(g.id));

  console.log(`✅ New to add: ${newGames.length}\n`);

  if (newGames.length === 0) return;

  let totalAdded = 0;
for (let i = 0; i < newGames.length; i += 100) {
  const batch = newGames.slice(i, i + 100);
  const gamesToAdd = batch.map((game) => ({
    id: game.id.toString(),
    slug: game.slug,
    name: game.name,
    released: game.released,
    description_raw: game.description,
    genres: game.genres || [],
    platforms: game.platforms || [],
    tags: game.tags || [],
    metacritic: game.metacritic?.toString() || null,
    playtime: game.playtime || 0,
    background_image: game.background_image,
    cover: game.cover_image || game.background_image,
    source: "rawg",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("games").upsert(gamesToAdd, { onConflict: 'id' });
  if (error) {
    console.error(`❌ Batch ${i/100} error:`, error.message);
  } else {
    totalAdded += batch.length;
    console.log(`   [${Math.round((i / newGames.length) * 100)}%] +${batch.length}`);
  }
}

  console.log(`\n🎉 Added ${totalAdded} games!`);
  console.log(`📊 DB size: ${existingIds.size + totalAdded}`);
}

main().catch(console.error);
