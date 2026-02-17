import type { Handler } from "@netlify/functions";

type Candidate = {
  id?: string | number;
  slug?: string;
  name?: string;
  title?: string;
  description?: string;
  description_raw?: string;
  genres?: any;
  tags?: any;
  platforms?: any;
};

type Recommendation = {
  game_id: string;
  slug: string;
  title: string;
  why: string;
};

function detectLang(text: string): "fr" | "en" {
  // simple heuristic MVP
  const frHints = [" je ", " tu ", " avec ", "pour", "moins", "jeu", "couple", "guerre"];
  const t = ` ${text.toLowerCase()} `;
  const score = frHints.reduce((acc, w) => acc + (t.includes(w) ? 1 : 0), 0);
  return score >= 2 ? "fr" : "en";
}

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function compactCandidates(raw: Candidate[], max = 35) {
  return raw.slice(0, max).map((g) => ({
    game_id: String(g.id ?? ""),
    slug: String(g.slug ?? ""),
    title: String(g.name ?? g.title ?? ""),
    summary: String((g.description_raw ?? g.description ?? "")).replace(/\s+/g, " ").slice(0, 240),
    genres: g.genres ?? null,
    tags: g.tags ?? null,
    platforms: g.platforms ?? null,
  })).filter((g) => g.game_id && g.title);
}

async function fetchCandidates(query: string, pageSize = 30) {
  const base = process.env.SUPABASE_SEARCH_FN_URL!;
  const url = new URL(base);
  url.searchParams.set("query", query);
  url.searchParams.set("page_size", String(pageSize));

  const res = await fetch(url.toString(), {
    headers: {
      // Supabase Edge Function often expects an Authorization header (anon JWT)
      Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`search-games failed: HTTP ${res.status} ${txt}`);
  }

  const data = await res.json();
  // We accept both shapes:
  // { results: [...] } or [...]
  const arr = Array.isArray(data) ? data : (data?.results ?? data?.data ?? []);
  if (!Array.isArray(arr)) return [];
  return arr as Candidate[];
}

async function callMistralPick3(lang: "fr" | "en", userQuery: string, candidates: any[]) {
  const system =
    lang === "fr"
      ? `Tu es l'assistant de recommandation de jeux de Factiony.
Règles STRICTES:
- Tu dois choisir EXACTEMENT 3 jeux DANS la liste "candidates".
- N'invente jamais un jeu hors liste.
- Pour chaque jeu: why = 1 à 2 phrases MAX, concrètes (coop, ambiance, difficulté, durée, etc.).
- Retourne UNIQUEMENT un JSON valide, sans texte autour.

Format EXACT:
{
  "assistant_message": "string (max 2 phrases)",
  "recommendations": [
    {"game_id":"string","slug":"string","title":"string","why":"string"},
    {"game_id":"string","slug":"string","title":"string","why":"string"},
    {"game_id":"string","slug":"string","title":"string","why":"string"}
  ]
}`
      : `You are Factiony's game recommendation assistant.
STRICT rules:
- Pick EXACTLY 3 games ONLY from the provided "candidates" list.
- Never invent a game outside the list.
- For each game: why = max 1–2 sentences, concrete criteria (co-op, vibe, difficulty, length, etc.).
- Output ONLY valid JSON (no extra text).

Exact format:
{
  "assistant_message": "string (max 2 sentences)",
  "recommendations": [
    {"game_id":"string","slug":"string","title":"string","why":"string"},
    {"game_id":"string","slug":"string","title":"string","why":"string"},
    {"game_id":"string","slug":"string","title":"string","why":"string"}
  ]
}`;

  const body = {
    model: process.env.MISTRAL_MODEL || "mistral-large-latest",
    temperature: 0.4,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: JSON.stringify({
          user_query: userQuery,
          candidates,
        }),
      },
    ],
  };

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`mistral failed: HTTP ${res.status} ${txt}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("mistral: missing content");

  // Try parse JSON
  const parsed = safeJsonParse<{ assistant_message: string; recommendations: Recommendation[] }>(content);
  if (!parsed || !Array.isArray(parsed.recommendations) || parsed.recommendations.length !== 3) {
    throw new Error(`mistral: invalid json output: ${content.slice(0, 200)}`);
  }

  // Basic sanitize
  parsed.recommendations = parsed.recommendations.map((r) => ({
    game_id: String(r.game_id ?? ""),
    slug: String(r.slug ?? ""),
    title: String(r.title ?? ""),
    why: String(r.why ?? "").slice(0, 280),
  }));

  return parsed;
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const body = safeJsonParse<{ query?: string; lang?: string }>(event.body || "{}") || {};
    const query = String(body.query || "").trim();
    if (!query) return { statusCode: 400, body: JSON.stringify({ error: "missing_query" }) };

    const lang = (body.lang === "en" || body.lang === "fr") ? (body.lang as "fr" | "en") : detectLang(query);

    // 1) get candidates from your existing Supabase Edge Function search
    const rawCandidates = await fetchCandidates(query, 40);
    const candidates = compactCandidates(rawCandidates, 35);

    if (candidates.length < 3) {
      // fallback: broaden query a bit (remove rare words)
      const broad = query.split(/\s+/).slice(0, 2).join(" ");
      const raw2 = await fetchCandidates(broad || query, 40);
      const candidates2 = compactCandidates(raw2, 35);

      if (candidates2.length < 3) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            assistant_message:
              lang === "fr"
                ? "Je n’ai pas trouvé assez de jeux dans le catalogue pour cette demande. Tu peux préciser le genre (coop local/online, plateforme, difficulté) ?"
                : "I couldn't find enough games for that request. Can you уточify genre (local/online co-op, platform, difficulty)?",
            recommendations: [],
          }),
        };
      }

      const picked = await callMistralPick3(lang, query, candidates2);
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(picked) };
    }

    // 2) Mistral picks 3 among candidates
    const picked = await callMistralPick3(lang, query, candidates);
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(picked) };
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "server_error", details: String(e?.message || e) }),
    };
  }
};
