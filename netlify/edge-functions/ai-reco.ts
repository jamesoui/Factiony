// netlify/edge-functions/ai-reco.ts - ALBUS AGENTIC (NO SUPABASE CLIENT)

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
  planning: number;
  rawg: number;
  web: number;
  reasoning: number;
  total: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

async function fetchUserData(supabaseUrl: string, supabaseKey: string, userId: string) {
  try {
    const [signalsRes, commentsRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/game_signals?user_id=eq.${userId}&limit=50`, {
        headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
      }),
      fetch(`${supabaseUrl}/rest/v1/game_comments?user_id=eq.${userId}&limit=20`, {
        headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
      }),
    ]);

    const signals = signalsRes.ok ? await signalsRes.json() : [];
    const comments = commentsRes.ok ? await commentsRes.json() : [];

    return {
      signals: signals || [],
      comments: comments || [],
      summary: `User likes ${signals?.length || 0} games, wrote ${comments?.length || 0} reviews`,
    };
  } catch (e) {
    console.error("[ALBUS] User data fetch error:", e);
    return { signals: [], comments: [], summary: "" };
  }
}

async function webSearch(query: string, mistralKey: string): Promise<string> {
  try {
    const searchPrompt = `Cherche rapidement: "${query}"\n\nRésume en 2-3 phrases les infos gaming pertinentes.`;

    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + mistralKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.5,
        max_tokens: 300,
        messages: [{ role: "user", content: searchPrompt }],
      }),
    });

    if (res.ok) {
      const json = await res.json();
      return json?.choices?.[0]?.message?.content ?? "";
    }
  } catch (e) {
    console.error("[ALBUS] Web search error:", e);
  }
  return "";
}

async function checkTokenLimit(supabaseUrl: string, supabaseKey: string, userId: string, tier: string, tokensNeeded: number): Promise<boolean> {
  if (!userId) return true;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/token_usage?user_id=eq.${userId}&month_start=gte.${monthStart.toISOString()}`, {
      headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` },
    });

    const data = res.ok ? await res.json() : [];
    const usage = data[0];
    const tokensUsed = usage?.tokens_used ?? 0;
    const limit = tier === "premium" ? 100000 : 15000;

    return tokensUsed + tokensNeeded <= limit;
  } catch (e) {
    console.error("[ALBUS] Token check error:", e);
    return true;
  }
}

async function recordTokenUsage(supabaseUrl: string, supabaseKey: string, userId: string, tokens: number) {
  if (!userId) return;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  try {
    await fetch(`${supabaseUrl}/rest/v1/token_usage`, {
      method: "POST",
      headers: { 
        "apikey": supabaseKey, 
        "Authorization": `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        month_start: monthStart.toISOString().split('T')[0],
        tokens_used: tokens,
      }),
    });
  } catch (e) {
    console.error("[ALBUS] Token recording error:", e);
  }
}

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

  const queryLower = query.toLowerCase();

  console.log("[ALBUS] Query:", query, "User:", userPseudo, "Tier:", tier);

  const gamingKeywords = [
    "jeu", "game", "gaming", "play", "jouer", "console", "ps5", "xbox", "switch", "pc",
    "coop", "multiplayer", "solo", "rpg", "action", "stratégie", "adventure", "puzzle",
    "shooter", "racing", "horror", "indie", "boss", "level", "build", "strat",
    "battre", "beat", "defeat", "skill", "technique", "playstation", "nintendo", "steam",
    "2 joueurs", "à 2", "à deux", "joueur à", "en coop", "coopératif", "multijoueur",
  ];

  const isGamingQuestion = gamingKeywords.some(word => queryLower.includes(word));

  if (!isGamingQuestion) {
    return jsonResponse({ query, user_pseudo: userPseudo, mode: "blocked", answer: "Je suis Albus, assistant gaming IA. Je peux t'aider sur les jeux vidéo!" }, 200, corsHeaders);
  }

  const gameplayKeywords = ["battre", "beat", "boss", "strat", "stratégie", "strategy", "build", "comment", "skill", "technique", "conseil", "tip", "trick", "guide"];
  const isGameplayQuestion = gameplayKeywords.some(word => queryLower.includes(word));

  if (isGameplayQuestion) {
    return handleGameplayQuestion(query, userPseudo, userId, tier, MISTRAL_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, BASE_URL, corsHeaders);
  } else {
    return handleRecommendationAgent(query, userPseudo, userId, tier, RAWG_API_KEY, MISTRAL_API_KEY, BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, corsHeaders);
  }
};

