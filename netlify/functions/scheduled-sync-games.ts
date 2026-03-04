// netlify/functions/scheduled-sync-games.ts

import { createClient } from "@supabase/supabase-js";

export const handler = async () => {
  try {
    console.log("[SYNC] Starting test...");

    const supabase = createClient(
      process.env.SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );

    console.log("[SYNC] Supabase client created");

    const { data, error } = await supabase
      .from("games")
      .select("*", { count: "exact", head: true });

    console.log("[SYNC] Query result:", { error, count: data?.length });

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Sync working!",
        dbConnected: true
      })
    };
  } catch (err) {
    console.error("[SYNC] Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error"
      })
    };
  }
};

export const config = {
  schedule: "0 2 * * *"
};