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

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
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

  // STEP 1: Call search-games
  let candidatesJson: any = null;
  try {
    const searchUrl = new URL(`${SUPABASE_URL}/functions/v1/search-games`);
    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("page_size", "25");

    const searchRes = await fetch(searchUrl.toString(), {
      headers: {
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (searchRes.ok) {
      candidatesJson = await searchRes.json();
    }
  } catch (e) {
    console.error("Search error:", e);
  }

  if (!candidatesJson?.results?.length) {
    return jsonResponse(
      {
        query,
        recommendations: [],
        answer: "Aucun jeu trouvé. Reformule ta demande.",
      },
      200,
      corsHeaders
    );
  }

  const rawGames = candidatesJson.results;

  // STEP 2: Fetch enrichment data in parallel
  let gameSignalsMap: Record<string, any> = {};
  let gameCommentsMap: Record<string, any[]> = {};

  try {
    const [signalsRes, commentsRes] = await Promise.all([
      supabase.from("game_signals").select("game_id, avg_rating, ratings_count"),
      supabase.from("game_comments").select("game_id, content, rating"),
    ]);

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
  } catch (e) {
    console.error("Enrichment error:", e);
  }

  // STEP 3: Intelligent scoring
  const scoredGames = rawGames.map((game: any, idx: number) => {
    let score = 100 - idx * 5;

    const gameId = game.id?.toString() ?? "";

    // Title/slug match
    if (game.name?.toLowerCase().includes(queryLower)) score += 30;
    if (game.slug?.toLowerCase().includes(queryLower)) score += 20;

    // Genres match
    const genreStr = (game.genres ?? []).map((g: any) => g?.name ?? g).join(" ").toLowerCase();
    const genreKeywords = ["rpg", "action", "strateg", "indie", "adventure", "puzzle", "shooter", "horror", "battle"];
    genreKeywords.forEach(kw => {
      if (queryLower.includes(kw) && genreStr.includes(kw)) score += 25;
    });

    // Tags match
    const tagsStr = (game.tags ?? []).map((t: any) => t?.name ?? t).join(" ").toLowerCase();
    ["story", "coop", "cooperative", "multiplayer", "narrative", "open-world", "dark"].forEach(tag => {
      if (queryLower.includes(tag) && tagsStr.includes(tag)) score += 20;
    });

    // Platform match
    const platformStr = (game.platforms ?? []).map((p: any) => p?.platform?.name ?? p).join(" ").toLowerCase();
    ["ps5", "ps4", "xbox", "pc", "switch"].forEach(plat => {
      if (queryLower.includes(plat) && platformStr.includes(plat)) score += 20;
    });

    // Year match
    if (game.released) {
      const gameYear = new Date(game.released).getFullYear();
      const yearMatch = query.match(/\b(202[0-9]|201[0-9])\b/);
      if (yearMatch && parseInt(yearMatch[0]) === gameYear) score += 25;
      if (queryLower.includes("recent") && gameYear >= 2024) score += 10;
    }

    // RAWG comments match
    const gameComments = gameCommentsMap[gameId] ?? [];
    gameComments.forEach(gc => {
      if ((gc.content ?? "").toLowerCase().includes(queryLower)) score += 15;
      if (gc.rating >= 8) score += 5;
    });

    // Factiony rating bonus
    const signals = gameSignalsMap[gameId];
    if (signals?.avg_rating >= 4.0) score += 20;
    if (signals?.ratings_count >= 5) score += 10;

    return { ...game, searchScore: score, signals, comments: gameComments };
  });

  const topGames = scoredGames
    .sort((a, b) => (b.searchScore ?? 0) - (a.searchScore ?? 0))
    .slice(0, 5);

  console.log("Query:", query);
  console.log("Top games:", topGames.slice(0, 3).map((g: any) => `${g.name} (${g.searchScore})`));

  if (topGames.length === 0) {
    return jsonResponse(
      {
        query,
        recommendations: [],
        answer: "Aucun jeu trouvé.",
      },
      200,
      corsHeaders
    );
  }

  // STEP 4: Send to Mistral with context
  const systemPrompt = `Tu es Factiony AI, l'assistant gaming de Factiony.

RÈGLES STRICTES:
1. Recommande UNIQUEMENT les jeux fournis.
2. Utilise les infos Factiony (ratings, avis communauté).
3. Sois précis et utile.
4. Jamais inventer d'infos.
5. JAMAIS mentionner: YouTube, vidéos, films, BD, séries.

RÉPONSE FORMAT: {"recommendations":[{"slug":"...","title":"...","why":"...","id":"..."}],"personal_message":"..."}

QUALITÉ: "why" = 1 phrase max expliquant POURQUOI ce jeu convient.`;

  const gamesData = topGames.slice(0, 3).map((g: any) => {
    const commentsSample = (g.comments ?? []).slice(0, 2).map((c: any) => `"${c.content.substring(0, 60)}..."`).join("; ");

    return {
      id: g.id,
      slug: g.slug,
      name: g.name,
      genres: (g.genres ?? []).map((x: any) => x?.name ?? x).slice(0, 3).join(", "),
      platforms: (g.platforms ?? []).map((p: any) => p?.platform?.name ?? p).slice(0, 3).join(", "),
      tags: (g.tags ?? []).map((t: any) => t?.name ?? t).slice(0, 4).join(", "),
      released: g.released ? new Date(g.released).toLocaleDateString('fr-FR') : "TBA",
      factiony_rating: g.signals?.avg_rating ? `${g.signals.avg_rating.toFixed(1)}/5 (${g.signals.ratings_count} votes)` : "Pas noté",
      community: g.comments.length > 0 ? commentsSample : "Aucun avis",
    };
  });

  const userPrompt = `Demande: "${query}"

Jeux à recommander:
${JSON.stringify(gamesData, null, 2)}`;

  try {
    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.6,
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!mistralRes.ok) {
      throw new Error(`Mistral ${mistralRes.status}`);
    }

    const mistralJson = await mistralRes.json();
    const raw = mistralJson?.choices?.[0]?.message?.content ?? "";
    const parsed = safeParseJson(raw);

    if (parsed.ok && parsed.value?.recommendations) {
      const recs = (parsed.value.recommendations ?? []).slice(0, 3).map((r: any) => ({
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
      return jsonResponse(
        {
          query,
          answer: raw,
        },
        200,
        corsHeaders
      );
    }
  } catch (e) {
    console.error("Mistral error:", e);
    const top = topGames[0];
    return jsonResponse(
      {
        query,
        recommendations: [
          {
            slug: top.slug,
            title: top.name,
            why: `${(top.genres ?? []).map((g: any) => g?.name ?? g).slice(0, 2).join(", ")} sorti en ${top.released ? new Date(top.released).getFullYear() : "TBA"}`,
            url: `${BASE_URL}/game/${top.slug}-${top.id}`,
          },
        ],
        personal_message: "Voici ma meilleure recommandation pour ta demande.",
      },
      200,
      corsHeaders
    );
  }
};

export const config = { path: "/api/ai-reco" };