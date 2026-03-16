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
  if (!query) {
    return jsonResponse({ error: "Missing query" }, 400, corsHeaders);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const queryLower = query.toLowerCase();

  console.log("[AI-RECO] Query:", query);

  // STEP 1: Build smart RAWG query with filters
  const rawgParams = new URLSearchParams();
  rawgParams.set("key", RAWG_API_KEY);
  rawgParams.set("search", query);
  rawgParams.set("page_size", "20");
  rawgParams.set("ordering", "-rating");

  // Add platform filter if mentioned
  if (queryLower.includes("ps5") || queryLower.includes("playstation 5")) {
    rawgParams.set("platforms", "187"); // PS5
  } else if (queryLower.includes("xbox")) {
    rawgParams.set("platforms", "186"); // Xbox Series X/S
  } else if (queryLower.includes("switch")) {
    rawgParams.set("platforms", "7"); // Nintendo Switch
  } else if (queryLower.includes("pc")) {
    rawgParams.set("platforms", "4"); // PC
  }

  // Add tags filter if mentioned
  let tagFilters: string[] = [];
  if (queryLower.includes("coop") || queryLower.includes("coopératif")) {
    tagFilters.push("coop");
  }
  if (queryLower.includes("multiplayer") || queryLower.includes("multijoueur")) {
    tagFilters.push("multiplayer");
  }
  if (queryLower.includes("solo") || queryLower.includes("single")) {
    tagFilters.push("single-player");
  }

  if (tagFilters.length > 0) {
    rawgParams.set("tags", tagFilters.join(","));
  }

  // STEP 2: Call RAWG API
  let rawgGames: any[] = [];
  try {
    console.log("[AI-RECO] Calling RAWG API with params:", rawgParams.toString());
    const rawgUrl = `https://api.rawg.io/api/games?${rawgParams.toString()}`;
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

  // STEP 3: Enrich with FACTIONY data (ratings, comments)
  let factinyDataMap: Record<string, any> = {};
  try {
    // Search in Factiony DB by name (fuzzy match)
    const { data: factinyGames } = await supabase
      .from("games")
      .select("id, name, slug")
      .limit(100);

    if (factinyGames) {
      factinyGames.forEach((fg: any) => {
        factinyDataMap[fg.name.toLowerCase()] = fg;
      });
    }

    // Get all ratings and comments
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

    // Attach Factiony data to RAWG games
    rawgGames = rawgGames.map((game: any) => {
      const factinyKey = (game.name || "").toLowerCase();
      const factinyMatch = factinyDataMap[factinyKey];

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

  // STEP 4: Send to Mistral with full context
  const systemPrompt = `Tu es Factiony AI, l'expert gaming passionné.

Tu reçois des jeux de RAWG (la meilleure base gaming au monde).
Certains jeux ont aussi des données FACTIONY (ratings + avis communauté).

RÈGLES:
1. Si demande "COOP" → recommande UNIQUEMENT jeux avec tag coop
2. Si demande "MULTIPLAYER" → recommande UNIQUEMENT multiplayer
3. Si demande plateforme → recommande UNIQUEMENT cette plateforme
4. Explique POURQUOI chaque jeu match la demande
5. Mentionne le rating FACTIONY si disponible (preuve social)
6. Si pas assez de vrais matches → sois honnête

FORMAT JSON: {
  "recommendations": [
    {
      "slug": "game-slug",
      "title": "Game Title",
      "why": "Explication détaillée pourquoi c'est PARFAIT pour cette demande",
      "id": "game_id"
    }
  ],
  "personal_message": "Message personnalisé"
}`;

  const gamesData = rawgGames.slice(0, 10).map((game: any) => ({
    id: game.id,
    slug: game.slug,
    name: game.name,
    genres: (game.genres || []).map((g: any) => g.name).join(", "),
    platforms: (game.platforms || []).map((p: any) => p.platform.name).join(", "),
    tags: (game.tags || []).map((t: any) => t.name).join(", "),
    released: game.released ? new Date(game.released).getFullYear() : "TBA",
    rating: game.rating,
    description: game.description?.substring(0, 200) || game.name,
    // FACTIONY DATA
    factiony_rating: game.factiony_rating ? `${game.factiony_rating.toFixed(1)}/5 (${game.factiony_ratings_count} utilisateurs Factiony)` : "Pas encore noté sur Factiony",
    factiony_feedback: game.factiony_comments?.length > 0 
      ? game.factiony_comments.map((c: any) => `"${c.content.substring(0, 60)}..."`).join(" | ")
      : "Aucun avis Factiony",
  }));

  const userPrompt = `Demande utilisateur: "${query}"

JEUX DISPONIBLES (RAWG + enrichissement FACTIONY):
${JSON.stringify(gamesData, null, 2)}

Recommande les 3 meilleurs qui correspondent EXACTEMENT à cette demande.
Sois honnête: si aucun match parfait, dis-le.`;

  try {
    console.log("[AI-RECO] Sending to Mistral...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("[AI-RECO] Timeout at 40s");
      controller.abort();
    }, 40000);

    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      signal: controller.signal,
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.7,
        max_tokens: 800,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!mistralRes.ok) {
      const errorText = await mistralRes.text();
      console.error("[AI-RECO] Mistral error:", errorText);
      throw new Error(`Mistral ${mistralRes.status}`);
    }

    const mistralJson = await mistralRes.json();
    const raw = mistralJson?.choices?.[0]?.message?.content ?? "";

    const parsed = safeParseJson(raw);

    if (parsed.ok && parsed.value?.recommendations?.length) {
      console.log("[AI-RECO] Success! Parsed", parsed.value.recommendations.length, "recommendations");

      const recs = parsed.value.recommendations.slice(0, 3).map((r: any) => ({
        slug: r?.slug,
        title: r?.title,
        why: r?.why,
        url: r?.slug && r?.id ? `${BASE_URL}/game/${r.slug}-${r.id}` : null,
      }));

      return jsonResponse(
        {
          query,
          recommendations: recs,
          personal_message: parsed.value?.personal_message,
        },
        200,
        corsHeaders
      );
    } else {
      console.log("[AI-RECO] Parse failed, fallback");

      return jsonResponse(
        {
          query,
          recommendations: rawgGames.slice(0, 3).map((g: any) => ({
            slug: g.slug,
            title: g.name,
            why: `${g.genres?.map((x: any) => x.name).slice(0, 2).join(", ") || "Jeu"} - Note RAWG: ${g.rating}/5. ${g.factiony_rating ? `Note Factiony: ${g.factiony_rating}` : ""}`,
            url: `${BASE_URL}/game/${g.slug}-${g.id}`,
          })),
          personal_message: "Top recommendations basé sur RAWG + Factiony",
        },
        200,
        corsHeaders
      );
    }
  } catch (e) {
    console.error("[AI-RECO] Fatal error:", String(e));

    const top = rawgGames[0];
    return jsonResponse(
      {
        query,
        recommendations: [
          {
            slug: top.slug,
            title: top.name,
            why: `${top.genres?.map((x: any) => x.name).join(", ") || "Jeu"} - Note: ${top.rating}/5`,
            url: `${BASE_URL}/game/${top.slug}-${top.id}`,
          },
        ],
        personal_message: "Erreur temporaire - voici le meilleur match",
      },
      200,
      corsHeaders
    );
  }
};

export const config = { path: "/api/ai-reco" };