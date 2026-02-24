// netlify/edge-functions/ai-reco.ts

type Candidate = {
  id: string | number;
  name: string;
  slug: string;
  released?: string | null;
  genres?: string[];
  platforms?: string[];
  desc?: string;
};

function jsonResponse(body: any, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

function stripJsonCodeFences(raw: string): string {
  const s = (raw ?? "").trim();
  // remove ```json ... ``` or ``` ... ```
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
  // CORS basique (si tu appelles depuis le front)
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
  const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
  const MISTRAL_MODEL = Deno.env.get("MISTRAL_MODEL") ?? "mistral-large-latest";

  // existing keyword search supabase function
  const SEARCH_FN_URL = Deno.env.get("SUPABASE_SEARCH_FN_URL");

  // NEW: vector search supabase function (optional)
  const VECTOR_SEARCH_FN_URL = Deno.env.get("SUPABASE_VECTOR_SEARCH_FN_URL");

  const BASE_URL = Deno.env.get("FACTIONY_BASE_URL") ?? "https://factiony.com";

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

  // ---- 1) Fetch candidates (vector first, fallback keyword) ----
  let candidatesRes: Response | null = null;
  let candidatesMode: "vector" | "keyword" | "none" = "none";
  let candidatesUrlUsed: string | null = null;

  // try vector
  if (VECTOR_SEARCH_FN_URL) {
    const u = new URL(VECTOR_SEARCH_FN_URL);
    u.searchParams.set("query", query);
    u.searchParams.set("page_size", String(page_size));
    candidatesUrlUsed = u.toString();

    candidatesRes = await fetch(candidatesUrlUsed, {
      method: "GET",
      headers: { "content-type": "application/json" },
    });

    if (candidatesRes.ok) {
      candidatesMode = "vector";
    } else {
      candidatesRes = null;
    }
  }

  // fallback keyword
  if (!candidatesRes && SEARCH_FN_URL) {
    const u = new URL(SEARCH_FN_URL);
    u.searchParams.set("query", query);
    u.searchParams.set("page_size", String(page_size));
    candidatesUrlUsed = u.toString();

    candidatesRes = await fetch(candidatesUrlUsed, {
      method: "GET",
      headers: { "content-type": "application/json" },
    });

    if (candidatesRes.ok) {
      candidatesMode = "keyword";
    }
  }

  if (!candidatesRes || !candidatesRes.ok) {
    const status = candidatesRes?.status ?? 0;
    const details = candidatesRes ? (await candidatesRes.text()).slice(0, 800) : "no response";
    return jsonResponse(
      { error: "candidates fetch failed", status, mode: candidatesMode, url: candidatesUrlUsed, details },
      500,
      corsHeaders
    );
  }

  const candidatesJson = await candidatesRes.json();

  // Support both shapes:
  // - { results: [...] }
  // - [...] directly
  const rawList = Array.isArray(candidatesJson?.results)
    ? candidatesJson.results
    : Array.isArray(candidatesJson)
      ? candidatesJson
      : [];

  // normalize to compact candidates list for LLM
  const items: Candidate[] = rawList.slice(0, page_size).map((g: any) => ({
    id: g.id,
    name: (g.name ?? g.title ?? "").toString(),
    slug: (g.slug ?? "").toString(),
    released: g.released ?? null,
    genres: (g.genres ?? []).map((x: any) => (x?.name ?? x).toString()).slice(0, 5),
    platforms: (g.platforms ?? []).map((x: any) => (x?.name ?? x).toString()).slice(0, 6),
    desc: (g.description_raw ?? g.description ?? "").toString().slice(0, 240),
  })).filter((x: Candidate) => x.slug && x.name);

  if (items.length === 0) {
    return jsonResponse(
      {
        query,
        recommendations: [],
        follow_up_question: "Tu cherches plutôt un jeu sur quelle plateforme (PC, PS5, Switch, Xbox, mobile) ?",
        model: MISTRAL_MODEL,
        candidates_count: 0,
        candidates_mode: candidatesMode,
      },
      200,
      corsHeaders
    );
  }

  // ---- 2) LLM picks best 3 from candidates list ----
  const system = [
    "Tu es un assistant de recommandation de jeux vidéo pour Factiony.",
    "Tu dois choisir des jeux UNIQUEMENT dans la liste de candidats fournie.",
    "Réponds en JSON STRICT, sans texte autour.",
    'Format EXACT: {"recommendations":[{"slug":"...","title":"...","why":"..."}],"follow_up_question":"..."}',
    "recommendations: exactement 3 items.",
    "why: 1-2 phrases max.",
    "slug doit exister dans les candidats.",
    "Si la demande parle de jeu à 2 (couple, copine, coop), privilégie des jeux jouables à deux (coop local/online) si possible.",
  ].join("\n");

  const user = [
    `Demande utilisateur: "${query}"`,
    "",
    "Candidats (tu dois choisir dedans):",
    JSON.stringify(items),
  ].join("\n");

  const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      temperature: 0.6,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!mistralRes.ok) {
    const text = await mistralRes.text();
    return jsonResponse(
      { error: "mistral failed", status: mistralRes.status, details: text.slice(0, 800) },
      500,
      corsHeaders
    );
  }

  const mistralJson = await mistralRes.json();
  const raw = mistralJson?.choices?.[0]?.message?.content ?? "";

  const parsed = safeParseJson(raw);
  if (!parsed.ok) {
    return jsonResponse(
      { error: "LLM did not return valid JSON", raw, cleaned: parsed.cleaned, parse_error: parsed.error },
      500,
      corsHeaders
    );
  }

  // ---- 3) Post-process & add links ----
  const recs = (parsed.value?.recommendations ?? []).slice(0, 3).map((r: any) => ({
    slug: r?.slug ?? null,
    title: r?.title ?? null,
    why: r?.why ?? null,
    url: r?.slug ? `${BASE_URL}/game/${r.slug}` : null,
  }));

  return jsonResponse(
    {
      query,
      recommendations: recs,
      follow_up_question: parsed.value?.follow_up_question ?? null,
      model: MISTRAL_MODEL,
      candidates_count: items.length,
      candidates_mode: candidatesMode,
    },
    200,
    corsHeaders
  );
};

export const config = { path: "/api/ai-reco" };