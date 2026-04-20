// netlify/edge-functions/ai-reco.ts - TRUE AGENTIC ALBUS V6 (BRAVE SEARCH REAL WEB)

function jsonResponse(body: any, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

const TAG_IDS: Record<string, number> = {
  "coop": 18, "coopératif": 18, "cooperative": 18, "co-op": 18,
  "online coop": 9, "online co-op": 9,
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
  "intent": "discovery|recommendation|advice|comparison|help"
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

GENRES (important pour filtrer RAWG correctement):
- "coop|coopératif|co-op|jouer ensemble|avec un ami" → genres=["coop"]
- "multijoueur|multi" → genres=["multiplayer"]
- "solo" → genres=["solo"]

NEEDS_CURRENT_DATA:
- type="gameplay" → needs_current_data=true TOUJOURS (builds, patches, metas changent)
- type="recommendation" + temporel → needs_current_data=true
- type="recommendation" + all_time → needs_current_data=false

MIND-SET:
- "facile|relax|chill" → casual
- "hardcore|challenge|difficile|dark souls" → hardcore
- "hidden gems|découvrir|explorer" → explorer
- "collection|tous|complet" → collector

IMPORTANT: Réponds UNIQUEMENT avec le JSON ci-dessus. Aucun champ supplémentaire, aucun commentaire, aucun analysis_notes.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.log("[ALBUS] Understanding TIMEOUT après 10s");
      controller.abort();
    }, 10000);

    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + mistralKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0,
        max_tokens: 1000,
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
    },
    tokens: 0,
  };
}

// ==================== BRAVE SEARCH (vrai web search) ====================
async function braveWebSearch(understanding: QueryUnderstanding, query: string, braveKey: string): Promise<{ results: string; tokens: number }> {
  if (!understanding.temporal.needs_current_data) {
    console.log("[ALBUS] Brave Search: OFF (all_time)");
    return { results: "", tokens: 0 };
  }

  // Construction de la query de recherche
  let searchQuery = query;
  if (understanding.type === "gameplay") {
    searchQuery = `${query} guide tips 2026`;
  } else if (understanding.temporal.label !== "all_time") {
    searchQuery = `${query} ${understanding.temporal.label} 2026`;
  }

  console.log("[ALBUS] Brave Search: ON → query:", searchQuery);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.log("[ALBUS] Brave Search TIMEOUT après 5s");
      controller.abort();
    }, 5000);

    // Brave LLM Context API — résultats optimisés pour les agents IA
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

    if (!res.ok) {
      console.error("[ALBUS] Brave Search HTTP error:", res.status);
      return { results: "", tokens: 0 };
    }

    const data = await res.json();
    const webResults = data?.web?.results ?? [];

    if (webResults.length === 0) {
      console.log("[ALBUS] Brave Search: 0 résultats");
      return { results: "", tokens: 0 };
    }

    // Formatage des résultats pour Mistral
    const formatted = webResults
      .slice(0, 5)
      .map((r: any, i: number) => {
        const snippet = r.extra_snippets?.[0] || r.description || "";
        return `[${i + 1}] ${r.title}\n${snippet}`;
      })
      .join("\n\n");

    console.log("[ALBUS] Brave Search: ✅", webResults.length, "résultats");
    return { results: formatted, tokens: estimateTokens(formatted) };

  } catch (e) {
    console.error("[ALBUS] Brave Search error:", e);
    return { results: "", tokens: 0 };
  }
}

