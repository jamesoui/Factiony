// netlify/edge-functions/ai-reco.ts - TRUE AGENTIC ALBUS V5 (WEB FOR ALL + PARALLEL)

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
    const timeout = setTimeout(() => controller.abort(), 10000);

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

// ==================== WEB SEARCH (tous les types) ====================
async function intelligentWebSearch(understanding: QueryUnderstanding, query: string, mistralKey: string): Promise<{ results: string; tokens: number }> {
  // Gameplay → toujours (builds/patches/meta changent)
  // Recommendation temporelle → toujours
  // Recommendation all_time → inutile
  if (!understanding.temporal.needs_current_data) {
    return { results: "", tokens: 0 };
  }

  let searchQuery = query;
  if (understanding.type === "gameplay") {
    searchQuery = `${query} guide 2026`;
  } else if (understanding.temporal.label !== "all_time") {
    searchQuery += ` ${understanding.temporal.label} 2026`;
  }

  const prompt = `Cherche: "${searchQuery}"

${understanding.type === "gameplay"
    ? `Résume EN FRANÇAIS en 3-4 phrases les infos gaming utiles:
1. Stratégies/builds recommandés
2. Patches récents qui changent la meta
3. Conseils communauté
4. Tier lists ou rankings si pertinents`
    : `Résume EN FRANÇAIS en 3-4 phrases les infos gaming pertinentes:
1. Jeux trouvés avec dates
2. Plateformes disponibles
3. Avis/scores pertinents
4. Contexte (découvertes, buzz)`}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + mistralKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-small-latest",
        temperature: 0.5,
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const text = json?.choices?.[0]?.message?.content ?? "";
      return { results: text, tokens: estimateTokens(prompt + text) };
    }
  } catch (e) {
    console.error("[ALBUS] Web search timeout/error:", e);
  }

  return { results: "", tokens: 0 };
}

// ==================== RAWG SEARCH ====================
async function intelligentRawgSearch(understanding: QueryUnderstanding, rawgKey: string): Promise<{ games: any[]; tokens: number }> {
  // RAWG inutile pour gameplay
  if (understanding.type === "gameplay") {
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

  if (understanding.platforms?.length > 0) {
    const platformMap: Record<string, string> = {
      "ps5": "187", "playstation": "187",
      "xbox": "186", "xbox series": "186",
      "switch": "7", "nintendo": "7",
      "pc": "4",
    };
    for (const p of understanding.platforms) {
      if (platformMap[p.toLowerCase()]) platformIds.push(platformMap[p.toLowerCase()]);
    }
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
    console.log("[ALBUS] Client-side filtering:", games.length, "games in date range");
  }

  return { games, tokens: estimateTokens(JSON.stringify(games.slice(0, 20))) };
}

// ==================== USER PROFILE ====================
async function fetchUserProfile(supabaseUrl: string, supabaseKey: string, userId: string, queryType: string): Promise<{ profile: UserProfile; tokens: number }> {
  if (queryType === "gameplay" || !userId) {
    return { profile: { likedGames: [], averageRating: 0, reviews: [], summary: "N/A" }, tokens: 0 };
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
      averageRating = ratings.length > 0
        ? Math.round((ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) * 10) / 10
        : 0;
    }

    const profile: UserProfile = {
      likedGames: signals, averageRating, reviews: comments,
      summary: `
USER PASSION (FACTIONY):
- A aimé ${signals.length} jeux
- Noté ${comments.length} jeux avec moyenne ${averageRating}/5
- Type de joueur: ${averageRating >= 4 ? "Exigeant (4+/5)" : averageRating >= 3 ? "Standard (3+/5)" : "Explorateur (tous genres)"}
Jeux aimés: ${signals.slice(0, 5).map((s: any) => `#${s.game_id}`).join(", ")}`,
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
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
  const RAWG_API_KEY = Deno.env.get("VITE_RAWG_API_KEY") || "11b490685c024c71a0c6562e37e1a87d";
  const BASE_URL = Deno.env.get("FACTIONY_BASE_URL") ?? "https://factiony.com";

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !MISTRAL_API_KEY) {
    return jsonResponse({ error: "Missing env vars" }, 500, corsHeaders);
  }

  let body: any;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: "Invalid JSON" }, 400, corsHeaders); }

  const query = (body?.query ?? "").toString().trim();
  const userPseudo = (body?.user_pseudo ?? "").toString().trim();
  const userId = (body?.user_id ?? "").toString().trim();

  if (!query) return jsonResponse({ error: "Missing query" }, 400, corsHeaders);

  const tokenUsage: TokenUsage = {
    deep_understanding: 0, web_search: 0, rawg_search: 0,
    user_data: 0, reasoning: 0, total: 0,
  };

  console.log("[ALBUS] 🤖 TRUE AGENTIC V5 - Query:", query);

  // ==================== STEP 1: UNDERSTANDING ====================
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

  // ==================== STEP 2: PARALLEL ====================
  console.log("[ALBUS] Step 2: Parallel Execution...");
  console.log("[ALBUS] Web:", understanding.temporal.needs_current_data ? "✅" : "❌", "| RAWG:", understanding.type === "recommendation" ? "✅" : "❌");

  const [webData, rawgData, userProfileData] = await Promise.all([
    intelligentWebSearch(understanding, query, MISTRAL_API_KEY),
    intelligentRawgSearch(understanding, RAWG_API_KEY),
    fetchUserProfile(SUPABASE_URL, SUPABASE_ANON_KEY, userId, understanding.type),
  ]);

  tokenUsage.web_search = webData.tokens;
  tokenUsage.rawg_search = rawgData.tokens;
  tokenUsage.user_data = userProfileData.tokens;

  console.log("[ALBUS] Web:", webData.results ? "✅" : "❌", "| RAWG:", rawgData.games.length, "games | Profile:", userProfileData.profile.likedGames.length, "likes");

  // ==================== STEP 3: REASONING ====================
  console.log("[ALBUS] Step 3: Final Reasoning...");

  // ---- GAMEPLAY ----
  if (understanding.type === "gameplay") {
    const systemPrompt = `Tu es Albus, assistant gaming IA expert de Factiony.
Réponds aux questions gaming (boss, build, strat, équipement, guide).
Tu as accès aux données web récentes ci-dessous.
Conseils directs, pratiques, précis. PAS D'ASTÉRISQUES.`;

    const userPrompt = `Question: ${query}

${webData.results ? `DONNÉES WEB RÉCENTES:\n${webData.results}` : "Pas de données web disponibles, réponds avec tes connaissances."}

Réponds avec les meilleures stratégies/builds/conseils. Sois précis et actionnable.`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: "Bearer " + MISTRAL_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "mistral-large-latest",
          temperature: 0.7,
          max_tokens: 1000,
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

        return jsonResponse({
          query, user_pseudo: userPseudo, mode: "gameplay",
          answer: clean, tokens_used: tokenUsage,
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

📱 DONNÉES WEB:
${webData.results || "Pas de données web"}

🎮 JEUX RAWG (${gamesData.length} dispo, triés par ${understanding.temporal.start_date ? "date" : "rating"}):
${JSON.stringify(gamesData.slice(0, 12))}

👤 PROFIL USER:
${userProfileData.profile.summary}

📋 TASK:
1. FUSIONNE Web + RAWG + User profile
2. Recommande 1-3 jeux en expliquant pourquoi c'est bon POUR CET USER
3. Pose 1 question courte après

Format:
🎮 [Nom du jeu]
Description (POURQUOI pour lui spécifiquement)
[Genres] - ${understanding.temporal.start_date ? "[Date sortie]" : "[Rating]/5"}

⚠️ PAS D'ASTÉRISQUES. Texte simple.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: "Bearer " + MISTRAL_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.8,
        max_tokens: 1500,
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
        const gameMatch = gamesData.find((g: any) =>
          trimmed.toLowerCase().includes(g.name.toLowerCase()) && trimmed.length < 100
        );

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

      tokenUsage.total = Object.values(tokenUsage).reduce((a, b) => a + b, 0);
      console.log("[ALBUS] ✅ Recs:", recs.length, "| Tokens:", tokenUsage.total);

      return jsonResponse({
        query, user_pseudo: userPseudo, mode: "recommendation",
        recommendations: recs,
        personal_message: questionText,
        tokens_used: tokenUsage,
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