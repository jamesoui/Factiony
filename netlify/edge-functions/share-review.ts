import type { Context } from "https://edge.netlify.com";

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

function isBot(uaRaw: string) {
  const ua = (uaRaw || "").toLowerCase();
  return (
    ua.includes("facebookexternalhit") ||
    ua.includes("twitterbot") ||
    ua.includes("slackbot") ||
    ua.includes("discordbot") ||
    ua.includes("linkedinbot") ||
    ua.includes("whatsapp") ||
    ua.includes("telegrambot") ||
    ua.includes("googlebot") ||
    ua.includes("bingbot")
  );
}

function getEnv(context: Context, key: string): string | undefined {
  // Context env (reliable on Netlify Edge)
  const v1 = context?.env?.get?.(key);
  if (v1) return v1;

  // Fallback Netlify global env (sometimes available)
  // @ts-ignore
  const v2 = (globalThis as any).Netlify?.env?.get?.(key);
  if (v2) return v2;

  return undefined;
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Extract review ID from /share/review/:id and sanitize "<uuid>" just in case
  const rawId = pathname.split("/").filter(Boolean).pop() || "";
  const reviewId = rawId.replace(/^<|>$/g, "").trim();

  // Sanity endpoint
  if (reviewId === "test") {
    return new Response(`EDGE_SHARE_OK ${pathname}`, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const supabaseUrl =
    getEnv(context, "SUPABASE_URL") ||
    getEnv(context, "VITE_SUPABASE_URL") ||
    "https://ffcocumtwoyydgsuhwxi.supabase.co";

  const serviceRoleKey = getEnv(context, "SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = getEnv(context, "VITE_SUPABASE_ANON_KEY");
  const supabaseKey = serviceRoleKey || anonKey;

  // Fail closed (prod)
  if (!reviewId || !supabaseKey) {
    return Response.redirect("https://factiony.com/", 302);
  }

  // Helper: Supabase REST GET
  const sbGet = async (path: string) => {
    const resp = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });
    const text = await resp.text();
    return { ok: resp.ok, status: resp.status, text };
  };

  // 1) Fetch review info
  const reviewSelect = "id,game_slug,game_id,user_id,rating,review_text";
  const reviewRes = await sbGet(
    `game_ratings?id=eq.${encodeURIComponent(reviewId)}&select=${encodeURIComponent(
      reviewSelect
    )}`
  );

  if (!reviewRes.ok) {
    return Response.redirect("https://factiony.com/", 302);
  }

  let reviewRow: any = null;
  try {
    const data = JSON.parse(reviewRes.text);
    if (Array.isArray(data) && data[0]) reviewRow = data[0];
  } catch {
    // ignore
  }

  if (!reviewRow?.game_slug) {
    return Response.redirect("https://factiony.com/", 302);
  }

  const slug = String(reviewRow.game_slug);
  const gid = reviewRow.game_id != null ? String(reviewRow.game_id) : "";
  const userId = reviewRow.user_id != null ? String(reviewRow.user_id) : "";
  const rating = reviewRow.rating != null ? String(reviewRow.rating) : "";
  const reviewText = reviewRow.review_text != null ? String(reviewRow.review_text) : "";

  // format attendu par ton app : slug-id
  const gamePath = gid ? `${slug}-${gid}` : slug;

  // URL finale (humaine)
  const redirectUrl = `https://factiony.com/game/${gamePath}?tab=reviews&review=${encodeURIComponent(
    reviewId
  )}`;

  // URL share (canonique pour bots)
  const shareUrl = `https://factiony.com/share/review/${encodeURIComponent(reviewId)}`;

  // 2) Fetch username (optional)
  let username = "un membre";
  if (userId) {
    const userRes = await sbGet(
      `users?id=eq.${encodeURIComponent(userId)}&select=username`
    );
    if (userRes.ok) {
      try {
        const u = JSON.parse(userRes.text);
        if (Array.isArray(u) && u[0]?.username) username = String(u[0].username);
      } catch {
        // ignore
      }
    }
  }

  // 3) Fetch game name + background image (optional)
  let gameName = slug;
  let backgroundImage: string | null = null;

  // Si ta table "games" est différente, on adaptera la requête,
  // mais vu ton HTML actuel, ça te renvoie déjà une image RAWG -> OK.
  const gameRes = await sbGet(
    `games?slug=eq.${encodeURIComponent(slug)}&select=name,background_image,slug`
  );
  if (gameRes.ok) {
    try {
      const g = JSON.parse(gameRes.text);
      if (Array.isArray(g) && g[0]) {
        if (g[0].name) gameName = String(g[0].name);
        if (g[0].background_image) backgroundImage = String(g[0].background_image);
      }
    } catch {
      // ignore
    }
  }

  const titleParts = [`${gameName}`, `critique de ${username}`];
  if (rating) titleParts.push(`(${rating}/5)`);
  const ogTitle = titleParts.join(" — ");

  const ogDescription = truncate(
    reviewText || `Découvrez une critique sur Factiony à propos de ${gameName}.`,
    180
  );

  const fallbackImage = "https://factiony.com/logo-factiony.png";
  const ogImage = backgroundImage || fallbackImage;

  const ua = request.headers.get("user-agent") || "";

  // ✅ Humains: redirect direct
  if (!isBot(ua)) {
    return Response.redirect(redirectUrl, 302);
  }

  // ✅ Bots: HTML OG tags (pas de redirect)
  const fbAppId = getEnv(context, "FB_APP_ID") || ""; // optionnel (juste pour enlever le warning Meta)

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(ogTitle)}</title>

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Factiony" />
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:type" content="image/jpeg" />
  ${fbAppId ? `<meta property="fb:app_id" content="${escapeHtml(fbAppId)}" />` : ""}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
</head>
<body>
  <p>Ouvrir : <a href="${escapeHtml(redirectUrl)}">${escapeHtml(redirectUrl)}</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      // cache court pour que Meta refresh vite quand tu changes un truc
      "cache-control": "public, max-age=60",
    },
  });
};
