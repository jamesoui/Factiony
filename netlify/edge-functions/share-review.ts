export default async (request: Request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const reviewId = pathname.split("/").filter(Boolean).pop() || "";

  // Netlify Edge env API (reliable)
  // @ts-ignore
  const envGet = (k: string) => (globalThis as any).Netlify?.env?.get?.(k);

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

  // quick sanity test endpoint
  if (reviewId === "test") {
    return new Response(`EDGE_SHARE_OK ${pathname}`, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // Fetch game_slug
const restUrl = `${supabaseUrl}/rest/v1/game_ratings?id=eq.${encodeURIComponent(reviewId)}&select=game_slug,game_id`;

const resp = await fetch(restUrl, {
  headers: {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  },
});

  const bodyText = await resp.text();
  let gameSlug: string | null = null;

  if (resp.ok) {
  try {
    const data = JSON.parse(bodyText);

    if (Array.isArray(data) && data[0]) {
      const slug = data[0].game_slug ? String(data[0].game_slug) : null;
      const gid  = data[0].game_id   ? String(data[0].game_id)   : null;

      if (slug) {
        // format attendu par ton app : slug-id
        gameSlug = gid ? `${slug}-${gid}` : slug;
      }
    }

  } catch {
    // ignore
  }
}

  if (!gameSlug) {
    return new Response(
      `Share debug:
status=${resp.status}
restUrl=${restUrl}
body=${bodyText.slice(0, 2000)}`,
      { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  const redirectUrl = `https://factiony.com/game/${gameSlug}?tab=reviews&review=${reviewId}`;

  // HTML OG + redirect
  const ogImageUrl = `https://factiony.com/og/review/${reviewId}.png`;
  const html = `<!doctype html><html lang="fr"><head>
<meta charset="utf-8">
<meta property="og:type" content="article">
<meta property="og:url" content="${redirectUrl}">
<meta property="og:title" content="Critique sur Factiony">
<meta property="og:description" content="Découvrez cette critique de jeu sur Factiony.">
<meta property="og:image" content="${ogImageUrl}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${ogImageUrl}">
<meta http-equiv="refresh" content="0;url=${redirectUrl}">
<title>Critique sur Factiony</title>
</head><body>Redirection...</body></html>`;

  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" },
  });
};

