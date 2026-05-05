// netlify/edge-functions/ai-reco.ts - TRUE AGENTIC ALBUS V7

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

const PLATFORM_MAP: Record<string, string> = {
  "ps5": "187", "playstation 5": "187", "playstation": "187",
  "xbox": "186", "xbox series": "186", "switch": "7", "nintendo": "7",
  "pc": "4", "playstation 4": "18", "ps4": "18", "playstation 3": "16", "ps3": "16",
};

interface TokenUsage {
  deep_understanding: number;
  web_search: number;
  rawg_search: number;
  user_data: number;
  reasoning: number;
  total: number;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface QueryUnderstanding {
  type: "recommendation" | "gameplay" | "profile" | "comparison" | "blocked";
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
  intent: "discovery" | "recommendation" | "advice" | "comparison" | "help" | "profile_stats";
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

function normalizeGameName(name: string): string {
  return name.toLowerCase()
    .replace(/\biii\b/g, "3").replace(/\bii\b/g, "2").replace(/\biv\b/g, "4")
    .replace(/\bvi\b/g, "6").replace(/\bvii\b/g, "7")
    .replace(/[''`]/g, "'").replace(/[^a-z0-9 ']/g, " ").replace(/\s+/g, " ").trim();
}

// Formate l'historique de conversation pour l'injecter dans les prompts Mistral
function formatHistory(history: ConversationMessage[]): string {
  if (!history || history.length === 0) return "";
  return "\n\nCONVERSATION PRÉCÉDENTE (contexte important):\n" +
    history.slice(-6).map(m => `${m.role === "user" ? "User" : "Albus"}: ${m.content}`).join("\n") +
    "\n";
}

// ==================== STEP 1: DEEP QUERY UNDERSTANDING ====================
async function deepQueryUnderstanding(
  query: string,
  mistralKey: string,
  history: ConversationMessage[]
): Promise<{ understanding: QueryUnderstanding; tokens: number }> {
  const today = getTodayDate();
  const historyBlock = history.length > 0
    ? `\nContexte conversation précédente:\n${history.slice(-4).map(m => `${m.role === "user" ? "User" : "Albus"}: ${m.content.substring(0, 200)}`).join("\n")}\n`
    : "";

  const prompt = `Tu es un agent IA gaming INTELLIGENT. Analyse cette requête EN PROFONDEUR.
${historyBlock}
Requête actuelle: "${query}"
Aujourd'hui: ${today}

RÉPONDS EN JSON UNIQUEMENT:

{
  "type": "recommendation|gameplay|profile|comparison|blocked",
  "temporal": {
    "start_date": "YYYY-MM-DD or null",
    "end_date": "YYYY-MM-DD or null",
    "label": "ce jour|ce mois|cette semaine|all_time",
    "needs_current_data": true|false
  },
  "platforms": ["ps5", "xbox", "switch", "pc"],
  "genres": ["rpg", "action"],
  "themes": ["fantasy", "dark", "relaxing"],
  "comparisons": ["Elden Ring", "Dark Souls"],
  "context": "description courte",
  "user_mindset": "casual|hardcore|explorer|collector",
  "intent": "discovery|recommendation|advice|comparison|help|profile_stats",
  "price_max": null
}

RÈGLES TYPE:
- type="gameplay" → boss, build, strat, combat, guide, comment faire
- type="recommendation" → cherche jeux, recommande, similaire
- type="comparison" → "X vs Y", "lequel entre X et Y", "X ou Y", comparer deux jeux nommés
- type="profile" → top jeux, mes notes, mon classement, mes stats, mes meilleurs jeux, j'ai joué à quoi
- type="blocked" → pas gaming

RÈGLES PRIX:
- "moins de X euros|max X€|budget X|X€ max|pas cher" → price_max=X
- "gratuit|free" → price_max=0
- Rien → price_max=null

GENRES:
- "coop en ligne|online|multi en ligne|multijoueur en ligne|avec mon pote en ligne" → ["online coop"]
- "coop|avec un ami|avec mon pote" (sans "en ligne") → ["coop"]
- "multijoueur|multi" (sans "en ligne") → ["multiplayer"]
- "solo" → ["solo"]

NEEDS_CURRENT_DATA:
- gameplay → true TOUJOURS
- recommendation + temporel → true
- recommendation + all_time → false
- profile/comparison → false

IMPORTANT: JSON uniquement. Tiens compte du contexte de conversation pour comprendre les références ("celui-là", "le deuxième", "plutôt X").`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST", signal: controller.signal,
      headers: { Authorization: "Bearer " + mistralKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest", temperature: 0, max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    clearTimeout(timeout);
    if (res.ok) {
      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
        return { understanding: parsed, tokens: estimateTokens(prompt + text) };
      } catch (e) { console.error("[ALBUS] Understanding parse error:", text); }
    }
  } catch (e) { console.error("[ALBUS] Understanding error:", e); }

  return {
    understanding: {
      type: "recommendation",
      temporal: { start_date: null, end_date: null, label: "all_time", needs_current_data: false },
      platforms: [], genres: [], themes: [], comparisons: [],
      context: "", user_mindset: "explorer", intent: "discovery", price_max: null,
    },
    tokens: 0,
  };
}

// ==================== BRAVE SEARCH ====================
async function braveSearch(query: string, braveKey: string, timeoutMs = 4000): Promise<{ results: string; tokens: number }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&search_lang=fr&country=fr&text_decorations=false&extra_snippets=true`,
      { signal: controller.signal, headers: { "X-Subscription-Token": braveKey, "Accept": "application/json", "Accept-Encoding": "gzip" } }
    );
    clearTimeout(timeout);
    if (!res.ok) return { results: "", tokens: 0 };
    const data = await res.json();
    const webResults = data?.web?.results ?? [];
    if (webResults.length === 0) return { results: "", tokens: 0 };
    const formatted = webResults.slice(0, 5)
      .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.extra_snippets?.[0] || r.description || ""}`)
      .join("\n\n");
    return { results: formatted, tokens: estimateTokens(formatted) };
  } catch (e) {
    return { results: "", tokens: 0 };
  }
}

// Lance les recherches Brave en parallèle selon le contexte
async function runBraveSearches(
  understanding: QueryUnderstanding,
  query: string,
  braveKey: string
): Promise<{ mainResults: string; priceResults: string; tokens: number }> {
  const searches: Promise<{ results: string; tokens: number }>[] = [];
  const searchTypes: string[] = [];

  // Search principal (gameplay ou temporel)
  if (understanding.temporal.needs_current_data) {
    let searchQuery = query;
    if (understanding.type === "gameplay") searchQuery = `${query} guide tips 2026`;
    else if (understanding.temporal.label !== "all_time") searchQuery = `${query} ${understanding.temporal.label} 2026`;
    searches.push(braveSearch(searchQuery, braveKey));
    searchTypes.push("main");
    console.log("[ALBUS] Brave main: ON →", searchQuery);
  } else {
    searches.push(Promise.resolve({ results: "", tokens: 0 }));
    searchTypes.push("main_off");
    console.log("[ALBUS] Brave main: OFF (all_time)");
  }

  // Search prix si budget détecté — cherche directement les vrais prix PS Store / Steam
  if (understanding.price_max !== null && understanding.type === "recommendation") {
    const platform = understanding.platforms?.[0] ?? "PS5";
    const genre = understanding.genres?.join(" ") || "";
    const priceQuery = `jeux ${platform} ${genre} moins de ${understanding.price_max} euros prix PS Store 2025 2026`;
    searches.push(braveSearch(priceQuery, braveKey));
    searchTypes.push("price");
    console.log("[ALBUS] Brave prix: ON →", priceQuery);
  } else {
    searches.push(Promise.resolve({ results: "", tokens: 0 }));
  }

  // Search comparaison si type comparison
  if (understanding.type === "comparison" && understanding.comparisons.length >= 1) {
    const compQuery = understanding.comparisons.length >= 2
      ? `${understanding.comparisons[0]} vs ${understanding.comparisons[1]} lequel choisir 2025 2026`
      : `${understanding.comparisons[0]} avis test comparatif 2025 2026`;
    searches.push(braveSearch(compQuery, braveKey));
    searchTypes.push("comparison");
    console.log("[ALBUS] Brave comparison: ON →", compQuery);
  } else {
    searches.push(Promise.resolve({ results: "", tokens: 0 }));
  }

  const [mainData, priceData, compData] = await Promise.all(searches);

  // Fusionne les résultats
  const mainResults = [mainData.results, compData.results].filter(Boolean).join("\n\n---\n\n");
  const priceResults = priceData.results;
  const tokens = mainData.tokens + priceData.tokens + compData.tokens;

  if (priceResults) console.log("[ALBUS] Brave prix: ✅ données prix récupérées");
  if (mainResults) console.log("[ALBUS] Brave main: ✅", mainResults.length, "chars");

  return { mainResults, priceResults, tokens };
}

// ==================== RAWG SEARCH ====================
async function intelligentRawgSearch(understanding: QueryUnderstanding, rawgKey: string, platformIds: string[]): Promise<{ games: any[]; tokens: number }> {
  if (understanding.type === "gameplay" || understanding.type === "profile" || understanding.type === "comparison") {
    return { games: [], tokens: 0 };
  }

  let parsedTags: string[] = [];
  if (understanding.genres?.length > 0) {
    parsedTags = understanding.genres
      .map((g: string) => TAG_IDS[g]).filter((id: any) => id !== undefined).map((id: number) => id.toString());
  }

  const rawgParams = new URLSearchParams();
  rawgParams.set("key", rawgKey);
  rawgParams.set("page_size", "50");
  rawgParams.set("ordering", understanding.temporal.start_date ? "-released" : "-rating");
  if (platformIds.length > 0) rawgParams.set("platforms", platformIds.join(","));
  if (parsedTags.length > 0) rawgParams.set("tags", parsedTags.join(","));
  if (understanding.temporal.start_date && understanding.temporal.end_date) {
    rawgParams.set("dates", `${understanding.temporal.start_date},${understanding.temporal.end_date}`);
  }

  console.log("[ALBUS] RAWG platforms:", platformIds.join(",") || "aucun", "| tags:", parsedTags.join(",") || "aucun");

  let games: any[] = [];
  try {
    const rawgUrl = "https://api.rawg.io/api/games?" + rawgParams.toString();
    console.log("[ALBUS] RAWG URL:", rawgUrl.substring(0, 120) + "...");
    const rawgRes = await fetch(rawgUrl);
    if (rawgRes.ok) {
      games = (await rawgRes.json()).results || [];
      console.log("[ALBUS] RAWG: ✅", games.length, "jeux");
    }
  } catch (e) { console.error("[ALBUS] RAWG error:", e); }

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
        ? Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 10) / 10 : 0;
    }

    const ratedGames = ratings.slice(0, 8).map((r: any) =>
      `${r.game_slug || r.game_id} (${r.rating}/5${r.platform ? ` sur ${r.platform}` : ""})`
    );
    const followedNames = follows.slice(0, 8).map((f: any) => f.game_name).filter(Boolean);
    const platformCounts = ratings.map((r: any) => r.platform).filter(Boolean)
      .reduce((acc: Record<string, number>, p: string) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
    const sortedPlatforms = Object.entries(platformCounts).sort((a: any, b: any) => b[1] - a[1]).map(([p]) => p);
    const topRated = ratings.filter((r: any) => Number(r.rating) >= 4);

    const profile: UserProfile = {
      likedGames: follows, averageRating, reviews: ratings,
      summary: `PROFIL JOUEUR:
- ${ratings.length} jeux notés · moyenne ${averageRating}/5 · ${topRated.length} coups de cœur (4+/5)
- Jeux notés (références de goût): ${ratedGames.join(" | ") || "aucun"}
- Plateformes jouées: ${sortedPlatforms.join(", ") || "non renseignée"} (principale: ${sortedPlatforms[0] ?? "?"})
- Wishlist (envies futures, PAS joués): ${followedNames.join(", ") || "aucun"}
- Profil: ${averageRating >= 4 ? "joueur exigeant" : averageRating >= 3 ? "joueur standard" : "explorateur curieux"}`,
    };

    return { profile, tokens: estimateTokens(JSON.stringify(profile)) };
  } catch (e) {
    console.error("[ALBUS] Profile error:", e);
    return { profile: { likedGames: [], averageRating: 0, reviews: [], summary: "Erreur profil" }, tokens: 0 };
  }
}

// ==================== TOKEN USAGE WRITE ====================
// Fire-and-forget — n'attend pas la réponse pour ne pas ralentir
async function writeTokenUsage(supabaseUrl: string, supabaseKey: string, userJwt: string, userId: string, tokensUsed: number): Promise<void> {
  if (!userId || tokensUsed === 0) return;
  try {
    await fetch(`${supabaseUrl}/rest/v1/token_usage`, {
      method: "POST",
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${userJwt}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        user_id: userId,
        tokens_used: tokensUsed,
        created_at: new Date().toISOString(),
      }),
    });
    console.log("[ALBUS] Token usage written:", tokensUsed);
  } catch (e) {
    console.error("[ALBUS] Token write error:", e);
  }
}

// ==================== RATE LIMIT CHECK ====================
async function checkRateLimit(supabaseUrl: string, supabaseKey: string, userJwt: string, userId: string): Promise<{ allowed: boolean; tier: string; message?: string }> {
  if (!userId) return { allowed: true, tier: "free" };

  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [subRes, usageRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${userId}&status=eq.active&select=plan&limit=1`,
        { headers: { "apikey": supabaseKey, "Authorization": `Bearer ${userJwt}` } }),
      // FIX: récupère TOUTES les lignes du mois pour sommer (INSERT par requête)
      fetch(`${supabaseUrl}/rest/v1/token_usage?user_id=eq.${userId}&created_at=gte.${monthStart.toISOString()}&select=tokens_used`,
        { headers: { "apikey": supabaseKey, "Authorization": `Bearer ${userJwt}` } }),
    ]);

    const subs = subRes.ok ? await subRes.json() : [];
    const tier = subs?.[0]?.plan === "premium" ? "premium" : "free";
    const tokenLimit = tier === "premium" ? 100000 : 15000;

    const usageRows = usageRes.ok ? await usageRes.json() : [];
    // Somme toutes les lignes du mois
    const tokensUsed = usageRows.reduce((sum: number, row: any) => sum + (Number(row.tokens_used) || 0), 0);

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
    console.error("[ALBUS] Rate limit error:", e);
    return { allowed: true, tier: "free" };
  }
}

