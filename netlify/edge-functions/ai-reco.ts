// netlify/edge-functions/ai-reco.ts

import { createClient } from "@supabase/supabase-js";

function jsonResponse(body: any, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
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
  
  if (!query) {
    return jsonResponse({ error: "Missing query" }, 400, corsHeaders);
  }

  const queryLower = query.toLowerCase();
  console.log("[AI-RECO] Query:", query, "User:", userPseudo);

  // ==================== GAMING GATE ====================
  const gamingKeywords = [
    "jeu", "game", "gaming", "play", "jouer", "console", "ps5", "xbox", "switch", "pc",
    "coop", "multiplayer", "solo", "rpg", "action", "stratégie", "adventure", "puzzle",
    "shooter", "racing", "horror", "indie", "boss", "level", "build", "strat", "stratégie",
    "battre", "beat", "defeat", "skill", "technique", "playstation", "nintendo", "steam",
    "elden ring", "baldur", "zelda", "mario", "fortnite", "valorant", "lol", "dota",
    "fifa", "nba", "madden", "nfl", "football", "soccer", "esport", "competitive",
    "farming", "grind", "quest", "mission", "achievement", "trailer", "gameplay", "walkthrough",
  ];

  const isGamingQuestion = gamingKeywords.some(word => queryLower.includes(word));

  if (!isGamingQuestion) {
    return jsonResponse(
      {
        query,
        user_pseudo: userPseudo,
        mode: "blocked",
        answer: "Je suis spécialisé dans les jeux vidéo! Je peux t'aider à trouver des jeux, comprendre des stratégies, ou répondre à des questions gaming. Essaie: 'jeux coop ps5', 'comment battre melania', 'meilleurs RPG 2026'",
      },
      200,
      corsHeaders
    );
  }

  // ==================== DETECT MODE ====================
  const gameplayKeywords = ["battre", "beat", "boss", "strat", "stratégie", "strategy", "build", "level up", "how to", "comment", "skill", "technique", "conseil", "tip", "trick", "farming", "grind", "walkthrough", "guide"];
  const isGameplayQuestion = gameplayKeywords.some(word => queryLower.includes(word));

  console.log("[AI-RECO] Mode:", isGameplayQuestion ? "GAMEPLAY" : "RECOMMENDATION");

  if (isGameplayQuestion) {
    return handleGameplayQuestion(query, userPseudo, MISTRAL_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, corsHeaders);
  } else {
    return handleRecommendation(query, userPseudo, RAWG_API_KEY, MISTRAL_API_KEY, BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, corsHeaders);
  }
};

async function handleGameplayQuestion(query: string, userPseudo: string, mistralKey: string, supabaseUrl: string, supabaseKey: string, corsHeaders: Record<string, string>) {
  console.log("[AI-RECO] GAMEPLAY MODE");

  const supabase = createClient(supabaseUrl, supabaseKey);

  let factinyContext = "";
  try {
    const { data: comments } = await supabase
      .from("game_comments")
      .select("game_id, content, rating")
      .limit(20);

    if (comments && comments.length > 0) {
      factinyContext = "Conseils communauté Factiony:\n" + comments.slice(0, 5).map((c: any) => c.content).join("\n");
    }
  } catch (e) {
    console.error("[AI-RECO] Factiony fetch error:", e);
  }

  const systemPrompt = "Tu es Factiony AI, expert gaming. L'utilisateur pose une question GAMING (boss, build, stratégie, guide).\n\nAide avec:\n1. Conseils directs et utiles\n2. Stratégies concrètes\n3. Tips de la communauté\n4. Pas de blabla\n\nSi question est hors gaming, refuse poliment.";

  const userPrompt = "Question: " + query + "\n\nContexte:\n" + factinyContext + "\n\nRéponds directement avec des conseils pratiques.";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      signal: controller.signal,
      method: "POST",
      headers: {
        Authorization: "Bearer " + mistralKey,
        "Content-Type": "application/json",
      },
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

    clearTimeout(timeoutId);

    if (!mistralRes.ok) throw new Error("Mistral " + mistralRes.status);

    const mistralJson = await mistralRes.json();
    const response = mistralJson?.choices?.[0]?.message?.content ?? "";

    return jsonResponse(
      {
        query,
        user_pseudo: userPseudo,
        mode: "gameplay",
        answer: response,
      },
      200,
      corsHeaders
    );
  } catch (e) {
    console.error("[AI-RECO] Gameplay error:", e);
    return jsonResponse(
      {
        query,
        user_pseudo: userPseudo,
        mode: "gameplay",
        answer: "Désolé, je n'ai pas pu trouver une réponse. Essaie de reformuler ta question!",
      },
      200,
      corsHeaders
    );
  }
}

