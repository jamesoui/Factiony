// netlify/edge-functions/ai-reco.ts
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
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  }

  // ---- ENV (Netlify Edge Runtime: Deno.env.get) ----
  const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
  const MISTRAL_MODEL = Deno.env.get("MISTRAL_MODEL") ?? "mistral-large-latest";
  const SEARCH_FN_URL = Deno.env.get("SUPABASE_SEARCH_FN_URL");
  const BASE_URL = Deno.env.get("FACTIONY_BASE_URL") ?? "https://factiony.com";

  if (!MISTRAL_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing MISTRAL_API_KEY" }), {
      status: 500,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  }
  if (!SEARCH_FN_URL) {
    return new Response(JSON.stringify({ error: "Missing SUPABASE_SEARCH_FN_URL" }), {
      status: 500,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  }

  // ---- Parse body ----
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  }

  const query = (body?.query ?? "").toString().trim();
  const pageSize = Number(body?.page_size ?? 30);

  if (!query) {
    return new Response(JSON.stringify({ error: "Missing query" }), {
      status: 400,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  }

  // 1) Fetch candidates from your Supabase function
  const searchUrl = new URL(SEARCH_FN_URL);
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("page_size", String(Number.isFinite(pageSize) ? pageSize : 30));

  const candidatesRes = await fetch(searchUrl.toString(), {
    method: "GET",
    headers: { "content-type": "application/json" },
  });

  if (!candidatesRes.ok) {
    const text = await candidatesRes.text();
    return new Response(
      JSON.stringify({
        error: "search-games failed",
        status: candidatesRes.status,
        details: text.slice(0, 500),
      }),
      { status: 500, headers: { "content-type": "application/json", ...corsHeaders } }
    );
  }

  const candidatesJson = await candidatesRes.json();

  // Normalise a compact list for the LLM
  const rawList = (candidatesJson?.results ?? candidatesJson ?? []) as any[];
  const items = rawList.slice(0, 50).map((g: any) => ({
    id: g.id,
    name: g.name ?? g.title,
    slug: g.slug,
    released: g.released,
    genres: (g.genres ?? []).map((x: any) => x.name ?? x).slice(0, 5),
    platforms: (g.platforms ?? []).map((x: any) => x.name ?? x).slice(0, 6),
    desc: (g.description_raw ?? g.description ?? "").toString().slice(0, 240),
  }));

  // Pour validation ensuite (slug doit venir des candidats)
  const allowedSlugs = new Set(items.map((x) => x.slug).filter(Boolean));

  // 2) Ask Mistral to pick the best 3 *from the candidate list*
  const system = [
    "Tu es un assistant de recommandation de jeux vidéo pour Factiony.",
    "Tu dois choisir des jeux UNIQUEMENT dans la liste de candidats fournie.",
    "Tu réponds en JSON STRICT, sans texte autour, sans markdown, sans ```.",
    'Format EXACT: {"recommendations":[{"slug":"...","title":"...","why":"..."}],"follow_up_question":"..."}',
    "recommendations: exactement 3 items.",
    "why: 1-2 phrases max.",
    "slug: doit exister dans les candidats.",
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
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      temperature: 0.6,
      // Le plus important pour éviter les ```json ... ```
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!mistralRes.ok) {
    const text = await mistralRes.text();
    return new Response(
      JSON.stringify({
        error: "mistral failed",
        status: mistralRes.status,
        details: text.slice(0, 500),
      }),
      { status: 500, headers: { "content-type": "application/json", ...corsHeaders } }
    );
  }

  const mistralJson = await mistralRes.json();
  const raw = mistralJson?.choices?.[0]?.message?.content ?? "";

  // 3) Parse JSON safely (avec fallback "strip fences" au cas où)
  const cleaned = raw
    .toString()
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");

  let parsed: any = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return new Response(JSON.stringify({ error: "LLM did not return valid JSON", raw }), {
      status: 500,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  }

  // 4) Normalise + validate output
  const recsRaw = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
  const recs = recsRaw.slice(0, 3).map((r: any) => ({
    slug: (r?.slug ?? "").toString(),
    title: (r?.title ?? "").toString(),
    why: (r?.why ?? "").toString(),
  }));

  // Validation: 3 recos + slugs exist
  if (recs.length !== 3 || recs.some((r) => !r.slug || !allowedSlugs.has(r.slug))) {
    return new Response(
      JSON.stringify({
        error: "LLM returned invalid recommendations (slug not in candidates or wrong count)",
        raw: parsed,
        allowed_slugs_sample: Array.from(allowedSlugs).slice(0, 10),
      }),
      { status: 500, headers: { "content-type": "application/json", ...corsHeaders } }
    );
  }

  // 5) Add Factiony links
  const recsWithLinks = recs.map((r) => ({
    ...r,
    url: `${BASE_URL}/game/${r.slug}`,
  }));

  return new Response(
    JSON.stringify({
      query,
      recommendations: recsWithLinks,
      follow_up_question: parsed?.follow_up_question ?? null,
      model: MISTRAL_MODEL,
      candidates_count: items.length,
    }),
    { status: 200, headers: { "content-type": "application/json", ...corsHeaders } }
  );
};

// Netlify Edge Functions mapping is done in netlify.toml,
// but keeping config doesn't hurt if you already used it.
export const config = { path: "/api/ai-reco" };