async function handleGameplayQuestion(query: string, userPseudo: string, userId: string, tier: string, mistralKey: string, supabaseUrl: string, supabaseKey: string, baseUrl: string, corsHeaders: Record<string, string>) {
  const systemPrompt = `Tu es Albus, assistant gaming IA de Factiony.

RÈGLES:
- Réponds à des questions gaming (boss, build, strat)
- Conseils directs, pratiques
- PAS D'ASTÉRISQUES
- Si tu mentionnes un jeu, inclus le lien: [Nom](${baseUrl}/game/slug-id)
- Pose UNE question de suivi`;

  const userPrompt = "Question: " + query + "\nRéponds directement.";

  try {
    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + mistralKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.7,
        max_tokens: 800,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!mistralRes.ok) throw new Error("Mistral error");
    const mistralJson = await mistralRes.json();
    const response = mistralJson?.choices?.[0]?.message?.content ?? "";
    const cleanResponse = response.replace(/\*\*?/g, "");

    const tokensUsed = estimateTokens(userPrompt + response);
    if (userId) await recordTokenUsage(supabaseUrl, supabaseKey, userId, tokensUsed);

    return jsonResponse({ query, user_pseudo: userPseudo, mode: "gameplay", answer: cleanResponse, tokens_used: tokensUsed }, 200, corsHeaders);
  } catch (e) {
    console.error("[ALBUS] Gameplay error:", e);
    return jsonResponse({ query, user_pseudo: userPseudo, mode: "gameplay", answer: "Erreur. Réessaie." }, 200, corsHeaders);
  }
}

