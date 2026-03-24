// netlify/edge-functions/ai-reco.ts - TRUE AGENTIC ALBUS V4 FIXED (SMART DATE FILTERING)

function jsonResponse(body: any, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

const TAG_IDS: Record<string, number> = {
  "coop": 7, "coopératif": 7, "cooperative": 7,
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
  tool_selection: number;
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

RÈGLES TEMPORELLES (IMPORTANTES):
- "ce jour" → start=${today}, end=${today}
- "ce mois" → start=2026-03-01, end=${today}
- "cette semaine" → start=2026-03-17, end=${today}
- "cet été" → start=2026-06-21, end=2026-09-21
- "l'année dernière" → start=2025-03-24, end=2026-03-24
- "récent|nouveaux|sorties" → needs_current_data=true
- "comme Elden Ring" → comparisons=["Elden Ring"], intent=comparison
- Pas de temps mentionné → null dates, all_time

RÈGLES TYPE:
- type="gameplay" si: boss, build, strat, combat, skill, technique
- type="recommendation" si: cherche jeux, sorties, like, similaire
- type="blocked" si: pas gaming du tout

MIND-SET (important pour perso):
- "facile|relax|chill" → casual
- "hardcore|challenge|difficile|dark souls" → hardcore
- "hidden gems|découvrir|explorer" → explorer
- "collection|tous|complet" → collector

Sois INTELLIGENT, pas juste keyword matching!`;

  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + mistralKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0,
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (res.ok) {
      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content ?? "{}";
      const tokens = estimateTokens(prompt + text);

      try {
        const parsed = JSON.parse(text);
        return { understanding: parsed, tokens };
      } catch (e) {
        console.error("[ALBUS] Understanding parse error:", text);
        return {
          understanding: {
            type: "recommendation",
            temporal: { start_date: null, end_date: null, label: "all_time", needs_current_data: false },
            platforms: [],
            genres: [],
            themes: [],
            comparisons: [],
            context: "",
            user_mindset: "explorer",
            intent: "discovery",
          },
          tokens,
        };
      }
    }
  } catch (e) {
    console.error("[ALBUS] Deep understanding error:", e);
  }

  return {
    understanding: {
      type: "recommendation",
      temporal: { start_date: null, end_date: null, label: "all_time", needs_current_data: false },
      platforms: [],
      genres: [],
      themes: [],
      comparisons: [],
      context: "",
      user_mindset: "explorer",
      intent: "discovery",
    },
    tokens: 0,
  };
}

// ==================== STEP 2: INTELLIGENT WEB SEARCH ====================
async function intelligentWebSearch(understanding: QueryUnderstanding, query: string, mistralKey: string): Promise<{ results: string; tokens: number }> {
  if (!understanding.temporal.needs_current_data) {
    return { results: "", tokens: 0 };
  }

  let searchQuery = query;
  if (understanding.temporal.label !== "all_time") {
    searchQuery += ` ${understanding.temporal.label} 2026`;
  }

  const prompt = `Cherche: "${searchQuery}"

Résume EN FRANÇAIS en 3-4 phrases les infos gaming pertinentes:
1. Jeux trouvés avec dates
2. Plateformes disponibles
3. Avis/scores pertinents
4. Contexte (découvertes du jour, buzz, etc)`;

  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + mistralKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.5,
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (res.ok) {
      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content ?? "";
      const tokens = estimateTokens(prompt + text);
      return { results: text, tokens };
    }
  } catch (e) {
    console.error("[ALBUS] Web search error:", e);
  }

  return { results: "", tokens: 0 };
}

// ==================== STEP 3: INTELLIGENT RAWG SEARCH ====================
async function intelligentRawgSearch(understanding: QueryUnderstanding, rawgKey: string): Promise<{ games: any[]; tokens: number }> {
  let parsedTags: string[] = [];
  let platformIds: string[] = [];

  // Parse genres
  if (understanding.genres && understanding.genres.length > 0) {
    parsedTags = understanding.genres
      .map((g: string) => TAG_IDS[g])
      .filter((id: any) => id !== undefined)
      .map((id: number) => id.toString());
  }

  // Parse platforms
  if (understanding.platforms && understanding.platforms.length > 0) {
    const platformMap: Record<string, string> = {
      "ps5": "187",
      "playstation": "187",
      "xbox": "186",
      "xbox series": "186",
      "switch": "7",
      "nintendo": "7",
      "pc": "4",
    };

    for (const p of understanding.platforms) {
      if (platformMap[p.toLowerCase()]) {
        platformIds.push(platformMap[p.toLowerCase()]);
      }
    }
  }

  const rawgParams = new URLSearchParams();
  rawgParams.set("key", rawgKey);
  rawgParams.set("page_size", "50");

  // SMART ORDERING: Si recherche temporelle → trier par date, sinon par rating
  if (understanding.temporal.start_date) {
    console.log("[ALBUS] Temporal search → ordering by -released (date)");
    rawgParams.set("ordering", "-released");
  } else {
    console.log("[ALBUS] General search → ordering by -rating");
    rawgParams.set("ordering", "-rating");
  }

  if (platformIds.length > 0) {
    rawgParams.set("platforms", platformIds.join(","));
  }
  if (parsedTags.length > 0) {
    rawgParams.set("tags", parsedTags.join(","));
  }

  // Date filtering RAWG API
  if (understanding.temporal.start_date && understanding.temporal.end_date) {
    rawgParams.set("dates", `${understanding.temporal.start_date},${understanding.temporal.end_date}`);
  }

  let games: any[] = [];
  try {
    const rawgUrl = "https://api.rawg.io/api/games?" + rawgParams.toString();
    console.log("[ALBUS] RAWG URL:", rawgUrl.substring(0, 100) + "...");
    const rawgRes = await fetch(rawgUrl);
    if (rawgRes.ok) {
      const rawgData = await rawgRes.json();
      games = rawgData.results || [];
    }
  } catch (e) {
    console.error("[ALBUS] RAWG error:", e);
  }

  // ==================== CLIENT-SIDE DATE FILTERING ====================
  // RAWG date filtering isn't perfect, so filter again client-side
  if (understanding.temporal.start_date && understanding.temporal.end_date && games.length > 0) {
    const startDate = new Date(understanding.temporal.start_date);
    const endDate = new Date(understanding.temporal.end_date);

    games = games.filter(g => {
      if (!g.released) return false;
      const releaseDate = new Date(g.released);
      return releaseDate >= startDate && releaseDate <= endDate;
    });

    // Sort by release date descending (most recent first)
    games = games.sort((a, b) => {
      if (!a.released || !b.released) return 0;
      return new Date(b.released).getTime() - new Date(a.released).getTime();
    });

    console.log("[ALBUS] Client-side filtering:", games.length, "games in date range");
  }

  const tokens = estimateTokens(JSON.stringify(games.slice(0, 20)));
  return { games, tokens };
}

// ==================== STEP 4: RICH USER PROFILE ====================
async function fetchUserProfile(supabaseUrl: string, supabaseKey: string, userId: string): Promise<{ profile: UserProfile; tokens: number }> {
  if (!userId) {
    return {
      profile: {
        likedGames: [],
        averageRating: 0,
        reviews: [],
        summary: "Nouvel utilisateur, pas d'historique",
      },
      tokens: 0,
    };
  }

  try {
    const [signalsRes, commentsRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/game_signals?user_id=eq.${userId}&limit=100&signal_type=eq.like`, {
        headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
      }),
      fetch(`${supabaseUrl}/rest/v1/game_comments?user_id=eq.${userId}&limit=50`, {
        headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
      }),
    ]);

    const signals = signalsRes.ok ? await signalsRes.json() : [];
    const comments = commentsRes.ok ? await commentsRes.json() : [];

    let averageRating = 0;
    if (comments.length > 0) {
      const ratings = comments.map((c: any) => c.rating).filter((r: any) => r);
      averageRating = ratings.length > 0 ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10 : 0;
    }

    const profile: UserProfile = {
      likedGames: signals,
      averageRating: averageRating,
      reviews: comments,
      summary: `
USER PASSION (FACTIONY):
- A aimé ${signals.length} jeux
- Noté ${comments.length} jeux avec moyenne ${averageRating}/5
- Type de joueur: ${averageRating >= 4 ? "Exigeant (4+/5)" : averageRating >= 3 ? "Standard (3+/5)" : "Explorateur (tous genres)"}

Jeux aimés: ${signals.slice(0, 5).map((s: any) => `#${s.game_id}`).join(", ")}`,
    };

    const tokens = estimateTokens(JSON.stringify(profile));
    return { profile, tokens };
  } catch (e) {
    console.error("[ALBUS] User profile error:", e);
    return {
      profile: {
        likedGames: [],
        averageRating: 0,
        reviews: [],
        summary: "Erreur chargement profil",
      },
      tokens: 0,
    };
  }
}

