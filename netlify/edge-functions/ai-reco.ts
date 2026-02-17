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
  if (!query) {
    return new Response(JSON.stringify({ error: "Missing query" }), {
      status: 400,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  }

  // 1) Fetch candidates from your Supabase function
  const searchUrl = new URL(SEARCH_FN_URL);
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("page_size", String(body?.page_size ?? 30));

  const candidatesRes = await fetch(searchUrl.toString(), {
    method: "GET",
    headers: { "content-type": "application/json" },
  });

  if (!candidatesRes.ok) {
    const text = await candidatesRes.text();
    return new Response(
      JSON.stringify({ error: "search-games failed", status: candidatesRes.status, details: text.slice(0, 500) }),
      { status: 500, headers: { "content-type": "application/json", ...corsHeaders } }
    );
  }

  const candidatesJson = await candidatesRes.json();

  // Normalise a compact list for the LLM
  const items = (candidatesJson?.results ?? candidatesJson ?? []).slice(0, 30).map((g: any) => ({
    id: g.id,
    name: g.name ?? g.title,
    slug: g.slug,
    released: g.released,
    genres: (g.genres ?? []).map((x: any) => x.name ?? x).slice(0, 5),
    platforms: (g.platforms ?? []).map((x: any) => x.name ?? x).slice(0, 6),
    desc: (g.description_raw ?? g.description ?? "").toString().slice(0, 240),
  }));

  // 2) Ask Mistral to pick the best 3 *from the candidate list*
  const system = [
    "Tu es un assistant de recommandation de jeux vidéo pour Factiony.",
    "Tu dois choisir des jeux UNIQUEMENT dans la liste de candidats fournie.",
    "Réponds en JSON STRICT, sans texte autour.",
    "Format: { recommendations: [{ slug, title, why }], follow_up_question }",
    "recommendations: exactement 3 items. why: 1-2 phrases max. slug doit exister dans les candidats.",
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
      // on garde simple; si tu veux du vrai JSON enforcement, on l’ajoute après
    }),
  });

  if (!mistralRes.ok) {
    const text = await mistralRes.text();
    return new Response(JSON.stringify({ error: "mistral failed", status: mistralRes.status, details: text.slice(0, 500) }), {
      status: 500,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  }

  const mistralJson = await mistralRes.json();
  const raw = mistralJson?.choices?.[0]?.message?.content ?? "";

  // 3) Parse JSON safely
  let parsed: any = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // fallback: return raw for debugging
    return new Response(JSON.stringify({ error: "LLM did not return valid JSON", raw }), {
      status: 500,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  }

  // 4) Add Factiony links
  const recs = (parsed?.recommendations ?? []).slice(0, 3).map((r: any) => ({
    ...r,
    url: r?.slug ? `${BASE_URL}/game/${r.slug}` : null,
  }));

  return new Response(JSON.stringify({
    query,
    recommendations: recs,
    follow_up_question: parsed?.follow_up_question ?? null,
    model: MISTRAL_MODEL,
  }), {
    status: 200,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
};

export const config = { path: "/api/ai-reco" };
