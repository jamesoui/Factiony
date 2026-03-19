// netlify/edge-functions/ai-reco.ts

import { createClient } from "@supabase/supabase-js";

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
  console.log("[ALBUS] Query:", query, "User:", userPseudo);

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
    return handleGameplayQuestion(query, userPseudo, MISTRAL_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, BASE_URL, corsHeaders);
  } else {
    return handleRecommendation(query, userPseudo, RAWG_API_KEY, MISTRAL_API_KEY, BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, corsHeaders);
  }
};

async function handleGameplayQuestion(query: string, userPseudo: string, mistralKey: string, supabaseUrl: string, supabaseKey: string, baseUrl: string, corsHeaders: Record<string, string>) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const systemPrompt = `Tu es Albus, assistant gaming IA de Factiony.

RÈGLES STRICTES:
- Réponds à des questions gaming (boss, build, strat)
- Utilise ta connaissance des jeux et des données RAWG
- Conseils directs, pratiques, sans blabla
- PAS D'ASTÉRISQUES (* ou **) - format texte simple
- Si tu mentionnes un jeu Factiony, inclus le lien au format: [Nom du jeu](${baseUrl}/game/slug-id)
- MAX 3 jeux mentionnés avec lien
- À la fin, pose UNE question de suivi courte et pertinente`;

  const userPrompt = "Question: " + query + "\nRéponds directement avec conseils pratiques.";

  try {
    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + mistralKey, "Content-Type": "application/json" },
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

    if (!mistralRes.ok) throw new Error("Mistral error");
    const mistralJson = await mistralRes.json();
    const response = mistralJson?.choices?.[0]?.message?.content ?? "";

    const cleanResponse = response.replace(/\*\*?/g, "");

    return jsonResponse({ query, user_pseudo: userPseudo, mode: "gameplay", answer: cleanResponse }, 200, corsHeaders);
  } catch (e) {
    return jsonResponse({ query, user_pseudo: userPseudo, mode: "gameplay", answer: "Erreur. Réessaie." }, 200, corsHeaders);
  }
}

