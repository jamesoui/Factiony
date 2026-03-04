// netlify/edge-functions/ai-reco.ts

import { createClient } from "@supabase/supabase-js";

type UserContext = {
  userId: string | null;
  recent_ratings: Array<{ game_id: string; game_slug: string; rating: number }>;
  recent_wishlist: Array<{ game_id: string; game_name: string }>;
};

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
    return jsonResponse({ error: "Missing environment variables" }, 500, corsHeaders);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const query = (body?.query ?? "").toString().trim();
  if (!query) {
    return jsonResponse({ error: "Missing query" }, 400, corsHeaders);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const token = getBearerToken(request);
  let userContext: UserContext = { userId: null, recent_ratings: [], recent_wishlist: [] };

  // Get user context
  if (token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user?.id) {
        const userId = data.user.id;
        userContext.userId = userId;

        const { data: ratings } = await supabase
          .from("game_ratings")
          .select("game_id,game_slug,rating")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);

        const { data: wishlist } = await supabase
          .from("game_follows")
          .select("game_id,game_name")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);

        userContext.recent_ratings = ratings ?? [];
        userContext.recent_wishlist = wishlist ?? [];
      }
    } catch (e) {
      console.error("Auth error:", e);
    }
  }

  // STEP 1: Call search-games (same as SearchView)
  let candidatesJson: any = null;
  try {
    const searchUrl = new URL(`${SUPABASE_URL}/functions/v1/search-games`);
    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("page_size", "30");

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

  if (!candidatesJson || !candidatesJson.results || candidatesJson.results.length === 0) {
    return jsonResponse(
      {
        query,
        recommendations: [],
        answer: "Je n'ai pas trouvé de jeux correspondant à ta demande. Reformule ou précise.",
      },
      200,
      corsHeaders
    );
  }

  const rawGames = candidatesJson.results;

  // STEP 2: Fetch enrichment data from Factiony
  let gameSignalsMap: Record<string, any> = {};
  let gameCommentsMap: Record<string, any[]> = {};
  let forumThreadsMap: Record<string, any[]> = {};

  try {
    const { data: gameSignals } = await supabase
      .from("game_signals")
      .select("game_id, avg_rating, ratings_count, follows_count");
    if (gameSignals) {
      gameSignals.forEach((gs: any) => {
        gameSignalsMap[gs.game_id] = gs;
      });
    }

    const { data: gameComments } = await supabase
      .from("game_comments")
      .select("game_id, content, rating")
      .limit(100);
    if (gameComments) {
      gameComments.forEach((gc: any) => {
        if (!gameCommentsMap[gc.game_id]) gameCommentsMap[gc.game_id] = [];
        gameCommentsMap[gc.game_id].push(gc);
      });
    }

    const { data: forumThreads } = await supabase
      .from("forum_threads")
      .select("game_id, title, reply_count")
      .limit(100);
    if (forumThreads) {
      forumThreads.forEach((ft: any) => {
        if (!forumThreadsMap[ft.game_id]) forumThreadsMap[ft.game_id] = [];
        forumThreadsMap[ft.game_id].push(ft);
      });
    }
  } catch (e) {
    console.error("Error fetching enrichment data:", e);
  }

  // STEP 3: Score each game intelligently
  const queryLower = query.toLowerCase();

  const scoredGames = rawGames.map((game: any) => {
    let score = 0;
    const gameId = game.id?.toString() ?? "";

    // 1. Title match (40 points)
    if (game.name?.toLowerCase().includes(queryLower)) score += 40;
    if (game.slug?.toLowerCase().includes(queryLower)) score += 20;

    // 2. Genres match (35 points)
    const genreStr = (game.genres ?? []).map((g: any) => g?.name ?? g).join(" ").toLowerCase();
    const genreKeywords = ["rpg", "action", "strateg", "indie", "adventure", "puzzle", "shooter", "horror", "soulslike"];
    genreKeywords.forEach(kw => {
      if (queryLower.includes(kw) && genreStr.includes(kw)) score += 35;
    });

    // 3. Tags match (30 points)
    const tagsStr = (game.tags ?? []).map((t: any) => t?.name ?? t).join(" ").toLowerCase();
    ["story", "coop", "cooperative", "multiplayer", "narrative", "open-world"].forEach(tag => {
      if (queryLower.includes(tag) && tagsStr.includes(tag)) score += 30;
    });

    // 4. Description match (15 points)
    const descStr = (game.description_raw ?? "").toLowerCase();
    if (descStr.includes("coop") && queryLower.includes("coop")) score += 15;
    if (descStr.includes("story") && queryLower.includes("story")) score += 15;

    // 5. Platform match (25 points)
    const platformStr = (game.platforms ?? []).map((p: any) => p?.platform?.name ?? p).join(" ").toLowerCase();
    ["ps5", "xbox", "pc", "switch"].forEach(plat => {
      if (queryLower.includes(plat) && platformStr.includes(plat)) score += 25;
    });

    // 6. Year match (20 points)
    if (game.released) {
      const gameYear = new Date(game.released).getFullYear();
      const yearMatch = query.match(/\b(202[0-9]|201[0-9])\b/);
      if (yearMatch && parseInt(yearMatch[0]) === gameYear) score += 20;
      if (queryLower.includes("recent") && gameYear >= 2024) score += 10;
    }

    // 7. RAWG Comments match (15 points)
    const gameComments = gameCommentsMap[gameId] ?? [];
    gameComments.forEach((gc: any) => {
      if ((gc.content ?? "").toLowerCase().includes(queryLower)) score += 15;
      if (gc.rating >= 8) score += 5;
    });

    // 8. Factiony rating bonus (20 points)
    const signals = gameSignalsMap[gameId];
    if (signals && signals.avg_rating >= 4.0) score += 20;
    if (signals && signals.ratings_count > 10) score += 10;

    // 9. Forum activity (10 points)
    const forumThreads = forumThreadsMap[gameId] ?? [];
    if (forumThreads.length > 0) score += 10;
    forumThreads.forEach((ft: any) => {
      if ((ft.title ?? "").toLowerCase().includes(queryLower)) score += 5;
    });

    // 10. Tone hints (15 points)
    if (queryLower.includes("dark") || queryLower.includes("sombre")) {
      if (genreStr.includes("horror") || tagsStr.includes("dark")) score += 15;
    }
    if (queryLower.includes("casual")) {
      if (genreStr.includes("indie") || genreStr.includes("puzzle")) score += 15;
    }

    return { ...game, searchScore: score };
  });

  // STEP 4: Sort and filter by score
  const topGames = scoredGames
    .sort((a, b) => (b.searchScore ?? 0) - (a.searchScore ?? 0))
    .filter(g => (g.searchScore ?? 0) > 0)
    .slice(0, 5);

  console.log("Query:", query);
  console.log("Top games found:", topGames.length);
  console.log("Top 3:", topGames.slice(0, 3).map(g => `${g.name} (${g.searchScore})`));

  if (topGames.length === 0) {
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

  // STEP 5: Send to Mistral with enriched data
  const systemPrompt = `Tu es Factiony AI, l'assistant gaming officiel.

RÈGLES:
1. Recommande UNIQUEMENT les jeux de la liste fournie.
2. Utilise les infos Factiony (ratings, avis, tags).
3. Si pas de match, dis pourquoi honnêtement.
4. JAMAIS inventer d'infos.
5. JAMAIS mentionner YouTube, vidéos, films, séries.

FORMAT RÉPONSE:
- Recos: JSON {"recommendations":[{"slug":"...","title":"...","why":"...","id":"..."}],"personal_message":"..."}
- Questions: Texte naturel.

QUALITÉ:
- "why": 1 phrase max, précis.
- "personal_message": Réponds à la demande.`;

  const userContextStr = userContext.userId
    ? `Profil: Aimés: ${userContext.recent_ratings.slice(0, 3).map(r => r.game_slug).join(", ")}. Wishlist: ${userContext.recent_wishlist.slice(0, 3).map(w => w.game_name).join(", ")}.`
    : "Profil: Anonyme.";

  const gamesData = topGames.slice(0, 3).map(g => {
    const signals = gameSignalsMap[g.id?.toString() ?? ""];
    const comments = gameCommentsMap[g.id?.toString() ?? ""] ?? [];
    const threads = forumThreadsMap[g.id?.toString() ?? ""] ?? [];

    return {
      id: g.id,
      slug: g.slug,
      name: g.name,
      released: g.released ? new Date(g.released).toLocaleDateString('fr-FR') : "TBA",
      genres: (g.genres ?? []).map((x: any) => x?.name ?? x).slice(0, 3).join(", "),
      platforms: (g.platforms ?? []).map((p: any) => p?.platform?.name ?? p).slice(0, 3).join(", "),
      tags: (g.tags ?? []).map((t: any) => t?.name ?? t).slice(0, 5).join(", "),
      metacritic: g.metacritic ?? "N/A",
      factiony_rating: signals?.avg_rating ? signals.avg_rating.toFixed(1) : "N/A",
      factiony_ratings_count: signals?.ratings_count ?? 0,
      community_mentions: comments.length + threads.length,
      comments_sample: comments.slice(0, 2).map((c: any) => `"${c.content.substring(0, 50)}..."`).join("; "),
    };
  });

  const userPrompt = [
    userContextStr,
    `DEMANDE: "${query}"`,
    "JEUX À RECOMMANDER:",
    JSON.stringify(gamesData, null, 2),
  ].join("\n");

  const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-large-latest",
      temperature: 0.6,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!mistralRes.ok) {
    const text = await mistralRes.text();
    console.error("Mistral error:", text);
    return jsonResponse(
      { error: "mistral failed" },
      500,
      corsHeaders
    );
  }

  const mistralJson = await mistralRes.json();
  const raw = mistralJson?.choices?.[0]?.message?.content ?? "";
  const parsed = safeParseJson(raw);

  let response: any;

  if (parsed.ok && parsed.value?.recommendations) {
    const recs = (parsed.value.recommendations ?? []).slice(0, 3).map((r: any) => ({
      slug: r?.slug ?? null,
      title: r?.title ?? null,
      why: r?.why ?? null,
      url: r?.slug && r?.id ? `${BASE_URL}/game/${r.slug}-${r.id}` : null,
    }));

    response = {
      query,
      recommendations: recs,
      personal_message: parsed.value?.personal_message ?? null,
    };
  } else {
    response = {
      query,
      answer: raw,
    };
  }

  return jsonResponse(response, 200, corsHeaders);
};

export const config = { path: "/api/ai-reco" };