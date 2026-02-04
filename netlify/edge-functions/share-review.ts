import type { Context } from "https://edge.netlify.com";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Extract review ID from URL path: /share/review/{reviewId}
  const reviewId = pathname.split('/').pop();

  if (!reviewId) {
    return new Response('Review ID not found', { status: 404 });
  }

  console.log('[share-review] Processing review:', reviewId);

  // Get Supabase environment variables
const supabaseUrl =
  Deno.env.get("SUPABASE_URL") ||
  Deno.env.get("VITE_SUPABASE_URL") ||
  "https://ffcocumtwoyydgsuhwxi.supabase.co";

const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = Deno.env.get("VITE_SUPABASE_ANON_KEY");

// Use service role first (server), fallback to anon
const supabaseKey = serviceRoleKey || anonKey;

if (!supabaseKey) {
  return new Response(
    "Missing Supabase key (SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY)",
    { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } }
  );
}

let gameSlug = null;

  // Try to fetch the game slug from Supabase
  if (supabaseAnonKey) {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/game_ratings?id=eq.${reviewId}&select=game_slug`,
        {
          headers: {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
},
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0 && data[0].game_slug) {
          gameSlug = data[0].game_slug;
          console.log('[share-review] Found game slug:', gameSlug);
        }
      }
    } catch (error) {
      console.error('[share-review] Error fetching game slug:', error);
    }
  }

  // Build URLs
  const ogImageUrl = `https://factiony.com/og/review/${reviewId}.png`;

  // Redirect to game page with review parameter, or fallback to home if no slug
  const redirectUrl = gameSlug
    ? `https://factiony.com/game/${gameSlug}?review=${reviewId}`
    : `https://factiony.com/`;

  console.log('[share-review] Redirect URL:', redirectUrl);

  // Generate HTML with OG meta tags
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url.href}">
  <meta property="og:title" content="Critique sur Factiony">
  <meta property="og:description" content="Découvrez cette critique de jeu sur Factiony, la plateforme de recommandation de jeux vidéo.">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Factiony">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${url.href}">
  <meta name="twitter:title" content="Critique sur Factiony">
  <meta name="twitter:description" content="Découvrez cette critique de jeu sur Factiony, la plateforme de recommandation de jeux vidéo.">
  <meta name="twitter:image" content="${ogImageUrl}">

  <title>Critique sur Factiony</title>

  <!-- Auto-redirect after meta tags are read -->
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">

  <script>
    // JavaScript redirect as backup
    window.location.replace('${redirectUrl}');
  </script>
</head>
<body>
  <p>Redirection vers <a href="${redirectUrl}">la critique</a>...</p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
