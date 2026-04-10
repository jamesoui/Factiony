import type { Context } from "https://edge.netlify.com";
// @ts-ignore
import satori from "https://esm.sh/satori@0.10.11/dist/index.umd.js";
// @ts-ignore
import { Resvg } from "https://esm.sh/@resvg/resvg-wasm@2.6.0";
// @ts-ignore
import resvgWasm from "https://esm.sh/@resvg/resvg-wasm@2.6.0/index_bg.wasm?module";

let wasmInit = false;

function getEnv(context: Context, key: string): string | undefined {
  const v1 = context?.env?.get?.(key);
  if (v1) return v1;
  // @ts-ignore
  return (globalThis as any).Netlify?.env?.get?.(key);
}

export default async (request: Request, context: Context) => {
  try {
    const url = new URL(request.url);
    const rawId = url.pathname.split("/").filter(Boolean).pop() || "";
    const reviewId = rawId.replace(/^<|>$/g, "").trim();
    const format = url.searchParams.get("format") === "story" ? "story" : "square";

    if (!reviewId) return new Response("Missing id", { status: 400 });

    const supabaseUrl =
      getEnv(context, "SUPABASE_URL") ||
      getEnv(context, "VITE_SUPABASE_URL") ||
      "https://ffcocumtwoyydgsuhwxi.supabase.co";
    const supabaseKey =
      getEnv(context, "SUPABASE_SERVICE_ROLE_KEY") ||
      getEnv(context, "VITE_SUPABASE_ANON_KEY");

    if (!supabaseKey) return new Response("Missing env", { status: 500 });

    const sbGet = async (path: string) => {
      const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      return r.ok ? r.json() : null;
    };

    // Fetch review
    const reviewData = await sbGet(
      `game_ratings?id=eq.${encodeURIComponent(reviewId)}&select=id,user_id,game_id,rating,review_text`
    );
    const review = Array.isArray(reviewData) ? reviewData[0] : null;
    if (!review) return new Response("Review not found", { status: 404 });

    // Fetch game + user en parallèle
    const [gameData, userData] = await Promise.all([
      sbGet(`games?id=eq.${encodeURIComponent(review.game_id)}&select=name,cover,background_image`),
      sbGet(`users?id=eq.${encodeURIComponent(review.user_id)}&select=username`),
    ]);

    const game = Array.isArray(gameData) ? gameData[0] : null;
    const user = Array.isArray(userData) ? userData[0] : null;

    const gameName = game?.name ?? "Jeu inconnu";
    const coverUrl = game?.cover ?? game?.background_image ?? null;
    const username = user?.username ?? "Anonymous";
    const rating = Math.round((review.rating ?? 0) * 10) / 10;
    const reviewText = review.review_text
      ? (review.review_text.length > 160
          ? review.review_text.slice(0, 160) + "…"
          : review.review_text)
      : "";

    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;

    // Fetch cover image → base64
    let coverDataUrl: string | null = null;
    if (coverUrl) {
      try {
        const imgRes = await fetch(coverUrl);
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          const mime = imgRes.headers.get("content-type") ?? "image/jpeg";
          coverDataUrl = `data:${mime};base64,${b64}`;
        }
      } catch { /* fallback to null */ }
    }

    // Init WASM once
    if (!wasmInit) {
      const { initWasm } = await import("https://esm.sh/@resvg/resvg-wasm@2.6.0");
      await initWasm(resvgWasm);
      wasmInit = true;
    }

    // Fetch font
    const fontRes = await fetch(
      "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2"
    );
    const fontData = await fontRes.arrayBuffer();

    const BG = "#0d1117";
    const ORANGE = "#f97316";
    const MUTED = "#8892a4";
    const WHITE = "#ffffff";

    const StarRow = ({ size }: { size: number }) => ({
      type: "div",
      props: {
        style: { display: "flex", gap: "4px", alignItems: "center" },
        children: [
          ...Array.from({ length: fullStars }, (_, i) => ({
            type: "div",
            key: `f${i}`,
            props: {
              style: {
                width: size, height: size,
                background: ORANGE,
                clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
              },
            },
          })),
          ...Array.from({ length: emptyStars }, (_, i) => ({
            type: "div",
            key: `e${i}`,
            props: {
              style: {
                width: size, height: size,
                background: "#2a3040",
                clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
              },
            },
          })),
        ],
      },
    });

    const w = format === "story" ? 1080 : 1080;
    const h = format === "story" ? 1920 : 1080;
    const coverH = format === "story" ? 860 : 460;
    const padX = format === "story" ? 80 : 64;
    const titleSize = format === "story" ? 74 : 54;
    const reviewSize = format === "story" ? 36 : 27;
    const starSize = format === "story" ? 34 : 28;
    const ratingSize = format === "story" ? 36 : 28;
    const tagSize = format === "story" ? 30 : 22;
    const userSize = format === "story" ? 30 : 24;
    const logoSize = format === "story" ? 36 : 28;

    const jsx = {
      type: "div",
      props: {
        style: {
          width: w, height: h,
          background: BG,
          display: "flex",
          flexDirection: "column",
          fontFamily: "Inter",
          overflow: "hidden",
        },
        children: [
          // Barre orange
          {
            type: "div",
            props: { style: { width: "100%", height: 5, background: ORANGE, display: "flex" } },
          },
          // Logo (story seulement)
          ...(format === "story" ? [{
            type: "div",
            props: {
              style: { display: "flex", justifyContent: "center", padding: "60px 0 40px" },
              children: [{
                type: "span",
                props: { style: { fontSize: logoSize + 4, fontWeight: 700, color: ORANGE, letterSpacing: "0.05em" }, children: "FACTIONY" },
              }],
            },
          }] : []),
          // Cover
          {
            type: "div",
            props: {
              style: { width: "100%", height: coverH, position: "relative", display: "flex", overflow: "hidden" },
              children: [
                coverDataUrl
                  ? { type: "img", props: { src: coverDataUrl, style: { width: "100%", height: "100%", objectFit: "cover" } } }
                  : { type: "div", props: { style: { width: "100%", height: "100%", background: "linear-gradient(160deg,#1a2d4a,#0d1f38)", display: "flex" } } },
                // Vignette bas
                {
                  type: "div",
                  props: {
                    style: {
                      position: "absolute", bottom: 0, left: 0, right: 0,
                      height: Math.round(coverH * 0.4),
                      background: `linear-gradient(to bottom, transparent, ${BG})`,
                      display: "flex",
                    },
                  },
                },
              ],
            },
          },
          // Corps
          {
            type: "div",
            props: {
              style: { flex: 1, padding: `${format === "story" ? 50 : 36}px ${padX}px 0`, display: "flex", flexDirection: "column", gap: 16 },
              children: [
                { type: "span", props: { style: { fontSize: tagSize, color: ORANGE, textTransform: "uppercase", letterSpacing: "0.2em" }, children: "Critique" } },
                { type: "span", props: { style: { fontSize: titleSize, fontWeight: 700, color: WHITE, lineHeight: 1.1 }, children: gameName } },
                {
                  type: "div",
                  props: {
                    style: { display: "flex", alignItems: "center", gap: 16 },
                    children: [
                      StarRow({ size: starSize }),
                      { type: "span", props: { style: { fontSize: ratingSize, color: ORANGE, fontWeight: 700 }, children: `${rating} / 5` } },
                    ],
                  },
                },
                ...(reviewText ? [{
                  type: "span",
                  props: { style: { fontSize: reviewSize, color: MUTED, lineHeight: 1.55, fontStyle: "italic" }, children: `"${reviewText}"` },
                }] : []),
              ],
            },
          },
          // Footer
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: `20px ${padX}px ${format === "story" ? 80 : 36}px`,
                borderTop: "1px solid rgba(249,115,22,0.25)",
                marginTop: 16,
              },
              children: [
                { type: "span", props: { style: { fontSize: userSize, color: MUTED }, children: `par @${username}` } },
                { type: "span", props: { style: { fontSize: logoSize, fontWeight: 700, color: ORANGE, letterSpacing: "0.05em" }, children: "FACTIONY" } },
              ],
            },
          },
        ],
      },
    };

    const svg = await satori(jsx, {
      width: w,
      height: h,
      fonts: [{ name: "Inter", data: fontData, weight: 400, style: "normal" }],
    });

    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: w } });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return new Response(pngBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });

  } catch (err) {
    console.error("OG generation error:", err);
    return new Response("Error generating image", { status: 500 });
  }
};