async function handleRecommendation(query: string, userPseudo: string, rawgKey: string, mistralKey: string, baseUrl: string, supabaseUrl: string, supabaseKey: string, corsHeaders: Record<string, string>) {
  const queryLower = query.toLowerCase();

  let parsedTags: string[] = [];
  let platformId = null;

  try {
    const parseSystemPrompt = "Tu es un expert gaming. Parse la requête utilisateur pour extraire les genres/tags RAWG pertinents.\n\nTags disponibles: action, adventure, rpg, strategy, shooter, racing, puzzle, horror, indie, sports, coop, multiplayer, solo, simulation, fighting.\n\nRéponds au format: tags:action,adventure platform:ps5\n\nSi pas de tags clairs, laisse vide.";

    const parseUserPrompt = `Requête: "${query}"\n\nExtrait max 2 tags RAWG pertinents et la plateforme si mentionnée.\nFormat réponse: tags:tag1,tag2 platform:ps5`;

    const parseRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + mistralKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.5,
        max_tokens: 100,
        messages: [
          { role: "system", content: parseSystemPrompt },
          { role: "user", content: parseUserPrompt },
        ],
      }),
    });

    if (parseRes.ok) {
      const parseJson = await parseRes.json();
      const parseResult = parseJson?.choices?.[0]?.message?.content ?? "";
      console.log("[ALBUS] Parsed result:", parseResult);

      const tagsMatch = parseResult.match(/tags:([^\s]+)/);
      if (tagsMatch) {
        const tagNames = tagsMatch[1].split(",");
        parsedTags = tagNames
          .map((tag: string) => TAG_IDS[tag.trim()])
          .filter((id: any) => id !== undefined)
          .map((id: number) => id.toString());
      }

      const platformMatch = parseResult.match(/platform:(\w+)/);
      if (platformMatch) {
        const platformName = platformMatch[1].toLowerCase();
        if (platformName.includes("ps5")) platformId = "187";
        else if (platformName.includes("xbox")) platformId = "186";
        else if (platformName.includes("switch")) platformId = "7";
        else if (platformName.includes("pc")) platformId = "4";
      }
    }
  } catch (e) {
    console.error("[ALBUS] Parsing error:", e);
  }

  if (parsedTags.length === 0) {
    for (const [keyword, id] of Object.entries(TAG_IDS)) {
      if (queryLower.includes(keyword)) {
        parsedTags = [id.toString()];
        break;
      }
    }
  }

  if (!platformId) {
    if (queryLower.includes("ps5")) platformId = "187";
    else if (queryLower.includes("xbox")) platformId = "186";
    else if (queryLower.includes("switch")) platformId = "7";
    else if (queryLower.includes("pc")) platformId = "4";
  }

  let searchKeywords = queryLower
    .replace(/ps5|playstation|xbox|switch|pc|sur|on|à|pour|jeux|game|games|the|a|an|le|la|les|un|une|des|et|coop|multiplayer|solo|rpg|action|strategy|adventure|puzzle|shooter|racing|horror|indie|adoré|adorée|love|aimé|like/gi, "")
    .trim();

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
    }
  } catch (e) {
    console.error("[ALBUS] RAWG error:", e);
  }

  if (rawgGames.length === 0) {
    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation",
      recommendations: [],
      short_summary: "Aucun jeu trouvé. Essaie d'autres mots-clés!",
      personal_message: "Aucun jeu trouvé.",
    }, 200, corsHeaders);
  }

  const filteredGames = rawgGames
    .filter(g => g.rating >= 3.5)
    .slice(0, 15);

  const gamesForMistral = filteredGames.map((g: any) => ({
    name: g.name,
    slug: g.slug,
    id: g.id,
    genres: (g.genres || []).map((x: any) => x.name).join(", "),
    rating: g.rating,
  }));

  const systemPrompt = `Tu es Albus, assistant gaming IA de Factiony. RECOMMANDE JUSQU'À 3 JEUX (minimum 1).

RÈGLES STRICTES:
1. Recommande UNIQUEMENT des jeux de la liste fournie (data RAWG)
2. PAS D'ASTÉRISQUES - texte simple uniquement
3. Recommande 1, 2 ou 3 jeux selon la pertinence (pas forcément 3)
4. Utilise les infos RAWG (genres, rating, communauté) pour justifier tes recommandations
5. Format simple:
   1. Nom du jeu
   Description courte (2-3 lignes) pourquoi ça match (basée sur RAWG)
   Genre - Rating/5
   Lien: [Voir le jeu](${baseUrl}/game/SLUG-ID)

6. APRÈS les jeux: une question courte pour affiner
   Ex: "Tu préfères du coop local ou en ligne ?"
   Ex: "Tu veux plus d'action ou plus de réflexion ?"

7. N'INVENTE JAMAIS de jeu - utilise UNIQUEMENT ceux de la liste RAWG`;

  const userPrompt = "Demande: " + query + "\n\nJeux disponibles (UTILISE UNIQUEMENT CEUX-CI):\n" + JSON.stringify(gamesForMistral, null, 2) + "\n\nRecommande 1-3 jeux avec descriptions. Puis une question pour affiner.";

  try {
    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + mistralKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-large-latest",
        temperature: 0.8,
        max_tokens: 1200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!mistralRes.ok) throw new Error("Mistral error");
    const mistralJson = await mistralRes.json();
    const raw = mistralJson?.choices?.[0]?.message?.content ?? "";

    const cleanRaw = raw.replace(/\*\*?/g, "");

    const recommendations: any[] = [];
    const lines = cleanRaw.split("\n");
    let currentGame = null;
    let currentDescription = "";
    let found = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      const gameMatch = gamesForMistral.find(g => trimmed.toLowerCase().includes(g.name.toLowerCase()) && trimmed.length < 100);
      
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
      if (last.length > 5 && last.length < 150 && last.includes("?") === false) {
        questionText = last + "?";
      } else if (last.length > 5 && last.length < 150) {
        questionText = last;
      }
    }

    let summaryText = recs.map(r => r.title + " (" + r.why + ")").join(" / ");

    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation",
      recommendations: recs,
      short_summary: summaryText,
      personal_message: questionText,
    }, 200, corsHeaders);
  } catch (e) {
    console.error("[ALBUS] Mistral error:", e);
    const top2 = gamesForMistral.slice(0, 2).map((g: any) => ({
      slug: g.slug,
      title: g.name,
      summary: g.genres,
      why: g.genres + " - " + g.rating + "/5",
      url: baseUrl + "/game/" + g.slug + "-" + g.id,
    }));
    
    return jsonResponse({
      query, user_pseudo: userPseudo, mode: "recommendation",
      recommendations: top2,
      short_summary: top2.map(r => r.title + " (" + r.why + ")").join(" / "),
      personal_message: "Lequel te tente?",
    }, 200, corsHeaders);
  }
}

export const config = { path: "/api/ai-reco" };