// ==================== MAIN HANDLER ====================
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
  const RAWG_API_KEY = Deno.env.get("VITE_RAWG_API_KEY") || "11b490685c024c71a0c6562e37e1a87d";
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
  const userPseudo = (body?.user_pseudo ?? "").toString().trim();
  const userId = (body?.user_id ?? "").toString().trim();
  
  if (!query) {
    return jsonResponse({ error: "Missing query" }, 400, corsHeaders);
  }

  const tokenUsage: TokenUsage = {
    deep_understanding: 0,
    tool_selection: 0,
    web_search: 0,
    rawg_search: 0,
    user_data: 0,
    reasoning: 0,
    total: 0,
  };

  console.log("[ALBUS] 🤖 TRUE AGENTIC V4 FIXED (SMART DATE FILTERING) - Query:", query);

  // ==================== STEP 1: DEEP QUERY UNDERSTANDING ====================
  console.log("[ALBUS] Step 1: Deep Query Understanding...");
  const { understanding, tokens: understandingTokens } = await deepQueryUnderstanding(query, MISTRAL_API_KEY);
  tokenUsage.deep_understanding = understandingTokens;

  console.log("[ALBUS] Understanding:", understanding);

  if (understanding.type === "blocked") {
    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "blocked",
      answer: "Je suis Albus, assistant gaming IA. Je peux t'aider sur les jeux vidéo!",
    }, 200, corsHeaders);
  }

  // ==================== GAMEPLAY QUESTION ====================
  if (understanding.type === "gameplay") {
    const systemPrompt = `Tu es Albus, assistant gaming IA de Factiony.
Réponds à des questions gaming (boss, build, strat).
Conseils directs, pratiques. PAS D'ASTÉRISQUES.`;

    try {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: "Bearer " + MISTRAL_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "mistral-large-latest",
          temperature: 0.7,
          max_tokens: 800,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query },
          ],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const answer = json?.choices?.[0]?.message?.content ?? "";
        const clean = answer.replace(/\*\*?/g, "");
        tokenUsage.reasoning = estimateTokens(systemPrompt + query + answer);
        tokenUsage.total = tokenUsage.deep_understanding + tokenUsage.reasoning;

        return jsonResponse({
          query, user_pseudo: userPseudo, mode: "gameplay",
          answer: clean, tokens_used: tokenUsage,
        }, 200, corsHeaders);
      }
    } catch (e) {
      console.error("[ALBUS] Gameplay error:", e);
    }
  }

  // ==================== STEP 2: PARALLEL EXECUTION ====================
  console.log("[ALBUS] Step 2: Parallel Execution (Web + RAWG + Factiony)...");

  const [webData, rawgData, userProfileData] = await Promise.all([
    intelligentWebSearch(understanding, query, MISTRAL_API_KEY),
    intelligentRawgSearch(understanding, RAWG_API_KEY),
    fetchUserProfile(SUPABASE_URL, SUPABASE_ANON_KEY, userId),
  ]);

  tokenUsage.web_search = webData.tokens;
  tokenUsage.rawg_search = rawgData.tokens;
  tokenUsage.user_data = userProfileData.tokens;

  console.log("[ALBUS] Web Results:", webData.results ? "✅" : "❌");
  console.log("[ALBUS] RAWG Games:", rawgData.games.length);
  console.log("[ALBUS] User Profile:", userProfileData.profile.likedGames.length, "likes");

  if (rawgData.games.length === 0 && !webData.results) {
    // Fallback: si recherche temporelle stricte, élargir
    if (understanding.temporal.start_date) {
      return jsonResponse({
        query, user_pseudo: userPseudo, mode: "recommendation",
        recommendations: [],
        personal_message: `Aucun jeu trouvé pour ${understanding.temporal.label}. Essaie une période plus large!`,
      }, 200, corsHeaders);
    }

    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation",
      recommendations: [],
      personal_message: "Aucun jeu trouvé. Essaie d'autres critères!",
    }, 200, corsHeaders);
  }

  // ==================== STEP 3: FINAL INTELLIGENT REASONING ====================
  console.log("[ALBUS] Step 3: Final Reasoning + Synthesis...");

  // Filter by rating ONLY if NOT temporal search
  // Temporal searches include all games (even new ones with no rating yet)
  const filteredGames = understanding.temporal.start_date
    ? rawgData.games.slice(0, 15) // Temporal: include all, no rating filter
    : rawgData.games.filter(g => g.rating >= 3.5).slice(0, 15); // General: only good ratings

  const gamesData = filteredGames.map((g: any) => ({
    name: g.name,
    slug: g.slug,
    id: g.id,
    genres: (g.genres || []).map((x: any) => x.name).join(", "),
    rating: g.rating || "N/A",
    released: g.released,
  }));

  const reasoningPrompt = `Tu es Albus. Tu as COMPRIS profondément ce que l'user demande. Maintenant FUSIONNE et RECOMMANDE intelligemment:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 CE QUE TU AS COMPRIS:
- Type: ${understanding.type}
- Intent: ${understanding.intent} (${understanding.context})
- User Mindset: ${understanding.user_mindset}
- Cherche: ${understanding.themes.join(", ") || "jeux généralement"}
${understanding.comparisons.length > 0 ? `- Comparaisons: ${understanding.comparisons.join(", ")}` : ""}
- Temporal: ${understanding.temporal.label}
- Ordering: ${understanding.temporal.start_date ? "Par date (récent d'abord)" : "Par note (meilleur d'abord)"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 DONNÉES INTERNET (si actuelles):
${webData.results || "Pas de données internet récentes"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 JEUX RAWG (${gamesData.length} disponibles, déjà triés):
${JSON.stringify(gamesData.slice(0, 12))}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 PROFIL UTILISATEUR (FACTIONY):
${userProfileData.profile.summary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TASK:
1. FUSIONNE Web + RAWG + User profile intelligemment
2. Applique ta compréhension (user mindset = ${understanding.user_mindset}, intent = ${understanding.intent})
3. Jeux déjà triés par ${understanding.temporal.start_date ? "date" : "rating"} → respecte cet ordre
4. Si comparaisons → explique pourquoi c'est similaire/différent
5. Recommande 1-3 jeux EXPLIQUANT pourquoi C'EST BON POUR CET USER SPÉCIFIQUE
6. Puis 1 question courte

CRITÈRES:
- Les jeux sont déjà filtrés/triés correctement
- Match PROFOND avec user mindset (casual/hardcore/explorer)
- Match avec context cherché
- Dates pertinentes si temporel

Format:
🎮 [Nom du jeu]
Description courte (POURQUOI c'est bon POUR LUI spécifiquement)
[Genres] - ${understanding.temporal.start_date ? "[Date sortie]" : "[Rating]/5"}

Puis question.

⚠️ PAS D'ASTÉRISQUES. Texte simple. SOIS VRAIMENT INTELLIGENT.`;

  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + MISTRAL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.8,
        max_tokens: 1200,
        messages: [{ role: "user", content: reasoningPrompt }],
      }),
    });

    if (res.ok) {
      const json = await res.json();
      const raw = json?.choices?.[0]?.message?.content ?? "";
      tokenUsage.reasoning = estimateTokens(reasoningPrompt + raw);
      const cleanRaw = raw.replace(/\*\*?/g, "");

      const recommendations: any[] = [];
      const lines = cleanRaw.split("\n");
      let currentGame = null;
      let currentDescription = "";
      let found = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        const gameMatch = gamesData.find(g => trimmed.toLowerCase().includes(g.name.toLowerCase()) && trimmed.length < 100);

        if (gameMatch && found < 3) {
          if (currentGame && currentDescription) {
            recommendations.push({
              slug: currentGame.slug,
              title: currentGame.name,
              summary: currentDescription.trim(),
              why: currentGame.genres + " - " + (currentGame.rating === "N/A" ? "Nouvelle sortie" : currentGame.rating + "/5"),
              url: BASE_URL + "/game/" + currentGame.slug + "-" + currentGame.id,
            });
            found++;
            currentDescription = "";
          }
          currentGame = gameMatch;
        } else if (currentGame && trimmed.length > 5 && !trimmed.includes("?") && found < 3) {
          currentDescription += (currentDescription ? " " : "") + trimmed;
        }
      }

      if (currentGame && currentDescription && found < 3) {
        recommendations.push({
          slug: currentGame.slug,
          title: currentGame.name,
          summary: currentDescription.trim(),
          why: currentGame.genres + " - " + (currentGame.rating === "N/A" ? "Nouvelle sortie" : currentGame.rating + "/5"),
          url: BASE_URL + "/game/" + currentGame.slug + "-" + currentGame.id,
        });
      }

      const recs = recommendations.slice(0, 3);
      let questionText = "Lequel te tente?";
      const sentences = cleanRaw.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
      if (sentences.length > 0) {
        const last = sentences[sentences.length - 1].trim();
        if (last.length > 5 && last.length < 150) {
          questionText = last + (last.includes("?") ? "" : "?");
        }
      }

      tokenUsage.total =
        tokenUsage.deep_understanding +
        tokenUsage.web_search +
        tokenUsage.rawg_search +
        tokenUsage.user_data +
        tokenUsage.reasoning;

      console.log("[ALBUS] ✅ Recommendations:", recs.length, "| Tokens:", tokenUsage.total);

      return jsonResponse({
        query, user_pseudo: userPseudo, mode: "recommendation",
        recommendations: recs,
        personal_message: questionText,
        tokens_used: tokenUsage,
        understanding_data: understanding,
      }, 200, corsHeaders);
    }
  } catch (e) {
    console.error("[ALBUS] Reasoning error:", e);
    const top2 = gamesData.slice(0, 2);
    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation",
      recommendations: top2.map(g => ({
        slug: g.slug,
        title: g.name,
        summary: g.genres,
        why: g.genres + " - " + (g.rating === "N/A" ? "Nouvelle sortie" : g.rating + "/5"),
        url: BASE_URL + "/game/" + g.slug + "-" + g.id,
      })),
      personal_message: "Lequel te tente?",
    }, 200, corsHeaders);
  }
};

export const config = { path: "/api/ai-reco" };