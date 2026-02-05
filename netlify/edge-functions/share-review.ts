function escapeHtml(s: string) {
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function truncate(s: string, max: number) {
  const t = (s || "").trim().replace(/\s+/g, " ");
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + "…";
}

function isBotUA(ua: string) {
  const u = (ua || "").toLowerCase();
  return (
    u.includes("facebookexternalhit") ||
    u.includes("facebot") ||
    u.includes("twitterbot") ||
    u.includes("slackbot") ||
    u.includes("discordbot") ||
    u.includes("whatsapp") ||
    u.includes("telegrambot") ||
    u.includes("linkedinbot") ||
    u.includes("pinterest") ||
    u.includes("embedly") ||
    u.includes("googlebot") ||
    u.includes("bingbot")
  );
}

export default async (request: Request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // /share/review/:id
  const rawId = pathname.split("/").filter(Boolean).pop() || "";
  const reviewId = rawId.replace(/^<|>$/g, "").trim();

  const ua = request.headers.get("user-agent") || "";
  const isBot = isBotUA(ua);

  // Netlify Edge env API
  // @ts-ignore
  const envGet = (k: string) => (globalThis as any).Netlify?.env?.get?.(k);

  const supabaseUrl =
    envGet("SUPABASE_URL") ||
    envGet("VITE_SUPABASE_URL") ||
    "https://ffcocumtwoyydgsuhwxi.supabase.co";

  const serviceRoleKey = envGet("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = envGet("VITE_SUPABASE_ANON_KEY");
  const supabaseKey = serviceRoleKey || anonKey;

  const siteUrl = "https://factiony.com";
  const fallbackImage = `${siteUrl}/logo-factiony.png`;

  // Sanity endpoint
  if (reviewId === "test") {
    return new Response(`EDGE_SHARE_OK ${pathname}`, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // HEAD: don't crash
  if (request.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    });
  }

  const buildHtml = (opts: {
    redirectUrl: string;
    ogTitle: string;
    ogDescription: string;
    ogImage: string;
    doRedirect: boolean;
  }) => {
    const { redirectUrl, ogTitle, ogDescription, ogImage, doRedirect } = opts;

    const metaRefresh = doRedirect
      ? `<meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}" />`
      : "";

    const jsRedirect = doRedirect
      ? `<script>location.replace(${JSON.stringify(redirectUrl)});</script>`
      : "";

    return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(ogTitle)}</title>

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Factiony" />
  <meta property="og:url" content="${escapeHtml(redirectUrl)}" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${escapeHtml(redirectUrl)}" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />

  ${metaRefresh}
</head>
<body>
  <p>Ouvrir : <a href="${escapeHtml(redirectUrl)}">${escapeHtml(redirectUrl)}</a></p>
  ${jsRedirect}
</body>
</html>`;
  };

  // If missing key or bad id: bots still need OG (no 302)
  if (!reviewId || !supabaseKey) {
    const redirectUrl = siteUrl;
    const html = buildHtml({
      redirectUrl,
      ogTitle: "Critique sur Factiony",
      ogDescription: "Découvrez une critique de jeu sur Factiony.",
      ogImage: fallbackImage,
      doRedirect: !isBot,
    });

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    });
  }

  const sbGet = async (path: string) => {
    const resp = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });
    const text = await resp.text();
    return { ok: resp.ok, text };
  };

  // 1) review
  const reviewSelect = "id,game_slug,game_id,user_id,rating,review_text";
  const reviewRes = await sbGet(
    `game_ratings?id=eq.${encodeURIComponent(reviewId)}&select=${encodeURIComponent(reviewSelect)}`
  );

  let r: any = null;
  if (reviewRes.ok) {
    try {
      const arr = JSON.parse(reviewRes.text);
      if (Array.isArray(arr) && arr[0]) r = arr[0];
    } catch {}
  }

  // If not found: still provide OG page
  if (!r?.game_slug) {
    const redirectUrl = siteUrl;
    const html = buildHtml({
      redirectUrl,
      ogTitle: "Critique sur Factiony",
      ogDescription: "Découvrez une critique de jeu sur Factiony.",
      ogImage: fallbackImage,
      doRedirect: !isBot,
    });

    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=60",
      },
    });
  }

  const slug = String(r.game_slug);
  const gid = r.game_id != null ? String(r.game_id) : "";
  const userId = r.user_id != null ? String(r.user_id) : "";
  const rating = r.rating != null ? String(r.rating) : "";
  const reviewText = r.review_text != null ? String(r.review_text) : "";

  const gamePath = gid ? `${slug}-${gid}` : slug;
  const redirectUrl = `${siteUrl}/game/${gamePath}?tab=reviews&review=${encodeURIComponent(reviewId)}`;

  // 2) username
  let username = "un membre";
  if (userId) {
    const userRes = await sbGet(
      `users?id=eq.${encodeURIComponent(userId)}&select=username`
    );
    if (userRes.ok) {
      try {
        const u = JSON.parse(userRes.text);
        if (Array.isArray(u) && u[0]?.username) username = String(u[0].username);
      } catch {}
    }
  }

  // 3) game (image + name)
  let gameName = slug;
  let ogImage = fallbackImage;

  const gameRes = await sbGet(
    `games?slug=eq.${encodeURIComponent(slug)}&select=name,background_image,slug`
  );
  if (gameRes.ok) {
    try {
      const g = JSON.parse(gameRes.text);
      if (Array.isArray(g) && g[0]) {
        if (g[0].name) gameName = String(g[0].name);
        if (g[0].background_image) ogImage = String(g[0].background_image);
      }
    } catch {}
  }

  const ogTitle = `${gameName} — critique de ${username}${rating ? ` (${rating}/5)` : ""}`;
  const ogDescription = truncate(
    reviewText || `Découvrez une critique sur Factiony à propos de ${gameName}.`,
    180
  );

  const html = buildHtml({
    redirectUrl,
    ogTitle,
    ogDescription,
    ogImage,
    doRedirect: !isBot, // bots: no redirect
  });

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
};
