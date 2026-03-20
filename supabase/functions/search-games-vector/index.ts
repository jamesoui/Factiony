import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, page_size = 30 } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: "Missing query" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // 🔑 ENV
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const MISTRAL_KEY = Deno.env.get("MISTRAL_API_KEY")!;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 🧠 1 — embedding de la requête utilisateur
    const embRes = await fetch("https://api.mistral.ai/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-embed",
        input: query,
      }),
    });

    const embJson = await embRes.json();
    const embedding = embJson.data[0].embedding;

    // 🔎 2 — recherche vectorielle Postgres
    const { data, error } = await supabase.rpc("match_games", {
      query_embedding: embedding,
      match_count: page_size,
    });

    if (error) throw error;

    return new Response(
      JSON.stringify({
        query,
        results: data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});