import type { Context } from "https://edge.netlify.com";

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const reviewId = pathname.split("/").filter(Boolean).pop() || "";

  try {
    if (!reviewId) {
      return new Response("Review ID not found", { status: 404 });
    }

    // ✅ Prefer Netlify-provided env (safe on Edge)
    const envGet = (key: string) => {
      // @ts-ignore - context.env exists on Netlify Edge runtime
      const v = context?.env?.[key];
      return typeof v === "string" ? v : undefined;
    };

    const supabaseUrl =
      envGet("SUPABASE_URL") ||
      envGet("VITE_SUPABASE_URL") ||
      "https://ffcocumtwoyydgsuhwxi.supabase.co";

    const serviceRoleKey = envGet("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = envGet("VITE_SUPABASE_ANON_KEY");
    const supabaseKey = serviceRoleKey || anonKey;

    if (!supabaseKey) {
      return new Response(
        `Missing Supabase key. Need SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY.
pathname=${pathname}
reviewId=${reviewId}`,
        { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }

    let gameSlug: string | null = null;

    // Fetch game_slug from game_ratings
    const restUrl = `${supabaseUrl}/rest/v1/game_ratings?id=eq.${encodeURIComponent(
      reviewId
    )}&select=game_slug`;

    const resp = await fetch(restUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    const status = resp.status;
    const text = await resp.text();

    if (resp.ok) {
      const data = JSON.parse(text);
      if (Array.isArray(data) && data[0]?.game_slug) {
        gameSlug = String(data[0].game_slug);
      }
    }

    const ogImageUrl = `https://factiony.com/og/review/${reviewId}.png`;

    // If no slug, show debug page (no silent redirect)
    if (!gameSlug) {
      const debugHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Share debug</title></head>
<body style="font-family:system-ui;padding:24px">
<h2>Share review debug</h2>
<p><b>reviewId:</b> ${escapeHtml(reviewId)}</p>
<p><b>pathname:</b> ${escapeHtml(pathname)}</p>
<p><b>Supabase REST status:</b> ${status}</p>
<p><b>Supabase REST url:</b> ${escapeHtml(restUrl)}</p>
<pre style="white-space:pre-wrap;background:#111;color:#ddd;padding:12px;border-radius:8px">${escapeHtml(
        text.slice(0, 4000)
      )}</pre>
</body></html>`;
      return new Response(debugHtml, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const redirectUrl = `https://factiony.com/game/${gameSlug}?tab=reviews&review=${reviewId}`;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${escapeHtml(redirectUrl)}">
  <meta property="og:title" content="Critique sur Factiony">
  <meta property="og:description" content="Découvrez cette critique de jeu sur Factiony.">
  <meta property="og:image" content="${escapeHtml(ogImageUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapeHtml(redirectUrl)}">
  <meta name="twitter:title" content="Critique sur Factiony">
  <meta name="twitter:description" content="Découvrez cette critique de jeu sur Factiony.">
  <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}">
  <title>Critique sur Factiony</title>
  <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}">
</head>
<body>
  <p>Redirection vers <a href="${escapeHtml(redirectUrl)}">la critique</a>...</p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  } catch (err: any) {
    const errorHtml = `<!doctype html><html><head><meta charset="utf-8"><title>Edge crash</title></head>
<body style="font-family:system-ui;padding:24px">
<h2>Edge function crashed</h2>
<p><b>pathname:</b> ${escapeHtml(pathname)}</p>
<p><b>reviewId:</b> ${escapeHtml(reviewId)}</p>
<pre style="white-space:pre-wrap;background:#111;color:#ddd;padding:12px;border-radius:8px">${escapeHtml(
      String(err?.stack || err?.message || err)
    )}</pre>
</body></html>`;
    return new Response(errorHtml, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
};

