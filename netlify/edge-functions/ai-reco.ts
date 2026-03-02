// netlify/edge-functions/ai-reco.ts

import { createClient } from "@supabase/supabase-js";

type Candidate = {
  id: string | number;
  name: string;
  slug: string;
  released?: string | null;
  genres?: string[];
  platforms?: string[];
  desc?: string;
};

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

  // ---- ENV ----
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
  const MISTRAL_MODEL = Deno.env.get("MISTRAL_MODEL") ?? "mistral-large-latest";
  const SEARCH_FN_URL = Deno.env.get("SUPABASE_SEARCH_FN_URL");
  const VECTOR_SEARCH_FN_URL = Deno.env.get("SUPABASE_VECTOR_SEARCH_FN_URL");
  const BASE_URL = Deno.env.get("FACTIONY_BASE_URL") ?? "https://factiony.com";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" }, 500, corsHeaders);
  }
  if (!MISTRAL_API_KEY) {
    return jsonResponse({ error: "Missing MISTRAL_API_KEY" }, 500, corsHeaders);
  }
  if (!SEARCH_FN_URL && !VECTOR_SEARCH_FN_URL) {
    return jsonResponse(
      { error: "Missing SUPABASE_SEARCH_FN_URL and SUPABASE_VECTOR_SEARCH_FN_URL (need at least one)" },
      500,
      corsHeaders
    );
  }

  // ---- BODY ----
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

  const pageSizeRaw = Number(body?.page_size ?? 30);
  const page_size = Number.isFinite(pageSizeRaw) ? Math.min(Math.max(pageSizeRaw, 3), 50) : 30;

  // ---- STEP 1: Identify user + get context ----
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const token = getBearerToken(request);
  let userContext: UserContext = { userId: null, recent_ratings: [], recent_wishlist: [] };

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

  // ---- STEP 2: Keyword search sur comments + forum (community context) ----
  let communityContext: string[] = [];
  let hasCommunitContext = false;

  if (userContext.userId) {
    try {
      // Chercher des comments pertinents
      const { data: comments } = await supabase
        .from("review_comments")
        .select("content,created_at")
        .ilike("content", `%${query.slice(0, 30)}%`)
        .limit(3);

      // Chercher des forum posts pertinents
      const { data: posts } = await supabase
        .from("forum_posts")
        .select("content,created_at")
        .ilike("content", `%${query.slice(0, 30)}%`)
        .limit(2);

      if ((comments?.length ?? 0) > 0 || (posts?.length ?? 0) > 0) {
        communityContext = [];
        if (comments && comments.length > 0) {
          communityContext.push("Comments communauté:");
          comments.forEach((c: any) => {
            communityContext.push(`- "${c.content.slice(0, 80)}..."`);
          });
        }
        if (posts && posts.length > 0) {
          communityContext.push("Posts forum:");
          posts.forEach((p: any) => {
            communityContext.push(`- "${p.content.slice(0, 80)}..."`);
          });
        }
        hasCommunitContext = true;
      }
    } catch (e) {
      console.error("Community search error:", e);
    }
  }

  // ---- STEP 3: Fetch candidates (vector first, fallback keyword) ----
  let candidatesRes: Response | null = null;
  let candidatesMode: "vector" | "keyword" | "none" = "none";

  if (VECTOR_SEARCH_FN_URL) {
    const u = new URL(VECTOR_SEARCH_FN_URL);
    u.searchParams.set("query", query);
    u.searchParams.set("page_size", String(page_size));

    candidatesRes = await fetch(u.toString(), {
      method: "GET",
      headers: { "content-type": "application/json" },
    });

    if (candidatesRes.ok) {
      candidatesMode = "vector";
    } else {
      candidatesRes = null;
    }
  }

  if (!candidatesRes && SEARCH_FN_URL) {
    const u = new URL(SEARCH_FN_URL);
    u.searchParams.set("query", query);
    u.searchParams.set("page_size", String(page_size));

    candidatesRes = await fetch(u.toString(), {
      method: "GET",
      headers: { "content-type": "application/json" },
    });

    if (candidatesRes.ok) {
      candidatesMode = "keyword";
    }
  }

  if (!candidatesRes || !candidatesRes.ok) {
    return jsonResponse(
      { error: "candidates fetch failed", status: candidatesRes?.status ?? 0 },
      500,
      corsHeaders
    );
  }

  const candidatesJson = await candidatesRes.json();
  const rawList = Array.isArray(candidatesJson?.results)
    ? candidatesJson.results
    : Array.isArray(candidatesJson)
      ? candidatesJson
      : [];

  const items: Candidate[] = rawList
    .slice(0, page_size)
    .map((g: any) => ({
      id: g.id,
      name: (g.name ?? g.title ?? "").toString(),
      slug: (g.slug ?? "").toString(),
      released: g.released ?? null,
      genres: (g.genres ?? []).map((x: any) => (x?.name ?? x).toString()).slice(0, 5),
      platforms: (g.platforms ?? []).map((x: any) => (x?.name ?? x).toString()).slice(0, 6),
      desc: (g.description_raw ?? g.description ?? "").toString().slice(0, 240),
    }))
    .filter((x: Candidate) => x.slug && x.name);

  if (items.length === 0) {
    return jsonResponse(
      {
        query,
        recommendations: [],
        answer: "Je n'ai pas trouvé de jeux correspondant. Reformule ta demande ?",
        follow_up_question: "Tu cherches plutôt quel type de jeu (plateforme, genre, difficulté) ?",
      },
      200,
      corsHeaders
    );
  }

  // ---- STEP 4: LLM (Mistral) avec contexte complet ----
  const systemPrompt = [
    "Tu es l'Assistant IA gaming de Factiony.",
    "Tu peux :",
    "1. Recommander des jeux de la liste fournie",
    "2. Répondre à des questions gaming (boss, builds, strats, tips)",
    "3. Donner des conseils basés sur le profil utilisateur",
    "",
    "Pour les recos : réponds en JSON avec recommendations et why.",
    "Pour les autres questions : réponds en texte naturel.",
    "",
    'JSON format EXACT si c\'est des recos: {"recommendations":[{"slug":"...","title":"...","why":"..."}],"follow_up_question":"..."}',
    "Sinon, réponds directement en texte.",
    "",
    "Sois concis, pratique, utilise le contexte utilisateur.",
  ].join("\n");

  const userContextStr = userContext.userId
    ? [
        "USER CONTEXT:",
        `Jeux aimés: ${userContext.recent_ratings.slice(0, 5).map((r) => `${r.game_slug} (${r.rating}/10)`).join(", ")}`,
        `Wishlist: ${userContext.recent_wishlist.slice(0, 5).map((w) => w.game_name).join(", ")}`,
      ].join("\n")
    : "USER CONTEXT: Utilisateur anonyme";

  const communityStr = communityContext.length > 0
    ? ["COMMUNITY WISDOM:", ...communityContext].join("\n")
    : "";

  const userPrompt = [
    userContextStr,
    communityStr,
    "",
    `Demande utilisateur: "${query}"`,
    "",
    "Jeux candidats (pour les recos uniquement):",
    JSON.stringify(items),
  ]
    .filter((x) => x)
    .join("\n");

  const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!mistralRes.ok) {
    const text = await mistralRes.text();
    return jsonResponse(
      { error: "mistral failed", status: mistralRes.status, details: text.slice(0, 200) },
      500,
      corsHeaders
    );
  }

  const mistralJson = await mistralRes.json();
  const raw = mistralJson?.choices?.[0]?.message?.content ?? "";

  // Essaye de parser comme JSON (recos)
  const parsed = safeParseJson(raw);

  let response: any;

  if (parsed.ok && parsed.value?.recommendations) {
    // C'est une réco
    const recs = (parsed.value.recommendations ?? []).slice(0, 3).map((r: any) => ({
      slug: r?.slug ?? null,
      title: r?.title ?? null,
      why: r?.why ?? null,
      url: r?.slug ? `${BASE_URL}/game/${r.slug}` : null,
    }));

    response = {
      query,
      recommendations: recs,
      follow_up_question: parsed.value?.follow_up_question ?? null,
      has_community_context: hasCommunitContext,
    };
  } else {
    // C'est une réponse texte (gameplay, tips, etc)
    response = {
      query,
      answer: raw || "Je n'ai pas compris la question.",
      has_community_context: hasCommunitContext,
    };
  }

  return jsonResponse(response, 200, corsHeaders);
};

export const config = { path: "/api/ai-reco" };