// ==================== RAWG SEARCH ====================
async function intelligentRawgSearch(understanding: QueryUnderstanding, rawgKey: string, userPlatforms: string[] = []): Promise<{ games: any[]; tokens: number }> {
  if (understanding.type === "gameplay") {
    console.log("[ALBUS] RAWG: OFF (gameplay)");
    return { games: [], tokens: 0 };
  }

  let parsedTags: string[] = [];
  let platformIds: string[] = [];

  if (understanding.genres?.length > 0) {
    parsedTags = understanding.genres
      .map((g: string) => TAG_IDS[g])
      .filter((id: any) => id !== undefined)
      .map((id: number) => id.toString());
  }

  const platformMap: Record<string, string> = {
    "ps5": "187", "playstation 5": "187", "playstation": "187",
    "xbox": "186", "xbox series": "186",
    "switch": "7", "nintendo": "7",
    "pc": "4",
    "playstation 4": "18", "ps4": "18",
    "playstation 3": "16", "ps3": "16",
  };

  // Priorité : plateformes mentionnées dans la requête, sinon plateformes du profil user
  const platformsToUse = understanding.platforms?.length > 0
    ? understanding.platforms
    : userPlatforms;

  for (const p of platformsToUse) {
    const id = platformMap[p.toLowerCase()];
    if (id && !platformIds.includes(id)) platformIds.push(id);
  }

  console.log("[ALBUS] RAWG platforms:", platformIds.join(",") || "aucun filtre");

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
      const rawgData = await rawgRes.json();
      games = rawgData.results || [];
      console.log("[ALBUS] RAWG: ✅", games.length, "jeux bruts");
    }
  } catch (e) {
    console.error("[ALBUS] RAWG error:", e);
  }

  if (understanding.temporal.start_date && understanding.temporal.end_date && games.length > 0) {
    const startDate = new Date(understanding.temporal.start_date);
    const endDate = new Date(understanding.temporal.end_date);
    games = games
      .filter(g => {
        if (!g.released) return false;
        const d = new Date(g.released);
        return d >= startDate && d <= endDate;
      })
      .sort((a, b) => new Date(b.released).getTime() - new Date(a.released).getTime());
    console.log("[ALBUS] RAWG après filtre date:", games.length, "jeux");
  }

  return { games, tokens: estimateTokens(JSON.stringify(games.slice(0, 20))) };
}

