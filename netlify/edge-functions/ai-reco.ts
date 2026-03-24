// netlify/edge-functions/ai-reco.ts - TRUE AGENTIC ALBUS V3 (OPTIMIZED - NO MERGE STEP)

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
  intent_recognition: number;
  web_search: number;
  rawg_search: number;
  user_data: number;
  reasoning: number;
  total: number;
}

interface Intent {
  type: "recommendation" | "gameplay" | "blocked";
  temporal: "this_week" | "recent" | "all_time" | "now";
  needs_current_data: boolean;
  platform?: string;
  genres?: string[];
  keywords?: string;
}

interface UserProfile {
  likedGames: any[];
  favoriteGenres: string[];
  averageRating: number;
  reviews: any[];
  summary: string;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ==================== STEP 1: INTENT RECOGNITION ====================
async function recognizeIntent(query: string, mistralKey: string): Promise<{ intent: Intent; tokens: number }> {
  const prompt = `Tu es un agent IA gaming. Analyse cette requête et extrais l'INTENT.

Requête: "${query}"

RÉPONDS EN JSON UNIQUEMENT:
{
  "type": "recommendation|gameplay|blocked",
  "temporal": "this_week|recent|all_time|now",
  "needs_current_data": true|false,
  "platform": "ps5|xbox|switch|pc|null",
  "genres": ["rpg", "action"]
}

RÈGLES:
- type="recommendation" si cherche des jeux
- type="gameplay" si question technique (boss, build, strat)
- type="blocked" si pas gaming
- temporal="this_week" si dit "cette semaine", "nouveautés", "sorties"
- temporal="recent" si "derniers", "nouveaux"
- temporal="all_time" si pas de temps mentionné
- needs_current_data=true si demande info ACTUELLE (cette semaine, prix actuels, etc)`;

  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + mistralKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0,
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (res.ok) {
      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content ?? "{}";
      const tokens = estimateTokens(prompt + text);
      
      try {
        const parsed = JSON.parse(text);
        return { intent: parsed, tokens };
      } catch (e) {
        console.error("[ALBUS] Intent parse error:", text);
        return { intent: { type: "recommendation", temporal: "all_time", needs_current_data: false }, tokens };
      }
    }
  } catch (e) {
    console.error("[ALBUS] Intent recognition error:", e);
  }

  return { intent: { type: "recommendation", temporal: "all_time", needs_current_data: false }, tokens: 0 };
}