async function handleRecommendation(query: string, userPseudo: string, rawgKey: string, mistralKey: string, baseUrl: string, supabaseUrl: string, supabaseKey: string, corsHeaders: Record<string, string>) {
  console.log("[AI-RECO] RECOMMENDATION MODE");

  const supabase = createClient(supabaseUrl, supabaseKey);
  const queryLower = query.toLowerCase();

  let platformId = null;
  
  if (queryLower.includes("ps5") || queryLower.includes("playstation 5")) {
    platformId = "187";
  } else if (queryLower.includes("xbox")) {
    platformId = "186";
  } else if (queryLower.includes("switch")) {
    platformId = "7";
  } else if (queryLower.includes("pc")) {
    platformId = "4";
  }

  let searchKeywords = queryLower
    .replace(/ps5|playstation|xbox|switch|pc|sur|on|à|pour|jeux|game|games|this|that|the|a|an|le|la|les|un|une|des|et/gi, "")
    .trim()
    .split(/\s+/)
    .filter((w: string) => w.length > 2)
    .join(" ");

  console.log("[AI-RECO] Platform:", platformId, "Keywords:", searchKeywords);

  const rawgParams = new URLSearchParams();
  rawgParams.set("key", rawgKey);
  rawgParams.set("page_size", "50");
  rawgParams.set("ordering", "-rating");

  if (platformId) {
    rawgParams.set("platforms", platformId);
  }

  if (searchKeywords) {
    rawgParams.set("search", searchKeywords);
  }

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
    console.error("[AI-RECO] RAWG fetch error:", e);
  }

  if (rawgGames.length === 0) {
    const noGameMsg = "Désolé, je n'ai pas trouvé de jeux. Essaie avec d'autres mots-clés!";
    return jsonResponse(
      {
        query,
        user_pseudo: userPseudo,
        mode: "recommendation",
        recommendations: [],
        short_summary: noGameMsg,
        personal_message: noGameMsg,
      },
      200,
      corsHeaders
    );
  }

  let factinyDataMap: Record<string, any> = {};
  try {
    const { data: factinyGames } = await supabase
      .from("games")
      .select("id, name, slug")
      .limit(500);

    if (factinyGames) {
      factinyGames.forEach((fg: any) => {
        factinyDataMap[fg.name.toLowerCase()] = fg;
      });
    }
  } catch (e) {
    console.error("[AI-RECO] Factiony fetch error:", e);
  }

  const systemPrompt = "Tu es Factiony AI, expert gaming. Recommande les 3 MEILLEURS jeux basé sur: " + query + "\n\nRÈGLES STRICTES:\n- FOOT -> jeux de foot UNIQUEMENT\n- COOP -> coopératifs VRAIMENT\n- MULTIPLAYER -> multijoueur UNIQUEMENT\n- Plateforme -> celle demandée UNIQUEMENT\n\nSi rien ne match -> dis-le.\n\nSTYLE:\n- Court et direct\n- 1-2 lignes par jeu\n- Pas d'emoji\n- Question engageante à la fin";

  const gamesData = rawgGames.slice(0, 15).map((game: any) => ({
    id: game.id,
    name: game.name,
    slug: game.slug,
    genres: (game.genres || []).map((g: any) => g.name).join(", "),
    platforms: (game.platforms || []).map((p: any) => p.platform.name).join(", "),
    rating: game.rating,
    released: game.released?.substring(0, 4),
  }));

  const userPrompt = "Demande: " + JSON.stringify(query) + "\n\nJeux trouvés (top rated):\n" + JSON.stringify(gamesData, null, 2) + "\n\nRecommande les 3 MEILLEURS qui correspondent vraiment. Puis une question.";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      signal: controller.signal,
      method: "POST",
      headers: {
        Authorization: "Bearer " + mistralKey,
        "Content-Type": "application/json",
      },
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

    clearTimeout(timeoutId);

    if (!mistralRes.ok) throw new Error("Mistral " + mistralRes.status);

    const mistralJson = await mistralRes.json();
    const raw = mistralJson?.choices?.[0]?.message?.content ?? "";

    const recommendations: any[] = [];
    let found = 0;
    for (const game of rawgGames) {
      if (found >= 3) break;
      if (raw.toLowerCase().includes(game.name.toLowerCase())) {
        const genreArr = (game.genres || []) as any[];
        const genreStr = genreArr.map((g: any) => typeof g === "string" ? g : g.name).slice(0, 2).join(", ");
        const year = game.released?.substring(0, 4) || "TBA";
        recommendations.push({
          slug: game.slug,
          title: game.name,
          why: genreStr + " (" + year + ") - " + game.rating + "/5",
          url: baseUrl + "/game/" + game.slug + "-" + game.id,
        });
        found++;
      }
    }

    if (recommendations.length === 0) {
      recommendations.push(...rawgGames.slice(0, 3).map((g: any) => {
        const genreArr = (g.genres || []) as any[];
        const genreStr = genreArr.map((gen: any) => typeof gen === "string" ? gen : gen.name).slice(0, 2).join(", ");
        return {
          slug: g.slug,
          title: g.name,
          why: genreStr + " - " + g.rating + "/5",
          url: baseUrl + "/game/" + g.slug + "-" + g.id,
        };
      }));
    }

    const recommendations3 = recommendations.slice(0, 3);

    let summaryText = "";
    recommendations3.forEach((r: any, i: number) => {
      summaryText += r.title + " (" + r.why + ")";
      if (i < recommendations3.length - 1) summaryText += " / ";
    });

    let questionText = raw;
    const questionMatch = raw.match(/(\?[^\?]*?)$/);
    if (questionMatch) {
      questionText = questionMatch[1].trim();
    }

    return jsonResponse(
      {
        query,
        user_pseudo: userPseudo,
        mode: "recommendation",
        recommendations: recommendations3,
        short_summary: summaryText,
        personal_message: questionText,
      },
      200,
      corsHeaders
    );
  } catch (e) {
    console.error("[AI-RECO] Error:", e);
    const top3 = rawgGames.slice(0, 3);
    
    const recs = top3.map((g: any) => {
      const genreArr = (g.genres || []) as any[];
      const genreStr = genreArr.map((gen: any) => typeof gen === "string" ? gen : gen.name).slice(0, 2).join(", ");
      return {
        slug: g.slug,
        title: g.name,
        why: genreStr ? genreStr + " - " + g.rating + "/5" : g.rating + "/5",
        url: baseUrl + "/game/" + g.slug + "-" + g.id,
      };
    });

    let summaryText = "";
    recs.forEach((r: any, i: number) => {
      summaryText += r.title + " (" + r.why + ")";
      if (i < recs.length - 1) summaryText += " / ";
    });

    let questionText = "Lequel de ces trois te tente?";
    
    return jsonResponse(
      {
        query,
        user_pseudo: userPseudo,
        mode: "recommendation",
        recommendations: recs,
        short_summary: summaryText,
        personal_message: questionText,
      },
      200,
      corsHeaders
    );
  }
}

export const config = { path: "/api/ai-reco" };