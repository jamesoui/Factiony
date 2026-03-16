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
  const userPseudo = (body?.user_pseudo ?? "Gamer").toString().trim();
  
  if (!query) {
    return jsonResponse({ error: "Missing query" }, 400, corsHeaders);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const queryLower = query.toLowerCase();

  console.log("[AI-RECO] Query:", query, "User:", userPseudo);

  // PARSE QUERY
  let platformId = null;
  
  if (queryLower.includes("ps5") || queryLower.includes("playstation 5")) {
    platformId = "187";
  } else if (queryLower.includes("xbox")) {
    platformId = "186";
  } else if (queryLower.includes("switch")) {
    platformId = "7";
  } else if (queryLower.includes("pc")) {
    platformId = "4";
  }

  // Extract keywords (remove platform/feature words)
  let searchKeywords = queryLower
    .replace(/ps5|playstation|xbox|switch|pc|sur|on|à|pour|jeux|game|games|this|that|the|a|an/gi, "")
    .trim()
    .split(/\s+/)
    .filter((w: string) => w.length > 2)
    .slice(0, 4)
    .join(" ");

  console.log("[AI-RECO] Platform:", platformId, "Keywords:", searchKeywords);

  // BUILD RAWG QUERY
  const rawgParams = new URLSearchParams();
  rawgParams.set("key", RAWG_API_KEY);
  rawgParams.set("page_size", "80");
  rawgParams.set("ordering", "-rating");

  if (platformId) {
    rawgParams.set("platforms", platformId);
  }

  // ONLY search by name if keywords don't contain feature words
  const featureWords = ["coop", "multiplayer", "solo", "rpg", "action", "strategy", "adventure", "puzzle", "shooter", "racing", "horror", "indie"];
  const hasFeatureWords = featureWords.some(word => queryLower.includes(word));
  
  if (searchKeywords && !hasFeatureWords) {
    rawgParams.set("search", searchKeywords);
  }

  // CALL RAWG
  let rawgGames: any[] = [];
  try {
    const rawgUrl = `https://api.rawg.io/api/games?${rawgParams.toString()}`;
    console.log("[AI-RECO] RAWG URL:", rawgUrl);
    
    const rawgRes = await fetch(rawgUrl);

    if (rawgRes.ok) {
      const rawgData = await rawgRes.json();
      rawgGames = rawgData.results || [];
      console.log("[AI-RECO] RAWG returned", rawgGames.length, "games");
    }
  } catch (e) {
    console.error("[AI-RECO] RAWG fetch error:", e);
  }

  if (rawgGames.length === 0) {
    return jsonResponse(
      {
        query,
        user_pseudo: userPseudo,
        recommendations: [],
        answer: `Désolé ${userPseudo}, je n'ai pas trouvé de jeux. Essaie avec d'autres mots-clés!`,
      },
      200,
      corsHeaders
    );
  }

  // ENRICH WITH FACTIONY DATA
  let factinyDataMap: Record<string, any> = {};
  try {
    const { data: factinyGames } = await supabase
      .from("games")
      .select("id, name, slug")
      .limit(500);

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
        return {
          ...game,
          factiony_rating: signals?.avg_rating,
          factiony_ratings_count: signals?.ratings_count,
        };
      }
      return game;
    });
  } catch (e) {
    console.error("[AI-RECO] Enrichment error:", e);
  }

  // SEND TO MISTRAL
  const systemPrompt = `Tu es Factiony AI, expert gaming.

Tu dois:
1. Recommander les 3 meilleurs jeux basé sur la demande de ${userPseudo}
2. Si demande "COOP" → recommande UNIQUEMENT jeux coopératifs (It Takes Two, Overcooked, etc)
3. Si demande "MULTIPLAYER" → recommande UNIQUEMENT jeux multiplayer
4. Si plateforme → recommande UNIQUEMENT cette plateforme
5. Explique POURQUOI chaque jeu match parfaitement
6. À LA FIN: Résumé court + question ouverte

IMPORTANT: Sois honnête. Si aucun match parfait → dis-le.
Sois passionné! Utilise emojis gaming. Engage la conversation!`;

  const gamesData = rawgGames.slice(0, 15).map((game: any) => ({
    id: game.id,
    name: game.name,
    slug: game.slug,
    genres: (game.genres || []).map((g: any) => g.name).join(", "),
    platforms: (game.platforms || []).map((p: any) => p.platform.name).join(", "),
    rating: game.rating,
    released: game.released?.substring(0, 4),
    factiony_rating: game.factiony_rating ? `${game.factiony_rating.toFixed(1)}/5` : "—",
  }));

  const userPrompt = `${userPseudo} te demande: "${query}"

Jeux trouvés:
${JSON.stringify(gamesData, null, 2)}

Recommande les 3 meilleurs, explique pourquoi, puis résumé + question!`;

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
        max_tokens: 1500,
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

    // Extract top 3 games mentioned
    const recommendations: any[] = [];
    let found = 0;
    for (const game of rawgGames) {
      if (found >= 3) break;
      if (raw.toLowerCase().includes(game.name.toLowerCase())) {
        recommendations.push({
          slug: game.slug,
          title: game.name,
          why: `${game.genres?.slice(0, 2).join(", ")} (${game.released?.substring(0, 4) || "TBA"}) - ${game.rating}/5`,
          url: `${BASE_URL}/game/${game.slug}-${game.id}`,
        });
        found++;
      }
    }

    // Fallback
    if (recommendations.length === 0) {
      recommendations.push(...rawgGames.slice(0, 3).map((g: any) => ({
        slug: g.slug,
        title: g.name,
        why: `${g.genres?.slice(0, 2).join(", ")} - ${g.rating}/5`,
        url: `${BASE_URL}/game/${g.slug}-${g.id}`,
      })));
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
    return jsonResponse(
      {
        query,
        user_pseudo: userPseudo,
        recommendations: top3.map((g: any) => ({
          slug: g.slug,
          title: g.name,
          why: `${g.genres?.slice(0, 2).join(", ")} - ${g.rating}/5`,
          url: `${BASE_URL}/game/${g.slug}-${g.id}`,
        })),
        personal_message: `Top 3 pour ${userPseudo}:\n${top3.map((g, i) => `${i+1}. ${g.name}`).join("\n")}\n\nL'un te tente?`,
      },
      200,
      corsHeaders
    );
  }
};

export const config = { path: "/api/ai-reco" };