// ==================== STEP 2: INTELLIGENT WEB SEARCH ====================
async function intelligentWebSearch(query: string, intent: Intent, mistralKey: string): Promise<{ results: string; tokens: number }> {
  if (!intent.needs_current_data) {
    return { results: "", tokens: 0 };
  }

  let searchQuery = query;
  if (intent.temporal === "this_week") {
    searchQuery += " released March 2026";
  }
  if (intent.platform) {
    searchQuery += " " + intent.platform;
  }

  const prompt = `Cherche: "${searchQuery}"

Résume EN FRANÇAIS en 3-4 phrases:
1. Jeux trouvés
2. Dates de sortie si pertinent
3. Plateformes disponibles
4. Avis/scores`;

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

// ==================== STEP 3: SMART RAWG SEARCH ====================
async function smartRawgSearch(query: string, intent: Intent, rawgKey: string): Promise<{ games: any[]; tokens: number }> {
  const queryLower = query.toLowerCase();
  let parsedTags: string[] = [];
  let platformId = null;
  let searchKeywords = query;

  if (intent.genres && intent.genres.length > 0) {
    parsedTags = intent.genres
      .map((g: string) => TAG_IDS[g])
      .filter((id: any) => id !== undefined)
      .map((id: number) => id.toString());
  }

  if (intent.platform) {
    if (intent.platform.includes("ps5")) platformId = "187";
    else if (intent.platform.includes("xbox")) platformId = "186";
    else if (intent.platform.includes("switch")) platformId = "7";
    else if (intent.platform.includes("pc")) platformId = "4";
  }

  if (!parsedTags.length) {
    for (const [keyword, id] of Object.entries(TAG_IDS)) {
      if (queryLower.includes(keyword)) {
        parsedTags = [id.toString()];
        break;
      }
    }
  }

  const rawgParams = new URLSearchParams();
  rawgParams.set("key", rawgKey);
  rawgParams.set("page_size", "50");
  rawgParams.set("ordering", "-rating");
  if (platformId) rawgParams.set("platforms", platformId);
  if (parsedTags.length > 0) rawgParams.set("tags", parsedTags.join(","));
  if (searchKeywords) rawgParams.set("search", searchKeywords);

  if (intent.temporal === "this_week") {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    rawgParams.set("dates", weekAgo + ",2026-12-31");
  }

  let games: any[] = [];
  try {
    const rawgUrl = "https://api.rawg.io/api/games?" + rawgParams.toString();
    const rawgRes = await fetch(rawgUrl);
    if (rawgRes.ok) {
      const rawgData = await rawgRes.json();
      games = rawgData.results || [];
    }
  } catch (e) {
    console.error("[ALBUS] RAWG error:", e);
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
        favoriteGenres: [],
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
      favoriteGenres: [],
      averageRating: averageRating,
      reviews: comments,
      summary: `
USER PASSION (FACTIONY):
- A aimé ${signals.length} jeux
- Noté ${comments.length} jeux avec moyenne ${averageRating}/5
- Type de joueur: ${averageRating >= 4 ? "Exigeant (4+/5)" : averageRating >= 3 ? "Standard (3+/5)" : "Explorateur (tous les jeux)"}

Jeux aimés (derniers): ${signals.slice(0, 5).map((s: any) => `#${s.game_id}`).join(", ")}
Derniers avis: ${comments.slice(0, 3).map((c: any) => `"${c.content?.substring(0, 40)}..."`).join(" | ")}`,
    };

    const tokens = estimateTokens(JSON.stringify(profile));
    return { profile, tokens };
  } catch (e) {
    console.error("[ALBUS] User profile error:", e);
    return {
      profile: {
        likedGames: [],
        favoriteGenres: [],
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
  const tier = (body?.tier ?? "free").toString().trim();
  
  if (!query) {
    return jsonResponse({ error: "Missing query" }, 400, corsHeaders);
  }

  const tokenUsage: TokenUsage = {
    intent_recognition: 0,
    web_search: 0,
    rawg_search: 0,
    user_data: 0,
    reasoning: 0,
    total: 0,
  };

  console.log("[ALBUS] 🤖 TRUE AGENTIC V3 (OPTIMIZED) - Query:", query);

  // ==================== STEP 1: INTENT RECOGNITION ====================
  console.log("[ALBUS] Step 1: Intent Recognition...");
  const { intent, tokens: intentTokens } = await recognizeIntent(query, MISTRAL_API_KEY);
  tokenUsage.intent_recognition = intentTokens;

  console.log("[ALBUS] Intent:", intent);

  if (intent.type === "blocked") {
    return jsonResponse({ 
      query, user_pseudo: userPseudo, mode: "blocked", 
      answer: "Je suis Albus, assistant gaming IA. Je peux t'aider sur les jeux vidéo!" 
    }, 200, corsHeaders);
  }

  if (intent.type === "gameplay") {
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
        tokenUsage.total = tokenUsage.reasoning;

        return jsonResponse({
          query, user_pseudo: userPseudo, mode: "gameplay",
          answer: clean, tokens_used: tokenUsage,
        }, 200, corsHeaders);
      }
    } catch (e) {
      console.error("[ALBUS] Gameplay error:", e);
    }
  }

  // ==================== STEP 2: PARALLEL EXECUTION (Web + RAWG + Factiony) ====================
  console.log("[ALBUS] Step 2: Parallel Execution (Web + RAWG + Factiony)...");

  const [webData, rawgData, userProfileData] = await Promise.all([
    intelligentWebSearch(query, intent, MISTRAL_API_KEY),
    smartRawgSearch(query, intent, RAWG_API_KEY),
    fetchUserProfile(SUPABASE_URL, SUPABASE_ANON_KEY, userId),
  ]);

  tokenUsage.web_search = webData.tokens;
  tokenUsage.rawg_search = rawgData.tokens;
  tokenUsage.user_data = userProfileData.tokens;

  console.log("[ALBUS] Web Results:", webData.results ? "✅" : "❌");
  console.log("[ALBUS] RAWG Games:", rawgData.games.length);
  console.log("[ALBUS] User Profile:", userProfileData.profile.likedGames.length, "likes");

  if (rawgData.games.length === 0 && !webData.results) {
    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation",
      recommendations: [],
      personal_message: "Aucun jeu trouvé. Essaie d'autres mots-clés!",
    }, 200, corsHeaders);
  }

  // ==================== STEP 3: FINAL REASONING (Merge + Recommend in ONE step) ====================
  console.log("[ALBUS] Step 3: Final Reasoning + Recommendations...");

  const filteredGames = rawgData.games
    .filter(g => g.rating >= 3.5)
    .slice(0, 15);

  const gamesData = filteredGames.map((g: any) => ({
    name: g.name,
    slug: g.slug,
    id: g.id,
    genres: (g.genres || []).map((x: any) => x.name).join(", "),
    rating: g.rating,
    released: g.released,
  }));

  const reasoningPrompt = `Tu es Albus. FUSIONNE INTELLIGEMMENT ces 3 sources ET recommande 1-3 jeux:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 DONNÉES INTERNET (CETTE SEMAINE):
${webData.results || "Pas de données récentes"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮 JEUX RAWG (${gamesData.length} disponibles, rating >= 3.5):
${JSON.stringify(gamesData.slice(0, 12))}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 PROFIL UTILISATEUR (FACTIONY):
${userProfileData.profile.summary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 INTENT: temporal="${intent.temporal}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TASK:
1. FUSIONNE intelligemment Internet + RAWG + User profile
2. Si temporal=this_week → PRIORISE jeux sorties récentes (dates pertinentes)
3. Filtre par goûts utilisateur (note moyenne ${userProfileData.profile.averageRating}/5)
4. Recommande 1-3 jeux + EXPLIQUER pourquoi ILS MATCHENT PARFAITEMENT CET USER
5. Puis 1 question courte

CRITÈRES:
- Rating >= 3.5
- Match avec goûts user (genres favoris, note moyenne)
- Dates récentes si temporal=this_week
- Descriptions personnalisées ("Comme tu aimes...")

Format recommandation:
🎮 [Nom du jeu]
Description courte (pourquoi c'est BON POUR LUI)
[Genres] - [Rating]/5

Puis question.

⚠️ PAS D'ASTÉRISQUES. Texte simple.`;

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
              why: currentGame.genres + " - " + currentGame.rating + "/5",
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
          why: currentGame.genres + " - " + currentGame.rating + "/5",
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
        tokenUsage.intent_recognition +
        tokenUsage.web_search +
        tokenUsage.rawg_search +
        tokenUsage.user_data +
        tokenUsage.reasoning;

      console.log("[ALBUS] ✅ Recommendations:", recs.length, "| Tokens:", tokenUsage.total, "| Time: FAST");

      return jsonResponse({
        query, user_pseudo: userPseudo, mode: "recommendation",
        recommendations: recs,
        personal_message: questionText,
        tokens_used: tokenUsage,
        intent_data: intent,
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
        why: g.genres + " - " + g.rating + "/5",
        url: BASE_URL + "/game/" + g.slug + "-" + g.id,
      })),
      personal_message: "Lequel te tente?",
    }, 200, corsHeaders);
  }
};

export const config = { path: "/api/ai-reco" };