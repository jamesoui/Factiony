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

  // STEP 1: Search games (like SearchView does)
  let candidatesJson: any = null;
  try {
    const searchUrl = new URL(`${SUPABASE_URL}/functions/v1/search-games`);
    searchUrl.searchParams.set("query", query);
    searchUrl.searchParams.set("page_size", "20");

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
  const queryLower = query.toLowerCase();

  // STEP 2: Quick score (without Supabase enrichment for speed)
  const scoredGames = rawGames.map((game: any, idx: number) => {
    let score = idx === 0 ? 100 : 80 - idx * 10; // Rank by search order first

    // Title match
    if (game.name?.toLowerCase().includes(queryLower)) score += 20;
    if (game.slug?.toLowerCase().includes(queryLower)) score += 15;

    // Genres match
    const genreStr = (game.genres ?? []).map((g: any) => g?.name ?? g).join(" ").toLowerCase();
    if (queryLower.includes("rpg") && genreStr.includes("rpg")) score += 20;
    if (queryLower.includes("action") && genreStr.includes("action")) score += 20;
    if (queryLower.includes("indie") && genreStr.includes("indie")) score += 20;

    // Tags match
    const tagsStr = (game.tags ?? []).map((t: any) => t?.name ?? t).join(" ").toLowerCase();
    if (queryLower.includes("coop") && tagsStr.includes("coop")) score += 15;
    if (queryLower.includes("story") && tagsStr.includes("story")) score += 15;

    // Platform match
    const platformStr = (game.platforms ?? []).map((p: any) => p?.platform?.name ?? p).join(" ").toLowerCase();
    if (queryLower.includes("ps5") && platformStr.includes("ps5")) score += 15;
    if (queryLower.includes("pc") && platformStr.includes("pc")) score += 15;

    return { ...game, searchScore: score };
  });

  const topGames = scoredGames
    .sort((a, b) => (b.searchScore ?? 0) - (a.searchScore ?? 0))
    .slice(0, 3);

  console.log("Query:", query);
  console.log("Top 3 games:", topGames.map(g => `${g.name} (${g.searchScore})`));

  // STEP 3: Simple Mistral call (no Supabase enrichment to save time)
  const systemPrompt = `Tu es Factiony AI. Recommande les jeux fournis.
RÈGLES: 1. SEULEMENT les jeux de la liste. 2. Sois bref. 3. Jamais inventer d'infos.
FORMAT: {"recommendations":[{"slug":"...","title":"...","why":"...","id":"..."}],"personal_message":"..."}`;

  const gamesStr = topGames.map(g => ({
    id: g.id,
    slug: g.slug,
    name: g.name,
    genres: (g.genres ?? []).map((x: any) => x?.name ?? x).slice(0, 2).join(", "),
    platforms: (g.platforms ?? []).map((p: any) => p?.platform?.name ?? p).slice(0, 2).join(", "),
  })).map(g => `${g.name} (${g.genres}, ${g.platforms})`).join("; ");

  const userPrompt = `Demande: "${query}"\nJeux: ${gamesStr}`;

  try {
    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.5,
        max_tokens: 300,
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
    return jsonResponse(
      {
        query,
        answer: `Recommandation basique: ${topGames[0]?.name}. ${topGames[0]?.genres?.join(", ")}`,
      },
      200,
      corsHeaders
    );
  }
};

export const config = { path: "/api/ai-reco" };