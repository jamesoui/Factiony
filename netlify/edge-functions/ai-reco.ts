// netlify/edge-functions/ai-reco.ts - TRUE AGENTIC ALBUS V6 (BRAVE SEARCH REAL WEB)

function jsonResponse(body: any, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

const TAG_IDS: Record<string, number> = {
  "coop": 18, "coopératif": 18, "cooperative": 18, "co-op": 18,
  "online coop": 9, "online co-op": 9, "coop en ligne": 9, "multi en ligne": 9,
  "multiplayer": 7906, "multijoueur": 7906,
  "solo": 3368, "single-player": 3368,
  "rpg": 5, "action": 4, "strategy": 10, "stratégie": 10,
  "adventure": 11, "aventure": 11, "puzzle": 25,
  "shooter": 12, "racing": 1, "courses": 1,
  "sports": 2, "foot": 2, "football": 2, "soccer": 2,
  "horror": 40, "indie": 51, "indépendant": 51,
  "simulation": 14, "fighting": 6, "combat": 6,
};

interface TokenUsage {
  deep_understanding: number;
  web_search: number;
  rawg_search: number;
  user_data: number;
  reasoning: number;
  total: number;
}

interface QueryUnderstanding {
  type: "recommendation" | "gameplay" | "blocked";
  temporal: {
    start_date: string | null;
    end_date: string | null;
    label: string;
    needs_current_data: boolean;
  };
  platforms: string[];
  genres: string[];
  themes: string[];
  comparisons: string[];
  context: string;
  user_mindset: "casual" | "hardcore" | "explorer" | "collector";
  intent: "discovery" | "recommendation" | "advice" | "comparison" | "help";
  price_max: number | null;
}

interface UserProfile {
  likedGames: any[];
  averageRating: number;
  reviews: any[];
  summary: string;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// Normalise les noms de jeux pour le matching (gère "III" vs "3", apostrophes, ponctuation)
function normalizeGameName(name: string): string {
  return name.toLowerCase()
    .replace(/\biii\b/g, "3")
    .replace(/\bii\b/g, "2")
    .replace(/\biv\b/g, "4")
    .replace(/\bvi\b/g, "6")
    .replace(/\bvii\b/g, "7")
    .replace(/[''`]/g, "'")
    .replace(/[^a-z0-9 ']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ==================== STEP 1: DEEP QUERY UNDERSTANDING ====================
async function deepQueryUnderstanding(query: string, mistralKey: string): Promise<{ understanding: QueryUnderstanding; tokens: number }> {
  const today = getTodayDate();

  const prompt = `Tu es un agent IA gaming INTELLIGENT. Analyse cette requête EN PROFONDEUR.

Requête: "${query}"
Aujourd'hui: ${today}

COMPRENDS vraiment ce que l'user demande. RÉPONDS EN JSON UNIQUEMENT:

{
  "type": "recommendation|gameplay|blocked",
  "temporal": {
    "start_date": "YYYY-MM-DD or null",
    "end_date": "YYYY-MM-DD or null",
    "label": "ce jour|ce mois|cette semaine|cet été|l'année dernière|recent|all_time",
    "needs_current_data": true|false
  },
  "platforms": ["ps5", "xbox", "switch", "pc"],
  "genres": ["rpg", "action", "adventure"],
  "themes": ["fantasy", "dark", "relaxing", "challenging"],
  "comparisons": ["like Elden Ring", "similar to The Last of Us"],
  "context": "user wants discoveries|recommendations|help|comparison",
  "user_mindset": "casual|hardcore|explorer|collector",
  "intent": "discovery|recommendation|advice|comparison|help",
  "price_max": 30
}

RÈGLES TEMPORELLES:
- "ce jour" → start=${today}, end=${today}
- "ce mois" → start=2026-03-01, end=${today}
- "cette semaine" → start=2026-03-17, end=${today}
- "cet été" → start=2026-06-21, end=2026-09-21
- "l'année dernière" → start=2025-03-24, end=2026-03-24
- "récent|nouveaux|sorties" → needs_current_data=true
- Pas de temps mentionné → null dates, all_time

RÈGLES TYPE:
- type="gameplay" si: boss, build, strat, combat, skill, technique, comment faire, équipement, guide
- type="recommendation" si: cherche jeux, sorties, like, similaire, recommande
- type="blocked" si: pas gaming du tout

RÈGLES PRIX (IMPORTANT):
- "moins de X euros|max X€|budget X|pas cher|X€ max|under X" → price_max=X (nombre entier)
- "gratuit|free" → price_max=0
- Pas de prix mentionné → price_max=null

GENRES (important pour filtrer RAWG correctement):
- "coop en ligne|online|multi en ligne|multijoueur en ligne|avec mon pote en ligne" → genres=["online coop"]
- "coop|coopératif|co-op|avec un ami|avec mon pote" (SANS mention "en ligne") → genres=["coop"]
- "multijoueur|multi" (SANS mention "en ligne") → genres=["multiplayer"]
- "solo" → genres=["solo"]

NEEDS_CURRENT_DATA:
- type="gameplay" → needs_current_data=true TOUJOURS
- type="recommendation" + temporel → needs_current_data=true
- type="recommendation" + all_time → needs_current_data=false

MIND-SET:
- "facile|relax|chill" → casual
- "hardcore|challenge|difficile|dark souls" → hardcore
- "hidden gems|découvrir|explorer" → explorer
- "collection|tous|complet" → collector

IMPORTANT: Réponds UNIQUEMENT avec le JSON ci-dessus. Aucun champ supplémentaire, aucun commentaire.`;

  try {
    const controller = new AbortController();
    // PERF: réduit de 10s à 7s — mistral-large répond en ~2-3s en pratique
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + mistralKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0,
        max_tokens: 500, // PERF: understanding JSON ne dépasse jamais 500 tokens
        messages: [{ role: "user", content: prompt }],
      }),
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content ?? "{}";
      const tokens = estimateTokens(prompt + text);
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
        return { understanding: parsed, tokens };
      } catch (e) {
        console.error("[ALBUS] Understanding parse error:", text);
      }
    }
  } catch (e) {
    console.error("[ALBUS] Deep understanding error:", e);
  }

  return {
    understanding: {
      type: "recommendation",
      temporal: { start_date: null, end_date: null, label: "all_time", needs_current_data: false },
      platforms: [], genres: [], themes: [], comparisons: [],
      context: "", user_mindset: "explorer", intent: "discovery",
      price_max: null,
    },
    tokens: 0,
  };
}

// ==================== BRAVE SEARCH ====================
async function braveWebSearch(understanding: QueryUnderstanding, query: string, braveKey: string): Promise<{ results: string; tokens: number }> {
  if (!understanding.temporal.needs_current_data) {
    console.log("[ALBUS] Brave Search: OFF (all_time)");
    return { results: "", tokens: 0 };
  }

  let searchQuery = query;
  if (understanding.type === "gameplay") {
    searchQuery = `${query} guide tips 2026`;
  } else if (understanding.temporal.label !== "all_time") {
    searchQuery = `${query} ${understanding.temporal.label} 2026`;
  }

  console.log("[ALBUS] Brave Search: ON →", searchQuery);

  try {
    const controller = new AbortController();
    // PERF: réduit de 5s à 4s
    const timeout = setTimeout(() => controller.abort(), 4000);

    const braveUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}&count=5&search_lang=fr&country=fr&text_decorations=false&extra_snippets=true`;
    const res = await fetch(braveUrl, {
      signal: controller.signal,
      headers: {
        "X-Subscription-Token": braveKey,
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return { results: "", tokens: 0 };

    const data = await res.json();
    const webResults = data?.web?.results ?? [];
    if (webResults.length === 0) return { results: "", tokens: 0 };

    const formatted = webResults.slice(0, 5)
      .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.extra_snippets?.[0] || r.description || ""}`)
      .join("\n\n");

    console.log("[ALBUS] Brave: ✅", webResults.length, "résultats");
    return { results: formatted, tokens: estimateTokens(formatted) };
  } catch (e) {
    console.error("[ALBUS] Brave error:", e);
    return { results: "", tokens: 0 };
  }
}

// ==================== RAWG SEARCH ====================
async function intelligentRawgSearch(understanding: QueryUnderstanding, rawgKey: string, platformIds: string[]): Promise<{ games: any[]; tokens: number }> {
  if (understanding.type === "gameplay") return { games: [], tokens: 0 };

  let parsedTags: string[] = [];
  if (understanding.genres?.length > 0) {
    parsedTags = understanding.genres
      .map((g: string) => TAG_IDS[g])
      .filter((id: any) => id !== undefined)
      .map((id: number) => id.toString());
  }

  console.log("[ALBUS] RAWG platforms:", platformIds.join(",") || "aucun");
  console.log("[ALBUS] RAWG tags:", parsedTags.join(",") || "aucun");

  const rawgParams = new URLSearchParams();
  rawgParams.set("key", rawgKey);
  rawgParams.set("page_size", "50");
  rawgParams.set("ordering", understanding.temporal.start_date ? "-released" : "-rating");
  if (platformIds.length > 0) rawgParams.set("platforms", platformIds.join(","));
  if (parsedTags.length > 0) rawgParams.set("tags", parsedTags.join(","));
  if (understanding.temporal.start_date && understanding.temporal.end_date) {
    rawgParams.set("dates", `${understanding.temporal.start_date},${understanding.temporal.end_date}`);
  }

  let games: any[] = [];
  try {
    const rawgUrl = "https://api.rawg.io/api/games?" + rawgParams.toString();
    console.log("[ALBUS] RAWG URL:", rawgUrl.substring(0, 120) + "...");
    const rawgRes = await fetch(rawgUrl);
    if (rawgRes.ok) {
      games = (await rawgRes.json()).results || [];
      console.log("[ALBUS] RAWG: ✅", games.length, "jeux");
    }
  } catch (e) {
    console.error("[ALBUS] RAWG error:", e);
  }

  if (understanding.temporal.start_date && understanding.temporal.end_date && games.length > 0) {
    const startDate = new Date(understanding.temporal.start_date);
    const endDate = new Date(understanding.temporal.end_date);
    games = games
      .filter(g => { if (!g.released) return false; const d = new Date(g.released); return d >= startDate && d <= endDate; })
      .sort((a, b) => new Date(b.released).getTime() - new Date(a.released).getTime());
  }

  return { games, tokens: estimateTokens(JSON.stringify(games.slice(0, 20))) };
}

// ==================== USER PROFILE ====================
async function fetchUserProfile(supabaseUrl: string, supabaseKey: string, userJwt: string, userId: string, queryType: string): Promise<{ profile: UserProfile; tokens: number }> {
  if (queryType === "gameplay" || !userId) {
    return { profile: { likedGames: [], averageRating: 0, reviews: [], summary: "N/A" }, tokens: 0 };
  }

  try {
    const headers = { "apikey": supabaseKey, "Authorization": `Bearer ${userJwt}` };

    const [followsRes, ratingsRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/game_follows?user_id=eq.${userId}&select=game_id,game_name&limit=50&order=created_at.desc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/game_ratings?user_id=eq.${userId}&select=game_id,game_slug,rating,rating_gameplay,rating_story,platform&limit=50&order=created_at.desc`, { headers }),
    ]);

    const follows = followsRes.ok ? await followsRes.json() : [];
    const ratings = ratingsRes.ok ? await ratingsRes.json() : [];

    console.log("[ALBUS] Profile → follows:", follows.length, "| ratings:", ratings.length);

    let averageRating = 0;
    if (ratings.length > 0) {
      const vals = ratings.map((r: any) => Number(r.rating)).filter((r: number) => !isNaN(r) && r > 0);
      averageRating = vals.length > 0
        ? Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 10) / 10
        : 0;
    }

    const followedNames = follows.slice(0, 8).map((f: any) => f.game_name).filter(Boolean);
    const ratedGames = ratings.slice(0, 5).map((r: any) =>
      `${r.game_slug || r.game_id} (${r.rating}/5${r.platform ? ` sur ${r.platform}` : ""})`
    );

    const platformCounts = ratings.map((r: any) => r.platform).filter(Boolean)
      .reduce((acc: Record<string, number>, p: string) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
    const sortedPlatforms = Object.entries(platformCounts).sort((a: any, b: any) => b[1] - a[1]).map(([p]) => p);
    const topPlatform = sortedPlatforms[0] ?? "non renseignée";
    const allPlatforms = sortedPlatforms.join(", ") || "non renseignée";
    const topRated = ratings.filter((r: any) => Number(r.rating) >= 4);

    const profile: UserProfile = {
      likedGames: follows,
      averageRating,
      reviews: ratings,
      summary: `
USER PROFIL FACTIONY:
- ${ratings.length} jeux notés, moyenne ${averageRating}/5
- ${topRated.length} coups de cœur (4+/5): ${ratedGames.join(" | ") || "aucun"}
- Plateformes: ${allPlatforms} (principale: ${topPlatform})
- Wishlist (${follows.length} jeux, PAS des références de goût): ${followedNames.join(", ") || "aucun"}
- Profil: ${averageRating >= 4 ? "Joueur exigeant" : averageRating >= 3 ? "Joueur standard" : "Explorateur curieux"}`,
    };

    return { profile, tokens: estimateTokens(JSON.stringify(profile)) };
  } catch (e) {
    console.error("[ALBUS] User profile error:", e);
    return { profile: { likedGames: [], averageRating: 0, reviews: [], summary: "Erreur profil" }, tokens: 0 };
  }
}

// ==================== RATE LIMIT CHECK ====================
async function checkRateLimit(supabaseUrl: string, supabaseKey: string, userJwt: string, userId: string): Promise<{ allowed: boolean; tier: string; message?: string }> {
  if (!userId) return { allowed: true, tier: "free" };

  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // PERF: tier + usage en parallèle (au lieu de séquentiel)
    const [subRes, usageRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}&status=eq.active&select=plan&limit=1`,
        { headers: { "apikey": supabaseKey, "Authorization": `Bearer ${userJwt}` } }),
      fetch(`${supabaseUrl}/rest/v1/token_usage?user_id=eq.${userId}&created_at=gte.${monthStart.toISOString()}&select=tokens_used&limit=1`,
        { headers: { "apikey": supabaseKey, "Authorization": `Bearer ${userJwt}` } }),
    ]);

    const subs = subRes.ok ? await subRes.json() : [];
    const tier = subs?.[0]?.plan === "premium" ? "premium" : "free";
    const tokenLimit = tier === "premium" ? 100000 : 15000;

    const usage = usageRes.ok ? await usageRes.json() : [];
    const tokensUsed = usage?.[0]?.tokens_used ?? 0;

    console.log(`[ALBUS] Tokens: ${tokensUsed}/${tokenLimit} (${tier})`);

    if (tokensUsed >= tokenLimit) {
      return {
        allowed: false, tier,
        message: tier === "premium"
          ? `Tu as atteint ta limite mensuelle premium (${tokenLimit.toLocaleString()} tokens). Réinitialisation le 1er du mois.`
          : `Tu as atteint ta limite mensuelle gratuite (${tokenLimit.toLocaleString()} tokens). Passe premium pour 10x plus !`,
      };
    }

    return { allowed: true, tier };
  } catch (e) {
    console.error("[ALBUS] Rate limit check error:", e);
    return { allowed: true, tier: "free" }; // fail open
  }
}

// ==================== MAIN HANDLER ====================
export default async (request: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://factiony.com",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
  const RAWG_API_KEY = Deno.env.get("RAWG_API_KEY") ?? "";
  const BRAVE_API_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY");
  const BASE_URL = Deno.env.get("FACTIONY_BASE_URL") ?? "https://factiony.com";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !MISTRAL_API_KEY) {
    return jsonResponse({ error: "Missing env vars" }, 500, corsHeaders);
  }
  if (!BRAVE_API_KEY) console.warn("[ALBUS] BRAVE_SEARCH_API_KEY manquant");
  if (!RAWG_API_KEY) console.warn("[ALBUS] RAWG_API_KEY manquant");

  let body: any;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders); }

  const query = (body?.query ?? "").toString().trim();
  const userPseudo = (body?.user_pseudo ?? "").toString().trim();
  const userId = (body?.user_id ?? "").toString().trim();
  const userLanguage = (body?.language ?? "fr").toString().trim();

  if (!query) return jsonResponse({ error: "Missing query" }, 400, corsHeaders);

  const tokenUsage: TokenUsage = { deep_understanding: 0, web_search: 0, rawg_search: 0, user_data: 0, reasoning: 0, total: 0 };

  console.log("[ALBUS] 🤖 V6 - Query:", query);

  const authHeader = request.headers.get("Authorization") ?? "";
  const userJwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : SUPABASE_ANON_KEY;

  // ==================== PHASE 1: UNDERSTANDING + RATE LIMIT EN PARALLÈLE ====================
  // PERF: au lieu de faire understanding PUIS rate limit, on les fait en même temps
  console.log("[ALBUS] Phase 1: Understanding + Rate limit (parallèle)...");

  const [{ understanding, tokens: understandingTokens }, rateLimitResult] = await Promise.all([
    deepQueryUnderstanding(query, MISTRAL_API_KEY),
    checkRateLimit(SUPABASE_URL, SUPABASE_ANON_KEY, userJwt, userId),
  ]);

  tokenUsage.deep_understanding = understandingTokens;
  console.log("[ALBUS] Understanding:", JSON.stringify(understanding));

  if (!rateLimitResult.allowed) {
    return jsonResponse({ error: "token_limit_exceeded", message: rateLimitResult.message }, 200, corsHeaders);
  }

  if (understanding.type === "blocked") {
    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "blocked",
      answer: "Je suis Albus, assistant gaming IA. Je peux t'aider sur les jeux vidéo!",
    }, 200, corsHeaders);
  }

  // ==================== PHASE 2: BRAVE + RAWG + PROFILE EN PARALLÈLE ====================
  // PERF: RAWG utilise directement les plateformes de la requête si disponibles,
  // sinon on les récupère depuis le profil DANS LA MÊME PHASE (plus de 2ème appel RAWG)
  console.log("[ALBUS] Phase 2: Brave + RAWG + Profile (parallèle)...");

  const platformMap: Record<string, string> = {
    "ps5": "187", "playstation 5": "187", "playstation": "187",
    "xbox": "186", "xbox series": "186",
    "switch": "7", "nintendo": "7",
    "pc": "4", "playstation 4": "18", "ps4": "18",
    "playstation 3": "16", "ps3": "16",
  };

  // Plateformes explicites depuis la requête
  const queryPlatformIds = (understanding.platforms ?? [])
    .map((p: string) => platformMap[p.toLowerCase()])
    .filter(Boolean) as string[];

  const [webData, rawgDataInitial, userProfileData] = await Promise.all([
    BRAVE_API_KEY
      ? braveWebSearch(understanding, query, BRAVE_API_KEY)
      : Promise.resolve({ results: "", tokens: 0 }),
    intelligentRawgSearch(understanding, RAWG_API_KEY, queryPlatformIds),
    fetchUserProfile(SUPABASE_URL, SUPABASE_ANON_KEY, userJwt, userId, understanding.type),
  ]);

  // Si pas de plateforme dans la requête → utilise celles du profil, refait RAWG UNE SEULE FOIS
  let rawgData = rawgDataInitial;
  if (queryPlatformIds.length === 0 && rawgDataInitial.games.length === 0) {
    const profilePlatformIds = Object.entries(
      userProfileData.profile.reviews
        .map((r: any) => r.platform).filter(Boolean)
        .reduce((acc: Record<string, number>, p: string) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {})
    )
      .sort((a: any, b: any) => b[1] - a[1])
      .map(([p]) => platformMap[p.toLowerCase()])
      .filter(Boolean) as string[];

    if (profilePlatformIds.length > 0) {
      rawgData = await intelligentRawgSearch(understanding, RAWG_API_KEY, profilePlatformIds);
    }
  } else if (queryPlatformIds.length === 0 && rawgDataInitial.games.length > 0) {
    // On a des jeux sans filtre plateforme — on garde, pas besoin de re-fetch
    rawgData = rawgDataInitial;
  }

  tokenUsage.web_search = webData.tokens;
  tokenUsage.rawg_search = rawgData.tokens;
  tokenUsage.user_data = userProfileData.tokens;

  console.log("[ALBUS] Phase 2 done → Brave:", webData.results ? "✅" : "❌", "| RAWG:", rawgData.games.length, "| Profile:", userProfileData.profile.likedGames.length, "follows | Prix max:", understanding.price_max);

  // ==================== PHASE 3: REASONING ====================
  console.log("[ALBUS] Phase 3: Reasoning...");

  // ---- GAMEPLAY ----
  if (understanding.type === "gameplay") {
    const systemPrompt = `Tu es Albus, assistant gaming IA expert de Factiony.
Réponds aux questions gaming (boss, build, strat, équipement, guide).
Conseils directs, pratiques, précis. PAS D'ASTÉRISQUES.
REPONDS EN ${userLanguage === "en" ? "ENGLISH" : "FRANÇAIS"}.`;

    const userPrompt = `Question: ${query}

${webData.results ? `DONNÉES WEB RÉCENTES:\n${webData.results}` : "Réponds avec tes connaissances."}

Sois précis et actionnable.`;

    try {
      const controller = new AbortController();
      // PERF: réduit à 15s (small model répond en ~3-4s)
      const timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: "Bearer " + MISTRAL_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "mistral-small-latest",
          temperature: 0.7,
          max_tokens: 2000,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        }),
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const answer = (json?.choices?.[0]?.message?.content ?? "").replace(/\*\*?/g, "");
        tokenUsage.reasoning = estimateTokens(systemPrompt + userPrompt + answer);
        tokenUsage.total = Object.values(tokenUsage).reduce((a, b) => a + b, 0);
        console.log("[ALBUS] ✅ Gameplay | Tokens:", tokenUsage.total);
        return jsonResponse({ query, user_pseudo: userPseudo, mode: "gameplay", answer, tokens_used: tokenUsage.total, has_web_data: !!webData.results }, 200, corsHeaders);
      }
    } catch (e) {
      console.error("[ALBUS] Gameplay reasoning error:", e);
      return jsonResponse({ query, user_pseudo: userPseudo, mode: "gameplay", answer: "Désolé, j'ai eu un problème. Réessaie dans un instant." }, 200, corsHeaders);
    }
  }

  // ---- RECOMMENDATION ----
  if (rawgData.games.length === 0 && !webData.results) {
    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation", recommendations: [],
      personal_message: understanding.temporal.start_date
        ? `Aucun jeu trouvé pour ${understanding.temporal.label}. Essaie une période plus large!`
        : "Aucun jeu trouvé. Essaie d'autres critères!",
    }, 200, corsHeaders);
  }

  const filteredGames = understanding.temporal.start_date
    ? rawgData.games.slice(0, 15)
    : rawgData.games.filter((g: any) => g.rating >= 3.5).slice(0, 15);

  const gamesData = filteredGames.map((g: any) => ({
    name: g.name, slug: g.slug, id: g.id,
    genres: (g.genres || []).map((x: any) => x.name).join(", "),
    rating: g.rating || "N/A",
    released: g.released,
  }));

  const priceConstraintBlock = understanding.price_max !== null
    ? `💰 CONTRAINTE PRIX ABSOLUE: Max ${understanding.price_max}€
- EXCLUS (trop chers): Baldur's Gate 3 (~60€), God of War (~70€), Elden Ring (~40€), GTA VI (~70€)
- OK sous ${understanding.price_max}€: It Takes Two (~20€), Rocket League (gratuit), Fall Guys (gratuit), jeux indés, back-catalog
- Si tu n'es pas sûr du prix d'un jeu, indique-le entre parenthèses`
    : "";

  const onlineCoopNote = (understanding.genres.includes("online coop") || understanding.genres.includes("coop en ligne") || understanding.genres.includes("multi en ligne"))
    ? `⚠️ ONLINE OBLIGATOIRE: jeux avec multijoueur EN LIGNE uniquement (pas local/splitscreen).`
    : "";

  const reasoningPrompt = `Tu es Albus. RECOMMANDE intelligemment:

🧠 COMPRIS: ${understanding.intent} | ${understanding.user_mindset} | genres: ${understanding.genres.join(", ") || "aucun"}
${priceConstraintBlock}
${onlineCoopNote}

🌐 WEB: ${webData.results || "aucune donnée"}

🎮 JEUX RAWG DISPONIBLES:
${JSON.stringify(gamesData.slice(0, 12))}

👤 PROFIL:
${userProfileData.profile.summary}

📋 TASK: Recommande EXACTEMENT 3 jeux de la liste RAWG. Explique pourquoi pour CET USER. Respecte TOUTES les contraintes. Pose 1 question courte après.

Format (répète exactement):
🎮 [Nom exact tel que dans la liste RAWG]
Pourquoi pour lui
[Genres] - [Rating]/5

PAS D'ASTÉRISQUES. EXACTEMENT 3 JEUX.
RÉPONDS EN ${userLanguage === "en" ? "ENGLISH" : "FRANÇAIS"}.`;

  try {
    const controller = new AbortController();
    // PERF: réduit à 15s (large model avec prompt court répond en ~4-6s)
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + MISTRAL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.8,
        max_tokens: 1500, // PERF: réduit de 2000 à 1500 — 3 recs + question = ~800 tokens max
        messages: [{ role: "user", content: reasoningPrompt }],
      }),
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const raw = json?.choices?.[0]?.message?.content ?? "";
      tokenUsage.reasoning = estimateTokens(reasoningPrompt + raw);
      const cleanRaw = raw.replace(/\*\*?/g, "");

      const recommendations: any[] = [];
      const lines = cleanRaw.split("\n");
      let currentGame: any = null;
      let currentDescription = "";
      let found = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const trimmedNorm = normalizeGameName(trimmed);
        const gameMatch = gamesData.find((g: any) => {
          const gNorm = normalizeGameName(g.name);
          return trimmedNorm.includes(gNorm) && trimmed.length < 120;
        });

        if (gameMatch && found < 3) {
          if (currentGame) {
            recommendations.push({
              slug: currentGame.slug,
              title: currentGame.name,
              summary: currentDescription.trim() || currentGame.genres,
              why: currentGame.genres + " - " + (currentGame.rating === "N/A" ? "Nouvelle sortie" : currentGame.rating + "/5"),
              url: BASE_URL + "/game/" + currentGame.slug + "-" + currentGame.id,
            });
            found++;
          }
          currentGame = gameMatch;
          currentDescription = "";
        } else if (currentGame && trimmed.length > 5 && found < 3) {
          const isMetaLine = /^\[.*\]/.test(trimmed) || /^\d+(\.\d+)?\/5/.test(trimmed);
          if (!isMetaLine) currentDescription += (currentDescription ? " " : "") + trimmed;
        }
      }

      if (currentGame && found < 3) {
        recommendations.push({
          slug: currentGame.slug,
          title: currentGame.name,
          summary: currentDescription.trim() || currentGame.genres,
          why: currentGame.genres + " - " + (currentGame.rating === "N/A" ? "Nouvelle sortie" : currentGame.rating + "/5"),
          url: BASE_URL + "/game/" + currentGame.slug + "-" + currentGame.id,
        });
      }

      const recs = recommendations.slice(0, 3);

      let questionText = "Lequel te tente?";
      const questionLines = cleanRaw.split("\n")
        .map((s: string) => s.trim())
        .filter((s: string) => s.includes("?") && s.length > 10 && s.length < 200 && !/\d+\/5/.test(s));
      if (questionLines.length > 0) questionText = questionLines[questionLines.length - 1];

      tokenUsage.total = Object.values(tokenUsage).reduce((a, b) => a + b, 0);
      console.log("[ALBUS] ✅ Recs:", recs.length, "| Tokens:", tokenUsage.total);

      return jsonResponse({
        query, user_pseudo: userPseudo, mode: "recommendation",
        recommendations: recs,
        personal_message: questionText,
        tokens_used: tokenUsage.total,
        understanding_data: understanding,
      }, 200, corsHeaders);
    }
  } catch (e) {
    console.error("[ALBUS] Recommendation reasoning error:", e);
    const top2 = gamesData.slice(0, 2);
    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation",
      recommendations: top2.map((g: any) => ({
        slug: g.slug, title: g.name, summary: g.genres,
        why: g.genres + " - " + (g.rating === "N/A" ? "Nouvelle sortie" : g.rating + "/5"),
        url: BASE_URL + "/game/" + g.slug + "-" + g.id,
      })),
      personal_message: "Lequel te tente?",
    }, 200, corsHeaders);
  }
};

export const config = { path: "/api/ai-reco" };