// ==================== PROFILE RESPONSE ====================
function buildProfileResponse(reviews: any[]): string {
  if (!reviews || reviews.length === 0) {
    return "Tu n'as pas encore noté de jeux sur Factiony. Note tes premiers jeux pour que je puisse t'aider !";
  }

  const sorted = [...reviews]
    .filter((r: any) => r.rating != null && !isNaN(Number(r.rating)))
    .sort((a: any, b: any) => Number(b.rating) - Number(a.rating));

  const medals = ["🥇", "🥈", "🥉"];
  const lines = sorted.slice(0, 10).map((r: any, i: number) => {
    const medal = medals[i] ?? `${i + 1}.`;
    const name = r.game_slug
      ? r.game_slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
      : r.game_id;
    const platform = r.platform ? ` (${r.platform})` : "";
    return `${medal} ${name}${platform} — ${r.rating}/5`;
  });

  const vals = reviews.map((r: any) => Number(r.rating)).filter((n: number) => !isNaN(n) && n > 0);
  const avg = vals.length > 0 ? Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 10) / 10 : 0;
  const perfect = reviews.filter((r: any) => Number(r.rating) === 5).length;

  return `Voici ton classement Factiony :\n\n${lines.join("\n")}\n\n📊 ${reviews.length} jeux notés · Moyenne ${avg}/5${perfect > 0 ? ` · ${perfect} coup${perfect > 1 ? "s" : ""} de cœur parfait${perfect > 1 ? "s" : ""} (5/5)` : ""}`;
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
  // NOUVEAU: historique de conversation passé par le frontend (3 derniers échanges max)
  const history: ConversationMessage[] = Array.isArray(body?.history) ? body.history.slice(-6) : [];

  if (!query) return jsonResponse({ error: "Missing query" }, 400, corsHeaders);

  const tokenUsage: TokenUsage = { deep_understanding: 0, web_search: 0, rawg_search: 0, user_data: 0, reasoning: 0, total: 0 };

  console.log("[ALBUS] 🤖 V7 - Query:", query, "| History:", history.length, "msgs");

  const authHeader = request.headers.get("Authorization") ?? "";
  const userJwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : SUPABASE_ANON_KEY;

  // ==================== PHASE 1: UNDERSTANDING + RATE LIMIT EN PARALLÈLE ====================
  console.log("[ALBUS] Phase 1: Understanding + Rate limit...");

  const [{ understanding, tokens: understandingTokens }, rateLimitResult] = await Promise.all([
    deepQueryUnderstanding(query, MISTRAL_API_KEY, history),
    checkRateLimit(SUPABASE_URL, SUPABASE_ANON_KEY, userJwt, userId),
  ]);

  tokenUsage.deep_understanding = understandingTokens;
  console.log("[ALBUS] Understanding:", JSON.stringify(understanding));

  if (!rateLimitResult.allowed) {
    return jsonResponse({ error: "token_limit_exceeded", message: rateLimitResult.message }, 200, corsHeaders);
  }

  if (understanding.type === "blocked") {
    return jsonResponse({ query, user_pseudo: userPseudo, mode: "blocked", answer: "Je suis Albus, assistant gaming IA. Je peux t'aider sur les jeux vidéo!" }, 200, corsHeaders);
  }

  // ==================== PHASE 2: BRAVE + RAWG + PROFILE EN PARALLÈLE ====================
  console.log("[ALBUS] Phase 2: Brave + RAWG + Profile...");

  const queryPlatformIds = (understanding.platforms ?? [])
    .map((p: string) => PLATFORM_MAP[p.toLowerCase()]).filter(Boolean) as string[];

  const [braveData, rawgDataInitial, userProfileData] = await Promise.all([
    BRAVE_API_KEY
      ? runBraveSearches(understanding, query, BRAVE_API_KEY)
      : Promise.resolve({ mainResults: "", priceResults: "", tokens: 0 }),
    intelligentRawgSearch(understanding, RAWG_API_KEY, queryPlatformIds),
    fetchUserProfile(SUPABASE_URL, SUPABASE_ANON_KEY, userJwt, userId, understanding.type),
  ]);

  // ---- PROFILE : réponse directe, zéro LLM ----
  if (understanding.type === "profile") {
    const answer = buildProfileResponse(userProfileData.profile.reviews);
    tokenUsage.user_data = userProfileData.tokens;
    tokenUsage.total = Object.values(tokenUsage).reduce((a, b) => a + b, 0);
    // Fire and forget
    writeTokenUsage(SUPABASE_URL, SUPABASE_ANON_KEY, userJwt, userId, tokenUsage.total);
    console.log("[ALBUS] ✅ Profile | Tokens:", tokenUsage.total);
    return jsonResponse({ query, user_pseudo: userPseudo, mode: "profile", answer, tokens_used: tokenUsage.total }, 200, corsHeaders);
  }

  // Fallback RAWG avec plateformes profil si 0 résultats et pas de plateforme dans la requête
  let rawgData = rawgDataInitial;
  if (queryPlatformIds.length === 0 && rawgDataInitial.games.length === 0 && understanding.type === "recommendation") {
    const profilePlatformIds = Object.entries(
      userProfileData.profile.reviews.map((r: any) => r.platform).filter(Boolean)
        .reduce((acc: Record<string, number>, p: string) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {})
    )
      .sort((a: any, b: any) => b[1] - a[1])
      .map(([p]) => PLATFORM_MAP[p.toLowerCase()]).filter(Boolean) as string[];

    if (profilePlatformIds.length > 0) {
      rawgData = await intelligentRawgSearch(understanding, RAWG_API_KEY, profilePlatformIds);
    }
  }

  tokenUsage.web_search = braveData.tokens;
  tokenUsage.rawg_search = rawgData.tokens;
  tokenUsage.user_data = userProfileData.tokens;

  const historyBlock = formatHistory(history);

  console.log("[ALBUS] Phase 2 done → Brave main:", !!braveData.mainResults, "| Prix:", !!braveData.priceResults, "| RAWG:", rawgData.games.length, "| Historique:", history.length, "msgs");

  // ==================== PHASE 3: REASONING ====================
  console.log("[ALBUS] Phase 3: Reasoning...");

  // ---- GAMEPLAY ----
  if (understanding.type === "gameplay") {
    const systemPrompt = `Tu es Albus, assistant gaming IA de Factiony pour ${userPseudo || "ce joueur"}.
Réponds aux questions gaming (boss, build, strat, équipement, guide). PAS D'ASTÉRISQUES.
REPONDS EN ${userLanguage === "en" ? "ENGLISH" : "FRANÇAIS"}.`;

    const userPrompt = `${historyBlock}Question: ${query}
${braveData.mainResults ? `\nDONNÉES WEB:\n${braveData.mainResults}` : ""}
Sois précis et actionnable.`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST", signal: controller.signal,
        headers: { Authorization: "Bearer " + MISTRAL_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "mistral-small-latest", temperature: 0.7, max_tokens: 2000,
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        }),
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const answer = (json?.choices?.[0]?.message?.content ?? "").replace(/\*\*?/g, "");
        tokenUsage.reasoning = estimateTokens(systemPrompt + userPrompt + answer);
        tokenUsage.total = Object.values(tokenUsage).reduce((a, b) => a + b, 0);
        writeTokenUsage(SUPABASE_URL, SUPABASE_ANON_KEY, userJwt, userId, tokenUsage.total);
        console.log("[ALBUS] ✅ Gameplay | Tokens:", tokenUsage.total);
        return jsonResponse({ query, user_pseudo: userPseudo, mode: "gameplay", answer, tokens_used: tokenUsage.total, has_web_data: !!braveData.mainResults }, 200, corsHeaders);
      }
    } catch (e) {
      console.error("[ALBUS] Gameplay error:", e);
      return jsonResponse({ query, user_pseudo: userPseudo, mode: "gameplay", answer: "Désolé, réessaie dans un instant." }, 200, corsHeaders);
    }
  }

  // ---- COMPARISON ----
  if (understanding.type === "comparison") {
    const games = understanding.comparisons.length > 0
      ? understanding.comparisons.join(" et ")
      : query;

    const compPrompt = `Tu es Albus, assistant gaming IA de Factiony pour ${userPseudo || "ce joueur"}.
${historyBlock}
L'user veut comparer: ${games}
Question exacte: "${query}"

${braveData.mainResults ? `DONNÉES WEB SUR CES JEUX:\n${braveData.mainResults}\n` : ""}

PROFIL DU JOUEUR:
${userProfileData.profile.summary}

Fais une comparaison claire et personnalisée pour CE JOUEUR SPÉCIFIQUEMENT selon son profil.
Structure:
- Points forts de chaque jeu
- Lequel est le mieux adapté à son profil et pourquoi
- Recommandation finale claire

PAS D'ASTÉRISQUES. Texte direct et utile.
RÉPONDS EN ${userLanguage === "en" ? "ENGLISH" : "FRANÇAIS"}.`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST", signal: controller.signal,
        headers: { Authorization: "Bearer " + MISTRAL_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "mistral-large-latest", temperature: 0.7, max_tokens: 1500,
          messages: [{ role: "user", content: compPrompt }],
        }),
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const answer = (json?.choices?.[0]?.message?.content ?? "").replace(/\*\*?/g, "");
        tokenUsage.reasoning = estimateTokens(compPrompt + answer);
        tokenUsage.total = Object.values(tokenUsage).reduce((a, b) => a + b, 0);
        writeTokenUsage(SUPABASE_URL, SUPABASE_ANON_KEY, userJwt, userId, tokenUsage.total);
        console.log("[ALBUS] ✅ Comparison | Tokens:", tokenUsage.total);
        return jsonResponse({ query, user_pseudo: userPseudo, mode: "comparison", answer, tokens_used: tokenUsage.total }, 200, corsHeaders);
      }
    } catch (e) {
      console.error("[ALBUS] Comparison error:", e);
      return jsonResponse({ query, user_pseudo: userPseudo, mode: "comparison", answer: "Désolé, réessaie dans un instant." }, 200, corsHeaders);
    }
  }

  // ---- RECOMMENDATION ----
  if (rawgData.games.length === 0 && !braveData.mainResults) {
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
    rating: g.rating || "N/A", released: g.released,
  }));

  const priceConstraintBlock = understanding.price_max !== null
    ? `💰 CONTRAINTE PRIX: Max ${understanding.price_max}€
${braveData.priceResults
  ? `DONNÉES PRIX RÉELLES (Brave Search):\n${braveData.priceResults}\nUtilise ces données pour vérifier les prix réels avant de recommander.`
  : `Sans données prix en temps réel: évite les AAA récents (>40€ en général). Privilégie jeux indés, back-catalog, free-to-play.`}`
    : "";

  const onlineCoopNote = (understanding.genres.includes("online coop") || understanding.genres.includes("coop en ligne") || understanding.genres.includes("multi en ligne"))
    ? `⚠️ ONLINE OBLIGATOIRE: multijoueur EN LIGNE uniquement (pas local).`
    : "";

  const reasoningPrompt = `Tu es Albus, assistant gaming de Factiony pour ${userPseudo || "ce joueur"}.
${historyBlock}
RECOMMANDE intelligemment:

🧠 COMPRIS: ${understanding.intent} | ${understanding.user_mindset} | genres: ${understanding.genres.join(", ") || "aucun"}
${priceConstraintBlock}
${onlineCoopNote}

🌐 WEB: ${braveData.mainResults || "aucune donnée"}

🎮 JEUX RAWG:
${JSON.stringify(gamesData.slice(0, 12))}

👤 PROFIL:
${userProfileData.profile.summary}

📋 Recommande EXACTEMENT 3 jeux de la liste RAWG. Explique POURQUOI pour CE JOUEUR PRÉCISÉMENT (référence à ses goûts, ses jeux notés, ses plateformes). Respecte TOUTES les contraintes. Pose 1 question courte après.

Format strict:
🎮 [Nom exact de la liste RAWG]
Pourquoi pour lui
[Genres] - [Rating]/5

PAS D'ASTÉRISQUES. 3 JEUX EXACTEMENT.
RÉPONDS EN ${userLanguage === "en" ? "ENGLISH" : "FRANÇAIS"}.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST", signal: controller.signal,
      headers: { Authorization: "Bearer " + MISTRAL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest", temperature: 0.8, max_tokens: 1500,
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
              slug: currentGame.slug, title: currentGame.name,
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
          slug: currentGame.slug, title: currentGame.name,
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
      writeTokenUsage(SUPABASE_URL, SUPABASE_ANON_KEY, userJwt, userId, tokenUsage.total);
      console.log("[ALBUS] ✅ Recs:", recs.length, "| Tokens:", tokenUsage.total);

      return jsonResponse({
        query, user_pseudo: userPseudo, mode: "recommendation",
        recommendations: recs, personal_message: questionText,
        tokens_used: tokenUsage.total, understanding_data: understanding,
      }, 200, corsHeaders);
    }
  } catch (e) {
    console.error("[ALBUS] Recommendation error:", e);
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