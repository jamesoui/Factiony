// netlify/edge-functions/ai-reco.ts

import { createClient } from "@supabase/supabase-js";

function jsonResponse(body: any, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

function stripJsonCodeFences(raw: string): string {
  const s = (raw ?? "").trim();
  if (s.startsWith("```")) {
    return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  return s;
}

function safeParseJson(raw: string) {
  const cleaned = stripJsonCodeFences(raw);
  try {
    return { ok: true as const, value: JSON.parse(cleaned), cleaned };
  } catch (e) {
    return { ok: false as const, error: String(e), cleaned };
  }
}

export default async (request: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
  const RAWG_API_KEY = Deno.env.get("VITE_RAWG_API_KEY") || '11b490685c024c71a0c6562e37e1a87d';
  const BASE_URL = Deno.env.get("FACTIONY_BASE_URL") ?? "https://factiony.com";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !MISTRAL_API_KEY) {
    return jsonResponse({ error: "Missing env vars" }, 500, corsHeaders);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders);
  }

  const query = (body?.query ?? "").toString().trim();
  const userPseudo = (body?.user_pseudo ?? "Joueur").toString().trim();
  
  if (!query) {
    return jsonResponse({ error: "Missing query" }, 400, corsHeaders);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const queryLower = query.toLowerCase();

  console.log("[AI-RECO] Query:", query, "User:", userPseudo);

  // STEP 1: Parse query to extract keywords
  let platformId = null;
  let tags: string[] = [];
  let genre: string | null = null;

  // Extract platform
  if (queryLower.includes("ps5") || queryLower.includes("playstation 5")) {
    platformId = "187";
  } else if (queryLower.includes("xbox")) {
    platformId = "186";
  } else if (queryLower.includes("switch")) {
    platformId = "7";
  } else if (queryLower.includes("pc")) {
    platformId = "4";
  }

  // Extract tags
  if (queryLower.includes("coop") || queryLower.includes("coopératif")) {
    tags.push("coop");
  }
  if (queryLower.includes("multiplayer") || queryLower.includes("multijoueur")) {
    tags.push("multiplayer");
  }
  if (queryLower.includes("solo")) {
    tags.push("single-player");
  }

  // Extract genre
  const genres: Record<string, string> = {
    "rpg": "rpg",
    "action": "action",
    "strategy": "strategy",
    "adventure": "adventure",
    "puzzle": "puzzle",
    "shooter": "shooter",
    "racing": "racing",
    "horror": "horror",
    "indie": "indie",
  };

  for (const [keyword, genreName] of Object.entries(genres)) {
    if (queryLower.includes(keyword)) {
      genre = genreName;
      break;
    }
  }

  console.log("[AI-RECO] Parsed - platform:", platformId, "tags:", tags, "genre:", genre);

  // STEP 2: Build RAWG query
  const rawgParams = new URLSearchParams();
  rawgParams.set("key", RAWG_API_KEY);
  rawgParams.set("page_size", "25");
  rawgParams.set("ordering", "-rating");

  if (platformId) {
    rawgParams.set("platforms", platformId);
  }

  if (tags.length > 0) {
    rawgParams.set("tags", tags.join(","));
  }

  if (genre) {
    rawgParams.set("genres", genre);
  }

  let searchKeywords = queryLower
    .replace(/ps5|playstation|xbox|switch|pc|coop|multiplayer|solo|rpg|action|strategy|adventure|puzzle|shooter|racing|horror|indie|sur|on|à|pour|jeux|game|games/gi, "")
    .trim()
    .split(/\s+/)
    .filter((w: string) => w.length > 2)
    .slice(0, 2)
    .join(" ");

  if (searchKeywords) {
    rawgParams.set("search", searchKeywords);
  }

  // STEP 3: Call RAWG API
  let rawgGames: any[] = [];
  try {
    const rawgUrl = `https://api.rawg.io/api/games?${rawgParams.toString()}`;
    console.log("[AI-RECO] RAWG URL:", rawgUrl);
    
    const rawgRes = await fetch(rawgUrl);

    if (rawgRes.ok) {
      const rawgData = await rawgRes.json();
      rawgGames = rawgData.results || [];
      console.log("[AI-RECO] RAWG returned", rawgGames.length, "games");
    } else {
      console.error("[AI-RECO] RAWG error:", rawgRes.status);
    }
  } catch (e) {
    console.error("[AI-RECO] RAWG fetch error:", e);
  }

  if (rawgGames.length === 0) {
    return jsonResponse(
      {
        query,
        recommendations: [],
        answer: "Aucun jeu trouvé. Essaie une autre recherche!",
      },
      200,
      corsHeaders
    );
  }

  // STEP 4: Enrich with FACTIONY data
  let factinyDataMap: Record<string, any> = {};
  try {
    const { data: factinyGames } = await supabase
      .from("games")
      .select("id, name, slug")
      .limit(200);

    if (factinyGames) {
      factinyGames.forEach((fg: any) => {
        factinyDataMap[fg.name.toLowerCase()] = fg;
      });
    }

    const [signalsRes, commentsRes] = await Promise.all([
      supabase.from("game_signals").select("game_id, avg_rating, ratings_count"),
      supabase.from("game_comments").select("game_id, content, rating"),
    ]);

    let gameSignalsMap: Record<string, any> = {};
    let gameCommentsMap: Record<string, any[]> = {};

    if (signalsRes.data) {
      signalsRes.data.forEach((s: any) => {
        gameSignalsMap[s.game_id] = s;
      });
    }

    if (commentsRes.data) {
      commentsRes.data.forEach((c: any) => {
        if (!gameCommentsMap[c.game_id]) gameCommentsMap[c.game_id] = [];
        gameCommentsMap[c.game_id].push(c);
      });
    }

    rawgGames = rawgGames.map((game: any) => {
      const factinyMatch = factinyDataMap[game.name.toLowerCase()];

      if (factinyMatch) {
        const signals = gameSignalsMap[factinyMatch.id];
        const comments = gameCommentsMap[factinyMatch.id] || [];

        return {
          ...game,
          factiony_id: factinyMatch.id,
          factiony_slug: factinyMatch.slug,
          factiony_rating: signals?.avg_rating,
          factiony_ratings_count: signals?.ratings_count,
          factiony_comments: comments.slice(0, 3),
        };
      }
      return game;
    });
  } catch (e) {
    console.error("[AI-RECO] Factiony enrichment error:", e);
  }

  // STEP 5: Send to Mistral
  const systemPrompt = `Tu es Factiony AI, l'expert gaming passionné de la communauté.

Tu dois:
1. Recommander les 3 meilleurs jeux basé sur la demande
2. Expliquer POURQUOI chaque jeu match parfaitement
3. À LA FIN: Faire un résumé des 3 choix et poser une question ouverte pour relancer la conversation

La question doit être du style:
- "Est-ce qu'un de ces trois te tente? Ou tu cherches quelque chose de plus spécifique?"
- "Lequel de ces trois t'attire le plus? Tu veux plus de détails sur l'un d'eux?"
- "Un de ces jeux t'intéresse? Ou je peux affiner ma recherche avec plus d'infos?"

IMPORTANT:
- Si demande "COOP" → recommande UNIQUEMENT jeux avec tag coop
- Si demande "MULTIPLAYER" → recommande UNIQUEMENT multiplayer
- Si demande plateforme → recommande UNIQUEMENT cette plateforme
- Sois honnête: si aucun match → dis-le
- Sois passionné, enthousiaste, utilise des emojis gaming
- Engage la conversation!`;

  const gamesData = rawgGames.slice(0, 10).map((game: any) => ({
    id: game.id,
    slug: game.slug,
    name: game.name,
    genres: (game.genres || []).map((g: any) => g.name).join(", "),
    platforms: (game.platforms || []).map((p: any) => p.platform.name).join(", "),
    released: game.released,
    rating: game.rating,
    factiony_rating: game.factiony_rating ? `${game.factiony_rating.toFixed(1)}/5 (${game.factiony_ratings_count} users)` : "Not rated",
  }));

  const userPrompt = `${userPseudo} te demande: "${query}"

Voici les meilleurs jeux qui matchent:
${JSON.stringify(gamesData, null, 2)}

Recommande les 3 meilleurs, explique pourquoi, puis fais un résumé + pose une question ouverte pour relancer.`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      signal: controller.signal,
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.8,
        max_tokens: 1200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!mistralRes.ok) throw new Error(`Mistral ${mistralRes.status}`);

    const mistralJson = await mistralRes.json();
    const raw = mistralJson?.choices?.[0]?.message?.content ?? "";

    // Extract recommendations from text (pattern matching)
    const recommendations: any[] = [];
    const gameMatches = raw.matchAll(/🎮\s*([^\n]+)\n([^\n]*?\n)*?([A-Za-z0-9\-_]+)?/g);
    
    let gameIndex = 0;
    for (const match of gameMatches) {
      if (gameIndex >= 3) break;
      const title = match[1]?.trim();
      if (title) {
        const game = rawgGames.find(g => g.name.toLowerCase().includes(title.toLowerCase().replace(/[^a-z0-9\s]/g, '')));
        if (game) {
          recommendations.push({
            slug: game.slug,
            title: game.name,
            why: `${game.genres?.slice(0, 2).join(", ")} - Rating: ${game.rating}/5`,
            url: `${BASE_URL}/game/${game.slug}-${game.id}`,
          });
          gameIndex++;
        }
      }
    }

    // If extraction failed, use top 3
    if (recommendations.length === 0) {
      recommendations.push(
        ...rawgGames.slice(0, 3).map((g: any) => ({
          slug: g.slug,
          title: g.name,
          why: `${g.genres?.map((x: any) => x.name).slice(0, 2).join(", ")} - Rating: ${g.rating}/5`,
          url: `${BASE_URL}/game/${g.slug}-${g.id}`,
        }))
      );
    }

    return jsonResponse(
      {
        query,
        user_pseudo: userPseudo,
        recommendations: recommendations.slice(0, 3),
        personal_message: raw,
      },
      200,
      corsHeaders
    );
  } catch (e) {
    console.error("[AI-RECO] Error:", e);
    const top3 = rawgGames.slice(0, 3);
    const summary = `Voilà mes 3 recommandations pour toi, ${userPseudo}:\n${top3.map((g, i) => `${i+1}. ${g.name}`).join("\n")}\n\nL'un de ces trois jeux te tente? Ou tu veux que je cherche avec plus de détails?`;
    
    return jsonResponse(
      {
        query,
        user_pseudo: userPseudo,
        recommendations: top3.map((g: any) => ({
          slug: g.slug,
          title: g.name,
          why: `${g.genres?.map((x: any) => x.name).join(", ")} - ${g.rating}/5`,
          url: `${BASE_URL}/game/${g.slug}-${g.id}`,
        })),
        personal_message: summary,
      },
      200,
      corsHeaders
    );
  }
};

export const config = { path: "/api/ai-reco" };