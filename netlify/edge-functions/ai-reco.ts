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

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  const SEARCH_FN_URL = Deno.env.get("SUPABASE_SEARCH_FN_URL");
  const VECTOR_SEARCH_FN_URL = Deno.env.get("SUPABASE_VECTOR_SEARCH_FN_URL");
  const BASE_URL = Deno.env.get("FACTIONY_BASE_URL") ?? "https://factiony.com";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse({ error: "Missing SUPABASE_URL or SUPABASE_ANON_KEY" }, 500, corsHeaders);
  }
  if (!ANTHROPIC_API_KEY) {
    return jsonResponse({ error: "Missing ANTHROPIC_API_KEY" }, 500, corsHeaders);
  }
  if (!SEARCH_FN_URL && !VECTOR_SEARCH_FN_URL) {
    return jsonResponse(
      { error: "Missing SUPABASE_SEARCH_FN_URL and SUPABASE_VECTOR_SEARCH_FN_URL" },
      500,
      corsHeaders
    );
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

  const pageSizeRaw = Number(body?.page_size ?? 30);
  const page_size = Number.isFinite(pageSizeRaw) ? Math.min(Math.max(pageSizeRaw, 3), 50) : 30;

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

  let communityContext: string[] = [];
  let hasCommunitContext = false;

  if (userContext.userId) {
    try {
      const { data: comments } = await supabase
        .from("review_comments")
        .select("content")
        .ilike("content", `%${query.slice(0, 30)}%`)
        .limit(3);

      const { data: posts } = await supabase
        .from("forum_posts")
        .select("content")
        .ilike("content", `%${query.slice(0, 30)}%`)
        .limit(2);

      if ((comments?.length ?? 0) > 0 || (posts?.length ?? 0) > 0) {
        communityContext = [];
        if (comments && comments.length > 0) {
          communityContext.push("Community insights:");
          comments.slice(0, 2).forEach((c: any) => {
            communityContext.push(`- "${c.content.slice(0, 60)}..."`);
          });
        }
        if (posts && posts.length > 0) {
          communityContext.push("Forum tips:");
          posts.slice(0, 2).forEach((p: any) => {
            communityContext.push(`- "${p.content.slice(0, 60)}..."`);
          });
        }
        hasCommunitContext = true;
      }
    } catch (e) {
      console.error("Community search error:", e);
    }
  }

  let candidatesRes: Response | null = null;

  if (VECTOR_SEARCH_FN_URL) {
    const u = new URL(VECTOR_SEARCH_FN_URL);
    u.searchParams.set("query", query);
    u.searchParams.set("page_size", String(page_size));

    candidatesRes = await fetch(u.toString(), {
      method: "GET",
      headers: { "content-type": "application/json" },
    });

    if (!candidatesRes.ok) {
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
  }

  if (!candidatesRes || !candidatesRes.ok) {
    return jsonResponse(
      { error: "candidates fetch failed" },
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
    .filter((x: Candidate) => x.slug && x.name && !x.name.toUpperCase().includes("VIDEO"));

  if (items.length === 0) {
    return jsonResponse(
      {
        query,
        recommendations: [],
        answer: "Je n'ai pas trouvé de jeux correspondant. Reformule ta demande ?",
      },
      200,
      corsHeaders
    );
  }

  const systemPrompt = `Tu es Factiony AI, l'assistant gaming officiel de Factiony.

RÈGLES STRICTES (NON NÉGOCIABLES):
1. RECOMMANDE UNIQUEMENT les jeux de la liste fournie.
2. JAMAIS mentionner: YouTube, vidéos, BD, mangas, films, comics, séries.
3. Si la demande ne match aucun jeu → réponds "Je n'ai pas de match dans ma base".
4. IGNORE complètement les questions sur films/vidéos/BDs.

RÉPONSES VALIDES:
- Recos: JSON {"recommendations":[{"slug":"...","title":"...","why":"...","id":"..."}],"personal_message":"..."}
- Questions gaming: Texte naturel (boss, builds, strats, tips).

QUALITÉ:
- "why": 1 phrase max, explique POURQUOI ce jeu convient.
- "personal_message": Réponds précisément à la demande (coop/solo, plateforme, difficulté).
- TOUJOURS inclure "id" et "slug" complets pour chaque reco.`;

  const userContextStr = userContext.userId
    ? [
        "PROFIL UTILISATEUR:",
        `Jeux aimés: ${userContext.recent_ratings.slice(0, 5).map((r) => r.game_slug).join(", ")}`,
        `Wishlist: ${userContext.recent_wishlist.slice(0, 5).map((w) => w.game_name).join(", ")}`,
      ].join("\n")
    : "PROFIL: Utilisateur anonyme";

  const communityStr = communityContext.length > 0 ? ["RETOURS COMMUNAUTÉ:", ...communityContext].join("\n") : "";

  const userPrompt = [
    userContextStr,
    communityStr,
    "",
    `DEMANDE UTILISATEUR: "${query}"`,
    "",
    "JEUX DISPONIBLES (CHOISIR UNIQUEMENT PARMI CEUX-CI):",
    JSON.stringify(items.map(i => ({ id: i.id, slug: i.slug, name: i.name, genres: i.genres, platforms: i.platforms }))),
  ]
    .filter(x => x)
    .join("\n");

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!claudeRes.ok) {
    const text = await claudeRes.text();
    console.error("Claude API error:", text);
    return jsonResponse(
      { error: "claude failed", status: claudeRes.status },
      500,
      corsHeaders
    );
  }

  const claudeJson = await claudeRes.json();
  const raw = claudeJson?.content?.[0]?.text ?? "";

  const parsed = safeParseJson(raw);

  let response: any;

  if (parsed.ok && parsed.value?.recommendations) {
    const recs = (parsed.value.recommendations ?? []).slice(0, 3).map((r: any) => {
      const slug = r?.slug ?? null;
      const gameId = r?.id ?? null;
      const url = slug && gameId ? `${BASE_URL}/game/${slug}-${gameId}` : null;

      return {
        slug,
        title: r?.title ?? null,
        why: r?.why ?? null,
        url,
      };
    });

    response = {
      query,
      recommendations: recs,
      personal_message: parsed.value?.personal_message ?? null,
      has_community_context: hasCommunitContext,
    };
  } else {
    response = {
      query,
      answer: raw,
      has_community_context: hasCommunitContext,
    };
  }

  return jsonResponse(response, 200, corsHeaders);
};

export const config = { path: "/api/ai-reco" };