// ==================== USER PROFILE ====================
async function fetchUserProfile(supabaseUrl: string, supabaseKey: string, userJwt: string, userId: string, queryType: string): Promise<{ profile: UserProfile; tokens: number }> {
  if (queryType === "gameplay" || !userId) {
    return { profile: { likedGames: [], averageRating: 0, reviews: [], summary: "N/A" }, tokens: 0 };
  }

  try {
    // FIX: utilise le JWT user pour bypasser le RLS Supabase
    const headers = {
      "apikey": supabaseKey,
      "Authorization": `Bearer ${userJwt}`,
    };

    const [followsRes, ratingsRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/game_follows?user_id=eq.${userId}&select=game_id,game_name&limit=50&order=created_at.desc`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/game_ratings?user_id=eq.${userId}&select=game_id,game_slug,rating,rating_gameplay,rating_story,platform&limit=50&order=created_at.desc`, { headers }),
    ]);

    const follows = followsRes.ok ? await followsRes.json() : [];
    const ratings = ratingsRes.ok ? await ratingsRes.json() : [];

    console.log("[ALBUS] Profile → follows:", follows.length, "| ratings:", ratings.length);

    let averageRating = 0;
    if (ratings.length > 0) {
      const ratingValues = ratings.map((r: any) => Number(r.rating)).filter((r: number) => !isNaN(r) && r > 0);
      averageRating = ratingValues.length > 0
        ? Math.round((ratingValues.reduce((a: number, b: number) => a + b, 0) / ratingValues.length) * 10) / 10
        : 0;
    }

    const followedNames = follows.slice(0, 8).map((f: any) => f.game_name).filter(Boolean);
    const ratedGames = ratings.slice(0, 5).map((r: any) =>
      `${r.game_slug || r.game_id} (${r.rating}/5${r.platform ? ` sur ${r.platform}` : ""})`
    );

    // Plateformes dynamiques depuis les ratings
    const platformCounts = ratings
      .map((r: any) => r.platform)
      .filter(Boolean)
      .reduce((acc: Record<string, number>, p: string) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
    const sortedPlatforms = Object.entries(platformCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .map(([p]) => p);
    const topPlatform = sortedPlatforms[0] ?? "non renseignée";
    const allPlatforms = sortedPlatforms.join(", ") || "non renseignée";

    const profile: UserProfile = {
      likedGames: follows,
      averageRating,
      reviews: ratings,
      summary: `
USER PROFIL FACTIONY:

JEUX JOUÉS ET NOTÉS (références de goût fiables):
- ${ratings.length} jeux notés, moyenne ${averageRating}/5
- ${topRated.length} jeux notés 4+/5 (vrais coups de cœur)
- Derniers jeux notés: ${ratedGames.join(" | ") || "aucun"}

PLATEFORMES JOUÉES (IMPORTANT - recommande uniquement des jeux dispo sur ces plateformes):
- Plateforme principale: ${topPlatform}
- Toutes ses plateformes: ${allPlatforms}

JEUX SUIVIS / WISHLIST (envies futures, PAS encore joués - ne pas utiliser comme référence de goût):
- ${follows.length} jeux en wishlist: ${followedNames.join(", ") || "aucun"}
- Ces jeux ne sont PAS des références de goût, juste des envies

PROFIL JOUEUR:
- ${averageRating >= 4 ? "Joueur exigeant, aime les jeux de qualité" : averageRating >= 3 ? "Joueur standard, ouvert à différents genres" : follows.length > 10 ? "Explorateur curieux" : "Nouveau sur Factiony"}`,
    };

    return { profile, tokens: estimateTokens(JSON.stringify(profile)) };
  } catch (e) {
    console.error("[ALBUS] User profile error:", e);
    return { profile: { likedGames: [], averageRating: 0, reviews: [], summary: "Erreur chargement profil" }, tokens: 0 };
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
  const RAWG_API_KEY = Deno.env.get("VITE_RAWG_API_KEY");
  const BRAVE_API_KEY = Deno.env.get("BRAVE_SEARCH_API_KEY");
  const BASE_URL = Deno.env.get("FACTIONY_BASE_URL") ?? "https://factiony.com";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !MISTRAL_API_KEY) {
    return jsonResponse({ error: "Missing env vars" }, 500, corsHeaders);
  }

  if (!BRAVE_API_KEY) {
    console.warn("[ALBUS] BRAVE_SEARCH_API_KEY manquant — web search désactivé");
  }

  let body: any;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders); }

  const query = (body?.query ?? "").toString().trim();
  const userPseudo = (body?.user_pseudo ?? "").toString().trim();
  const userId = (body?.user_id ?? "").toString().trim();
  const userLanguage = (body?.language ?? "fr").toString().trim();

  if (!query) return jsonResponse({ error: "Missing query" }, 400, corsHeaders);

  const tokenUsage: TokenUsage = {
    deep_understanding: 0, web_search: 0, rawg_search: 0,
    user_data: 0, reasoning: 0, total: 0,
  };

  console.log("[ALBUS] 🤖 TRUE AGENTIC V6 (BRAVE SEARCH) - Query:", query);

  // ==================== STEP 1: UNDERSTANDING ====================
  console.log("[ALBUS] Step 1: Deep Query Understanding...");
  const { understanding, tokens: understandingTokens } = await deepQueryUnderstanding(query, MISTRAL_API_KEY);
  tokenUsage.deep_understanding = understandingTokens;
  console.log("[ALBUS] Understanding:", JSON.stringify(understanding));

  if (understanding.type === "blocked") {
    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "blocked",
      answer: "Je suis Albus, assistant gaming IA. Je peux t'aider sur les jeux vidéo!",
    }, 200, corsHeaders);
  }

  // ==================== STEP 2: PARALLEL ====================
  console.log("[ALBUS] Step 2: Parallel Execution (Brave + RAWG + Profil)...");

  // Récupère le JWT user depuis le header Authorization pour bypasser le RLS
  const authHeader = request.headers.get("Authorization") ?? "";
  const userJwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : SUPABASE_ANON_KEY;

  // ==================== RATE LIMITING (SERVER-SIDE) ====================
// Vérification tier depuis Supabase (ne pas faire confiance au client)
let serverTier = "free";
if (userId) {
  try {
    const subRes = await fetch(
      `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&status=eq.active&select=plan&limit=1`,
      { headers: { "apikey": SUPABASE_ANON_KEY!, "Authorization": `Bearer ${userJwt}` } }
    );
    if (subRes.ok) {
      const subs = await subRes.json();
      if (subs?.[0]?.plan === "premium") serverTier = "premium";
    }
  } catch (e) {
    console.error("[ALBUS] Tier check error:", e);
  }
}