async function handleRecommendationAgent(query: string, userPseudo: string, userId: string, tier: string, rawgKey: string, mistralKey: string, baseUrl: string, supabaseUrl: string, supabaseKey: string, corsHeaders: Record<string, string>) {
  const queryLower = query.toLowerCase();
  const tokenUsage: TokenUsage = { planning: 0, rawg: 0, web: 0, reasoning: 0, total: 0 };

  const estimatedTokens = tier === "premium" ? 3500 : 1700;
  const hasTokens = await checkTokenLimit(supabaseUrl, supabaseKey, userId, tier, estimatedTokens);

  if (!hasTokens) {
    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation",
      error: "token_limit_exceeded",
      message: "Token limit atteint ce mois. Upgrade à premium pour illimité!",
    }, 429, corsHeaders);
  }

  console.log("[ALBUS] Step 1: Planning...");

  const planningPrompt = `Tu es Albus. Plan pour recommander les meilleurs jeux.

Requête: "${query}"

Crée un PLAN:
tags:tag1,tag2
platform:ps5
search:keywords
quality:3.5`;

  let parsedTags: string[] = [];
  let platformId = null;
  let searchKeywords = "";

  try {
    const planRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + mistralKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.5,
        max_tokens: 150,
        messages: [{ role: "user", content: planningPrompt }],
      }),
    });

    if (planRes.ok) {
      const planJson = await planRes.json();
      const plan = planJson?.choices?.[0]?.message?.content ?? "";
      tokenUsage.planning = estimateTokens(planningPrompt + plan);

      const tagsMatch = plan.match(/tags:([^\n]+)/);
      if (tagsMatch) {
        const tagNames = tagsMatch[1].split(",").map((t: string) => t.trim());
        parsedTags = tagNames
          .map((tag: string) => TAG_IDS[tag])
          .filter((id: any) => id !== undefined)
          .map((id: number) => id.toString());
      }

      const platformMatch = plan.match(/platform:(\w+)/);
      if (platformMatch) {
        const p = platformMatch[1].toLowerCase();
        if (p.includes("ps5")) platformId = "187";
        else if (p.includes("xbox")) platformId = "186";
        else if (p.includes("switch")) platformId = "7";
        else if (p.includes("pc")) platformId = "4";
      }

      const searchMatch = plan.match(/search:([^\n]+)/);
      if (searchMatch) searchKeywords = searchMatch[1].trim();
    }
  } catch (e) {
    console.error("[ALBUS] Planning error:", e);
  }

  if (!parsedTags.length) {
    for (const [keyword, id] of Object.entries(TAG_IDS)) {
      if (queryLower.includes(keyword)) {
        parsedTags = [id.toString()];
        break;
      }
    }
  }

  if (!platformId && queryLower.includes("ps5")) platformId = "187";
  else if (!platformId && queryLower.includes("xbox")) platformId = "186";
  else if (!platformId && queryLower.includes("switch")) platformId = "7";
  else if (!platformId && queryLower.includes("pc")) platformId = "4";

  console.log("[ALBUS] Step 2: Fetching user data...");
  
  const userData = userId ? await fetchUserData(supabaseUrl, supabaseKey, userId) : { signals: [], comments: [], summary: "" };
  tokenUsage.rawg = estimateTokens(JSON.stringify(userData));

  console.log("[ALBUS] Step 3: Searching RAWG...");

  const rawgParams = new URLSearchParams();
  rawgParams.set("key", rawgKey);
  rawgParams.set("page_size", "50");
  rawgParams.set("ordering", "-rating");
  if (platformId) rawgParams.set("platforms", platformId);
  if (parsedTags.length > 0) rawgParams.set("tags", parsedTags.join(","));
  if (searchKeywords) rawgParams.set("search", searchKeywords);

  let rawgGames: any[] = [];
  try {
    const rawgUrl = "https://api.rawg.io/api/games?" + rawgParams.toString();
    const rawgRes = await fetch(rawgUrl);
    if (rawgRes.ok) {
      const rawgData = await rawgRes.json();
      rawgGames = rawgData.results || [];
      tokenUsage.rawg += estimateTokens(JSON.stringify(rawgGames.slice(0, 20)));
    }
  } catch (e) {
    console.error("[ALBUS] RAWG error:", e);
  }

  if (rawgGames.length === 0) {
    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation",
      recommendations: [],
      personal_message: "Aucun jeu trouvé. Essaie d'autres mots-clés!",
    }, 200, corsHeaders);
  }

  console.log("[ALBUS] Step 4: Web search...");
  
  let webContext = "";
  if (rawgGames.length < 5) {
    webContext = await webSearch(`${query} games review recommendations`, mistralKey);
    tokenUsage.web = estimateTokens(webContext);
  }

  console.log("[ALBUS] Step 5: Reasoning...");

  const filteredGames = rawgGames
    .filter(g => g.rating >= 3.5)
    .slice(0, 15);

  const gamesData = filteredGames.map((g: any) => ({
    name: g.name,
    slug: g.slug,
    id: g.id,
    genres: (g.genres || []).map((x: any) => x.name).join(", "),
    rating: g.rating,
  }));

  const reasoningPrompt = `Tu es Albus. Recommande 1-3 meilleurs jeux.

Requête: "${query}"
Données utilisateur: ${userData.summary}
Web context: ${webContext || "N/A"}
Jeux disponibles: ${JSON.stringify(gamesData)}

Format:
1. Nom du jeu
Description (pourquoi)
Genre - Rating/5

Puis une question courte. SANS ASTÉRISQUES.`;

  try {
    const reasonRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + mistralKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.8,
        max_tokens: 1200,
        messages: [{ role: "user", content: reasoningPrompt }],
      }),
    });

    if (!reasonRes.ok) throw new Error("Mistral error");
    const reasonJson = await reasonRes.json();
    const raw = reasonJson?.choices?.[0]?.message?.content ?? "";
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
            url: baseUrl + "/game/" + currentGame.slug + "-" + currentGame.id,
          });
          found++;
          currentDescription = "";
        }
        currentGame = gameMatch;
      } else if (currentGame && trimmed.length > 5 && !trimmed.includes("?") && !trimmed.includes("Lien") && found < 3) {
        currentDescription += (currentDescription ? " " : "") + trimmed;
      }
    }
    
    if (currentGame && currentDescription && found < 3) {
      recommendations.push({
        slug: currentGame.slug,
        title: currentGame.name,
        summary: currentDescription.trim(),
        why: currentGame.genres + " - " + currentGame.rating + "/5",
        url: baseUrl + "/game/" + currentGame.slug + "-" + currentGame.id,
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

    tokenUsage.total = tokenUsage.planning + tokenUsage.rawg + tokenUsage.web + tokenUsage.reasoning;
    
    if (userId) await recordTokenUsage(supabaseUrl, supabaseKey, userId, tokenUsage.total);

    const summaryText = recs.map(r => r.title + " (" + r.why + ")").join(" / ");

    console.log("[ALBUS] ✅ Recommandations générées:", recs.length, "jeux | Tokens:", tokenUsage.total);

    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation",
      recommendations: recs,
      short_summary: summaryText,
      personal_message: questionText,
      tokens_used: tokenUsage,
    }, 200, corsHeaders);
  } catch (e) {
    console.error("[ALBUS] Reasoning error:", e);
    const top2 = gamesData.slice(0, 2).map((g: any) => ({
      slug: g.slug,
      title: g.name,
      summary: g.genres,
      why: g.genres + " - " + g.rating + "/5",
      url: baseUrl + "/game/" + g.slug + "-" + g.id,
    }));
    
    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation",
      recommendations: top2,
      personal_message: "Lequel te tente?",
    }, 200, corsHeaders);
  }
}

export const config = { path: "/api/ai-reco" };