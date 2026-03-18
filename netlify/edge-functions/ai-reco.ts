// netlify/edge-functions/ai-reco.ts

import { createClient } from "@supabase/supabase-js";

function jsonResponse(body: any, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

// RAWG Tag IDs - THESE WORK
const TAG_IDS: Record<string, number> = {
  "coop": 7,
  "coopératif": 7,
  "cooperative": 7,
  "multiplayer": 7906,
  "multijoueur": 7906,
  "solo": 3368,
  "single-player": 3368,
  "rpg": 5,
  "action": 4,
  "strategy": 10,
  "stratégie": 10,
  "adventure": 11,
  "aventure": 11,
  "puzzle": 25,
  "shooter": 12,
  "racing": 1,
  "courses": 1,
  "sports": 2,
  "foot": 2,
  "football": 2,
  "soccer": 2,
  "horror": 40,
  "indie": 51,
  "indépendant": 51,
  "simulation": 14,
  "fighting": 6,
  "combat": 6,
};

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
  
  if (!query) {
    return jsonResponse({ error: "Missing query" }, 400, corsHeaders);
  }

  const queryLower = query.toLowerCase();
  console.log("[AI-RECO] Query:", query, "User:", userPseudo);

  // GAMING GATE
  const gamingKeywords = [
    "jeu", "game", "gaming", "play", "jouer", "console", "ps5", "xbox", "switch", "pc",
    "coop", "multiplayer", "solo", "rpg", "action", "stratégie", "adventure", "puzzle",
    "shooter", "racing", "horror", "indie", "boss", "level", "build", "strat",
    "battre", "beat", "defeat", "skill", "technique", "playstation", "nintendo", "steam",
  ];

  const isGamingQuestion = gamingKeywords.some(word => queryLower.includes(word));

  if (!isGamingQuestion) {
    return jsonResponse({ query, user_pseudo: userPseudo, mode: "blocked", answer: "Je suis spécialisé dans les jeux vidéo!" }, 200, corsHeaders);
  }

  // MODE DETECTION
  const gameplayKeywords = ["battre", "beat", "boss", "strat", "stratégie", "strategy", "build", "comment", "skill", "technique", "conseil", "tip", "trick", "guide"];
  const isGameplayQuestion = gameplayKeywords.some(word => queryLower.includes(word));

  if (isGameplayQuestion) {
    return handleGameplayQuestion(query, userPseudo, MISTRAL_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, corsHeaders);
  } else {
    return handleRecommendation(query, userPseudo, RAWG_API_KEY, MISTRAL_API_KEY, BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, corsHeaders);
  }
};

async function handleGameplayQuestion(query: string, userPseudo: string, mistralKey: string, supabaseUrl: string, supabaseKey: string, corsHeaders: Record<string, string>) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const systemPrompt = "Tu es Factiony AI, expert gaming. Réponds à des questions gaming (boss, build, strat). Conseils directs et utiles.";
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

    return jsonResponse({ query, user_pseudo: userPseudo, mode: "gameplay", answer: response }, 200, corsHeaders);
  } catch (e) {
    return jsonResponse({ query, user_pseudo: userPseudo, mode: "gameplay", answer: "Erreur. Réessaie." }, 200, corsHeaders);
  }
}