// Vérification tokens utilisés ce mois
if (userId) {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const usageRes = await fetch(
      `${SUPABASE_URL}/rest/v1/token_usage?user_id=eq.${userId}&created_at=gte.${monthStart.toISOString()}&select=tokens_used&limit=1`,
      { headers: { "apikey": SUPABASE_ANON_KEY!, "Authorization": `Bearer ${userJwt}` } }
    );

    if (usageRes.ok) {
      const usage = await usageRes.json();
      const tokensUsed = usage?.[0]?.tokens_used ?? 0;
      const tokenLimit = serverTier === "premium" ? 100000 : 15000;

      if (tokensUsed >= tokenLimit) {
        console.log(`[ALBUS] Token limit reached for ${userId}: ${tokensUsed}/${tokenLimit}`);
        return jsonResponse({
          error: "token_limit_exceeded",
          message: serverTier === "premium"
            ? `Tu as atteint ta limite mensuelle premium (${tokenLimit.toLocaleString()} tokens). Réinitialisation le 1er du mois.`
            : `Tu as atteint ta limite mensuelle gratuite (${tokenLimit.toLocaleString()} tokens). Passe premium pour 10x plus !`,
        }, 200, corsHeaders);
      }

      console.log(`[ALBUS] Tokens: ${tokensUsed}/${tokenLimit} (${serverTier})`);
    }
  } catch (e) {
    console.error("[ALBUS] Token check error:", e);
    // En cas d'erreur on laisse passer — mieux vaut servir que bloquer
  }
}

  // Tout en parallèle — profil + Brave + RAWG sans plateforme d'abord
  const [webData, rawgDataInitial, userProfileData] = await Promise.all([
    BRAVE_API_KEY
      ? braveWebSearch(understanding, query, BRAVE_API_KEY)
      : Promise.resolve({ results: "", tokens: 0 }),
    intelligentRawgSearch(understanding, RAWG_API_KEY, []), // sans filtre plateforme d'abord
    fetchUserProfile(SUPABASE_URL, SUPABASE_ANON_KEY, userJwt, userId, understanding.type),
  ]);

  // Extraire les plateformes du profil
  const userPlatformNames = userProfileData.profile.reviews
    .map((r: any) => r.platform)
    .filter(Boolean)
    .reduce((acc: Record<string, number>, p: string) => { acc[p] = (acc[p] || 0) + 1; return acc; }, {});
  const sortedUserPlatforms = Object.entries(userPlatformNames)
    .sort((a: any, b: any) => b[1] - a[1])
    .map(([p]) => p.toLowerCase());

  // Si on a des plateformes user ET que la query ne spécifie pas de plateforme,
  // refaire RAWG avec le bon filtre plateforme
  let rawgData = rawgDataInitial;
  if (sortedUserPlatforms.length > 0 && understanding.platforms?.length === 0) {
    rawgData = await intelligentRawgSearch(understanding, RAWG_API_KEY, sortedUserPlatforms);
  }

  tokenUsage.web_search = webData.tokens;
  tokenUsage.rawg_search = rawgData.tokens;
  tokenUsage.user_data = userProfileData.tokens;

  console.log("[ALBUS] Parallel done → Brave:", webData.results ? "✅" : "❌", "| RAWG:", rawgData.games.length, "| Profile:", userProfileData.profile.likedGames.length, "follows");

  // ==================== STEP 3: REASONING ====================
  console.log("[ALBUS] Step 3: Final Reasoning...");

  // ---- GAMEPLAY ----
  if (understanding.type === "gameplay") {
    const systemPrompt = `Tu es Albus, assistant gaming IA expert de Factiony.
Réponds aux questions gaming (boss, build, strat, équipement, guide).
Tu as accès aux données web récentes ci-dessous.
Conseils directs, pratiques, précis. PAS D'ASTÉRISQUES.
REPONDS EN ${userLanguage === "en" ? "ENGLISH" : "FRANÇAIS"}.`;

    const userPrompt = `Question: ${query}

${webData.results
      ? `DONNÉES WEB RÉCENTES (Brave Search):\n${webData.results}`
      : "Pas de données web disponibles, réponds avec tes connaissances."}

Réponds avec les meilleures stratégies/builds/conseils. Sois précis et actionnable.`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        console.log("[ALBUS] Gameplay reasoning TIMEOUT après 25s");
        controller.abort();
      }, 25000);

      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: "Bearer " + MISTRAL_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "mistral-small-latest", // FIX: small suffisant avec données Brave déjà structurées, 3x plus rapide
          temperature: 0.7,
          max_tokens: 2500,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json = await res.json();
        const answer = json?.choices?.[0]?.message?.content ?? "";
        const clean = answer.replace(/\*\*?/g, "");
        tokenUsage.reasoning = estimateTokens(systemPrompt + userPrompt + answer);
        tokenUsage.total = Object.values(tokenUsage).reduce((a, b) => a + b, 0);

        console.log("[ALBUS] ✅ Gameplay | Tokens:", tokenUsage.total, "| Web data:", !!webData.results);

        return jsonResponse({
          query, user_pseudo: userPseudo, mode: "gameplay",
          answer: clean,
          tokens_used: tokenUsage.total,
          has_web_data: !!webData.results,
        }, 200, corsHeaders);
      }
    } catch (e) {
      console.error("[ALBUS] Gameplay reasoning error:", e);
      return jsonResponse({
        query, user_pseudo: userPseudo, mode: "gameplay",
        answer: "Désolé, j'ai eu un problème. Réessaie dans un instant.",
      }, 200, corsHeaders);
    }
  }

  // ---- RECOMMENDATION ----
  if (rawgData.games.length === 0 && !webData.results) {
    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation",
      recommendations: [],
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

  const reasoningPrompt = `Tu es Albus. FUSIONNE et RECOMMANDE intelligemment:

🧠 CE QUE TU AS COMPRIS:
- Intent: ${understanding.intent} (${understanding.context})
- User Mindset: ${understanding.user_mindset}
- Cherche: ${understanding.themes.join(", ") || "jeux généralement"}
${understanding.comparisons.length > 0 ? `- Comparaisons: ${understanding.comparisons.join(", ")}` : ""}
- Temporal: ${understanding.temporal.label}
- Genres demandés: ${understanding.genres.join(", ") || "aucun filtre"}

${understanding.genres.some((g: string) => ["coop", "multiplayer", "multijoueur", "solo", "single-player"].includes(g)) ? `Note: l'user cherche des jeux "${understanding.genres.filter((g: string) => ["coop", "multiplayer", "multijoueur", "solo", "single-player"].includes(g)).join(", ")}". Les jeux ont déjà été filtrés selon ce critère. Dans tes descriptions, mentionne brièvement le mode de jeu (ex: "coop 2-4 joueurs en ligne", "solo uniquement", "multijoueur compétitif").` : ""}

🌐 DONNÉES WEB RÉELLES (Brave Search):
${webData.results || "Pas de données web"}

🎮 JEUX RAWG (${gamesData.length} dispo, triés par ${understanding.temporal.start_date ? "date" : "rating"}):
${JSON.stringify(gamesData.slice(0, 12))}

👤 PROFIL USER:
${userProfileData.profile.summary}

📋 TASK:
1. FUSIONNE Web + RAWG + User profile
2. Recommande 1-3 jeux en expliquant pourquoi c'est bon POUR CET USER spécifiquement
3. Pose 1 question courte après

Format:
🎮 [Nom du jeu]
Description (POURQUOI pour lui spécifiquement)
[Genres] - ${understanding.temporal.start_date ? "[Date sortie]" : "[Rating]/5"}

⚠️ PAS D'ASTÉRISQUES. Texte simple.
REPOND EN ${userLanguage === "en" ? "ENGLISH" : "FRANÇAIS"}.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      console.log("[ALBUS] Recommendation reasoning TIMEOUT après 20s");
      controller.abort();
    }, 20000);

    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + MISTRAL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.8,
        max_tokens: 2000,
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

        const gameMatch = gamesData.find((g: any) =>
          trimmed.toLowerCase().includes(g.name.toLowerCase()) && trimmed.length < 100
        );

        if (gameMatch && found < 3) {
          // Sauvegarde le jeu précédent avant de passer au suivant
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
          // Exclut les lignes qui ressemblent à des ratings ou genres courts
          const isMetaLine = /^\[.*\]/.test(trimmed) || /^\d+(\.\d+)?\/5/.test(trimmed);
          if (!isMetaLine) {
            currentDescription += (currentDescription ? " " : "") + trimmed;
          }
        }
      }

      // Dernier jeu
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

      // FIX questionText : cherche une vraie question (contient ?) en ignorant les ratings
      let questionText = "Lequel te tente?";
      const questionLines = cleanRaw.split("\n")
        .map((s: string) => s.trim())
        .filter((s: string) => s.includes("?") && s.length > 10 && s.length < 200 && !/\d+\/5/.test(s));
      if (questionLines.length > 0) {
        questionText = questionLines[questionLines.length - 1];
      }

      tokenUsage.total = Object.values(tokenUsage).reduce((a, b) => a + b, 0);
      console.log("[ALBUS] ✅ Recs:", recs.length, "| Tokens:", tokenUsage.total, "| Web:", !!webData.results);

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