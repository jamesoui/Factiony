import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const basicTranslations: Record<string, string> = {
  "the": "le",
  "a": "un",
  "is": "est",
  "and": "et",
  "or": "ou",
  "in": "dans",
  "on": "sur",
  "at": "à",
  "to": "à",
  "for": "pour",
  "with": "avec",
  "from": "de",
  "by": "par",
  "game": "jeu",
  "player": "joueur",
  "world": "monde",
  "story": "histoire",
  "action": "action",
  "adventure": "aventure",
  "character": "personnage",
  "mission": "mission",
  "open": "ouvert",
  "city": "ville",
  "crime": "crime",
  "grand": "grand",
  "theft": "vol",
  "auto": "auto",
  "violence": "violence",
  "shooting": "tir",
  "driving": "conduite",
  "multiplayer": "multijoueur",
  "online": "en ligne",
  "experience": "expérience",
  "explore": "explorer",
  "combat": "combat",
  "weapon": "arme",
  "vehicle": "véhicule",
  "money": "argent",
  "power": "pouvoir",
  "control": "contrôle",
  "freedom": "liberté",
  "gameplay": "gameplay",
  "graphics": "graphismes",
  "realistic": "réaliste",
  "immersive": "immersif",
  "detailed": "détaillé",
  "expansive": "vaste",
  "dynamic": "dynamique",
  "engaging": "captivant",
};

function simpleFallbackTranslate(text: string): string {
  const words = text.toLowerCase().split(/\s+/);
  const translated = words.map((word) => {
    const cleanWord = word.replace(/[.,!?;:()]/g, "");
    return basicTranslations[cleanWord] || word;
  });
  return translated.join(" ");
}

async function translateWithMyMemory(text: string): Promise<string> {
  if (!text || text.length === 0) return text;

  const maxLength = 500;
  if (text.length <= maxLength) {
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fr`
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.responseData?.translatedText) {
          return data.responseData.translatedText;
        }
      }
    } catch (err) {
      console.error("MyMemory API error:", err);
    }
  }

  const lines = text.split('\n').filter(line => line.trim().length > 0);
  const translatedParts: string[] = [];

  for (const line of lines) {
    if (line.trim().length === 0) {
      translatedParts.push('');
      continue;
    }

    if (line.trim().length <= maxLength) {
      try {
        const res = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(line.trim())}&langpair=en|fr`
        );
        if (res.ok) {
          const data = await res.json();
          translatedParts.push(data?.responseData?.translatedText || line.trim());
        } else {
          translatedParts.push(line.trim());
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (err) {
        console.error("MyMemory line error:", err);
        translatedParts.push(line.trim());
      }
    } else {
      const chunks = line.match(/.{1,400}/g) || [line];
      const chunkTranslations: string[] = [];

      for (const chunk of chunks) {
        try {
          const res = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|fr`
          );
          if (res.ok) {
            const data = await res.json();
            chunkTranslations.push(data?.responseData?.translatedText || chunk);
          } else {
            chunkTranslations.push(chunk);
          }
          await new Promise((resolve) => setTimeout(resolve, 300));
        } catch (err) {
          console.error("MyMemory chunk error:", err);
          chunkTranslations.push(chunk);
        }
      }

      translatedParts.push(chunkTranslations.join(' '));
    }
  }

  return translatedParts.join('\n');
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const text = url.searchParams.get("text");
    const from = url.searchParams.get("from") || "en";
    const to = url.searchParams.get("to") || "fr";

    if (!text) {
      return new Response(
        JSON.stringify({ error: "Missing text parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: cached } = await supabase
      .from("api_translation_cache")
      .select("translated")
      .eq("input_text", text)
      .eq("source_lang", from)
      .eq("target_lang", to)
      .gte("created_at", new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (cached?.translated) {
      console.log("✅ Translation cache HIT");
      return new Response(
        JSON.stringify({ translated: cached.translated }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("🔄 Translation cache MISS, translating...");

    let translated = "";
    try {
      translated = await translateWithMyMemory(text);
    } catch (err) {
      console.error("MyMemory failed, using fallback:", err);
      translated = simpleFallbackTranslate(text);
    }

    if (!translated || translated === text) {
      translated = simpleFallbackTranslate(text);
    }

    await supabase
      .from("api_translation_cache")
      .upsert({
        input_text: text,
        source_lang: from,
        target_lang: to,
        translated: translated,
        created_at: new Date().toISOString(),
      }, {
        onConflict: "input_text,source_lang,target_lang",
      });

    console.log("💾 Translation cached");

    return new Response(
      JSON.stringify({ translated }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("❌ Translation error:", err);
    return new Response(
      JSON.stringify({
        error: "Translation failed",
        details: err?.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});