async function handleRecommendation(query: string, userPseudo: string, rawgKey: string, mistralKey: string, baseUrl: string, supabaseUrl: string, supabaseKey: string, corsHeaders: Record<string, string>) {
  const queryLower = query.toLowerCase();

  // Platform detection
  let platformId = null;
  if (queryLower.includes("ps5")) platformId = "187";
  else if (queryLower.includes("xbox")) platformId = "186";
  else if (queryLower.includes("switch")) platformId = "7";
  else if (queryLower.includes("pc")) platformId = "4";

  // Extract TAG ID
  let tagId = null;
  for (const [keyword, id] of Object.entries(TAG_IDS)) {
    if (queryLower.includes(keyword)) {
      tagId = id;
      break;
    }
  }

  // Clean search keywords
  let searchKeywords = queryLower
    .replace(/ps5|playstation|xbox|switch|pc|sur|on|à|pour|jeux|game|games|the|a|an|le|la|les|un|une|des|et|coop|multiplayer|solo|rpg|action|strategy|adventure|puzzle|shooter|racing|horror|indie/gi, "")
    .trim();

  console.log("[AI-RECO] Platform:", platformId, "Tag ID:", tagId, "Search:", searchKeywords);

  // RAWG Query
  const rawgParams = new URLSearchParams();
  rawgParams.set("key", rawgKey);
  rawgParams.set("page_size", "50");
  rawgParams.set("ordering", "-rating");
  if (platformId) rawgParams.set("platforms", platformId);
  if (tagId) rawgParams.set("tags", tagId.toString());
  if (searchKeywords) rawgParams.set("search", searchKeywords);

  let rawgGames: any[] = [];
  try {
    const rawgUrl = "https://api.rawg.io/api/games?" + rawgParams.toString();
    console.log("[AI-RECO] RAWG URL:", rawgUrl);
    const rawgRes = await fetch(rawgUrl);
    if (rawgRes.ok) {
      const rawgData = await rawgRes.json();
      rawgGames = rawgData.results || [];
      console.log("[AI-RECO] RAWG returned", rawgGames.length, "games");
    }
  } catch (e) {
    console.error("[AI-RECO] RAWG error:", e);
  }

  if (rawgGames.length === 0) {
    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation",
      recommendations: [],
      short_summary: "Aucun jeu trouvé. Essaie d'autres mots-clés!",
      personal_message: "Aucun jeu trouvé.",
    }, 200, corsHeaders);
  }

  const systemPrompt = "Tu es Factiony AI. Recommande EXACTEMENT 3 jeux.\n\nFormat:\n1. Titre du jeu\nDescription (2-3 lignes) pourquoi ça match\n\n2. Titre du jeu\nDescription...\n\n3. Titre du jeu\nDescription...\n\nAprès: question engageante. SANS EMOJI.";

  const gamesData = rawgGames.slice(0, 20).map((g: any) => ({
    name: g.name,
    genres: (g.genres || []).map((x: any) => x.name).join(", "),
    rating: g.rating,
  }));

  const userPrompt = "Demande: " + query + "\n\nJeux (top rated):\n" + JSON.stringify(gamesData, null, 2) + "\n\nRecommande 3 jeux avec descriptions claires. Puis une question.";

  try {
    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + mistralKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.8,
        max_tokens: 1000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!mistralRes.ok) throw new Error("Mistral error");
    const mistralJson = await mistralRes.json();
    const raw = mistralJson?.choices?.[0]?.message?.content ?? "";

    // Extract 3 games
    const recommendations: any[] = [];
    const lines = raw.split("\n");
    let currentGame = null;
    let currentDescription = "";
    let found = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      const gameMatch = rawgGames.find(g => trimmed.toLowerCase().includes(g.name.toLowerCase()) && trimmed.length < 100);
      
      if (gameMatch && found < 3) {
        if (currentGame && currentDescription) {
          recommendations.push({
            slug: currentGame.slug,
            title: currentGame.name,
            summary: currentDescription.trim(),
            why: (currentGame.genres || []).slice(0, 2).map((x: any) => typeof x === "string" ? x : x.name).join(", ") + " - " + currentGame.rating + "/5",
            url: baseUrl + "/game/" + currentGame.slug + "-" + currentGame.id,
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
        why: (currentGame.genres || []).slice(0, 2).map((x: any) => typeof x === "string" ? x : x.name).join(", ") + " - " + currentGame.rating + "/5",
        url: baseUrl + "/game/" + currentGame.slug + "-" + currentGame.id,
      });
    }

    if (recommendations.length < 3) {
      const missing = 3 - recommendations.length;
      recommendations.push(...rawgGames.slice(recommendations.length, recommendations.length + missing).map((g: any) => ({
        slug: g.slug,
        title: g.name,
        summary: (g.genres || []).slice(0, 2).map((x: any) => typeof x === "string" ? x : x.name).join(", "),
        why: (g.genres || []).slice(0, 2).map((x: any) => typeof x === "string" ? x : x.name).join(", ") + " - " + g.rating + "/5",
        url: baseUrl + "/game/" + g.slug + "-" + g.id,
      })));
    }

    const recs = recommendations.slice(0, 3);
    let summaryText = recs.map(r => r.title + " (" + r.why + ")").join(" / ");
    
    let questionText = "Lequel te tente?";
    const sentences = raw.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    if (sentences.length > 0) {
      const last = sentences[sentences.length - 1].trim();
      if (last.length > 5 && last.length < 150) questionText = last + "?";
    }

    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation",
      recommendations: recs,
      short_summary: summaryText,
      personal_message: questionText,
    }, 200, corsHeaders);
  } catch (e) {
    console.error("[AI-RECO] Mistral error:", e);
    const top3 = rawgGames.slice(0, 3).map((g: any) => ({
      slug: g.slug,
      title: g.name,
      summary: (g.genres || []).slice(0, 2).map((x: any) => typeof x === "string" ? x : x.name).join(", "),
      why: (g.genres || []).slice(0, 2).map((x: any) => typeof x === "string" ? x : x.name).join(", ") + " - " + g.rating + "/5",
      url: baseUrl + "/game/" + g.slug + "-" + g.id,
    }));
    
    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation",
      recommendations: top3,
      short_summary: top3.map(r => r.title + " (" + r.why + ")").join(" / "),
      personal_message: "Lequel te tente?",
    }, 200, corsHeaders);
  }
}

export const config = { path: "/api/ai-reco" };