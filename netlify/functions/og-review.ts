import { Resvg } from "@resvg/resvg-js";
import type { Handler } from "@netlify/functions";
import { readFileSync } from "fs";
import { join } from "path";

export const handler: Handler = async (event) => {
  try {
    const { default: satori } = await import("satori");

    const reviewId = (event.queryStringParameters?.id || "").replace(/^<|>$/g, "").trim();
    const format = event.queryStringParameters?.format === "story" ? "story" : "square";

    if (!reviewId) return { statusCode: 400, body: "Missing id" };

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;
    if (!supabaseKey) return { statusCode: 500, body: "Missing env" };

    const sbGet = async (path: string) => {
      const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      return r.ok ? r.json() : null;
    };

    const reviewData = await sbGet(
      `game_ratings?id=eq.${encodeURIComponent(reviewId)}&select=id,user_id,game_id,rating,review_text`
    );
    const review = Array.isArray(reviewData) ? reviewData[0] : null;
    if (!review) return { statusCode: 404, body: "Review not found" };

    const [gameData, userData] = await Promise.all([
      sbGet(`games?id=eq.${encodeURIComponent(review.game_id)}&select=name,cover,background_image`),
      sbGet(`users?id=eq.${encodeURIComponent(review.user_id)}&select=username`),
    ]);

    const game = Array.isArray(gameData) ? gameData[0] : null;
    const user = Array.isArray(userData) ? userData[0] : null;

    const gameName: string = game?.name ?? "Jeu inconnu";
    const coverUrl: string | null = game?.cover ?? game?.background_image ?? null;
    const username: string = user?.username ?? "Anonymous";
    const rating: number = Math.round((review.rating ?? 0) * 10) / 10;
    const reviewText: string = review.review_text
      ? review.review_text.length > 160
        ? review.review_text.slice(0, 160) + "…"
        : review.review_text
      : "";

    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;
    const isStory = format === "story";

    const BG = "#0d1117";
    const ORANGE = "#f97316";
    const MUTED = "#8892a4";
    const WHITE = "#ffffff";
    const STAR_CLIP = "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)";

    const w = 1080;
    const h = isStory ? 1920 : 1080;
    const coverH = isStory ? 860 : 460;
    const padX = isStory ? 80 : 64;
    const starSz = isStory ? 34 : 28;

    // Font lue depuis le disque (bundlée avec la fonction)
    const fontData = readFileSync(join(__dirname, "..", "functions", "fonts", "Inter.ttf"));

    // Cover en base64
    let coverDataUrl: string | null = null;
    if (coverUrl) {
      try {
        const imgRes = await fetch(coverUrl);
        if (imgRes.ok) {
          const buf = await imgRes.arrayBuffer();
          const b64 = Buffer.from(buf).toString("base64");
          const mime = imgRes.headers.get("content-type") ?? "image/jpeg";
          coverDataUrl = `data:${mime};base64,${b64}`;
        }
      } catch { /* skip */ }
    }

    const el = {
      type: "div",
      props: {
        style: { width: w, height: h, background: BG, display: "flex", flexDirection: "column", fontFamily: "Inter", overflow: "hidden" },
        children: [
          { type: "div", props: { style: { width: "100%", height: 5, background: ORANGE, display: "flex" } } },
          ...(isStory ? [{
            type: "div",
            props: {
              style: { display: "flex", justifyContent: "center", padding: "60px 0 40px" },
              children: [{ type: "span", props: { style: { fontSize: 40, fontWeight: 700, color: ORANGE, letterSpacing: "0.05em" }, children: "FACTIONY" } }],
            },
          }] : []),
          {
            type: "div",
            props: {
              style: { width: "100%", height: coverH, position: "relative", display: "flex", overflow: "hidden" },
              children: [
                coverDataUrl
                  ? { type: "img", props: { src: coverDataUrl, style: { width: "100%", height: "100%", objectFit: "cover" } } }
                  : { type: "div", props: { style: { width: "100%", height: "100%", background: "linear-gradient(160deg,#1a2d4a,#0d1f38)", display: "flex" } } },
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
          {
            type: "div",
            props: {
              style: { flex: 1, padding: `${isStory ? 50 : 36}px ${padX}px 0`, display: "flex", flexDirection: "column", gap: 16 },
              children: [
                { type: "span", props: { style: { fontSize: isStory ? 30 : 22, color: ORANGE, textTransform: "uppercase", letterSpacing: "0.2em" }, children: "Critique" } },
                { type: "span", props: { style: { fontSize: isStory ? 74 : 54, fontWeight: 700, color: WHITE, lineHeight: 1.1 }, children: gameName } },
                {
                  type: "div",
                  props: {
                    style: { display: "flex", alignItems: "center", gap: 10 },
                    children: [
                      ...Array.from({ length: fullStars }, (_, i) => ({
                        type: "div",
                        props: { key: `f${i}`, style: { width: starSz, height: starSz, background: ORANGE, clipPath: STAR_CLIP } },
                      })),
                      ...Array.from({ length: emptyStars }, (_, i) => ({
                        type: "div",
                        props: { key: `e${i}`, style: { width: starSz, height: starSz, background: "#2a3040", clipPath: STAR_CLIP } },
                      })),
                      { type: "span", props: { style: { fontSize: isStory ? 36 : 28, color: ORANGE, fontWeight: 700, marginLeft: 10 }, children: `${rating} / 5` } },
                    ],
                  },
                },
                ...(reviewText ? [{
                  type: "span",
                  props: { style: { fontSize: isStory ? 36 : 27, color: MUTED, lineHeight: 1.55, fontStyle: "italic" }, children: `"${reviewText}"` },
                }] : []),
              ],
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: `20px ${padX}px ${isStory ? 80 : 36}px`,
                borderTop: "1px solid rgba(249,115,22,0.25)",
                marginTop: 16,
              },
              children: [
                { type: "span", props: { style: { fontSize: isStory ? 30 : 24, color: MUTED }, children: `par @${username}` } },
                {
  type: "div",
  props: {
    style: { display: "flex", alignItems: "center", gap: 8 },
    children: [
      { type: "img", props: { src: `data:image/png;base64,${readFileSync(join(__dirname, "fonts", "logo.png")).toString("base64")}`, style: { width: isStory ? 30 : 24, height: isStory ? 30 : 24, objectFit: "contain" } } },
      { type: "span", props: { style: { fontSize: isStory ? 30 : 24, fontWeight: 700, color: ORANGE, letterSpacing: "0.05em" }, children: "FACTIONY" } },
    ],
  },
},
              ],
            },
          },
        ],
      },
    };

    const svg = await satori(el as any, {
      width: w,
      height: h,
      fonts: [{ name: "Inter", data: fontData, weight: 400, style: "normal" }],
    });

    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: w } });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
      body: Buffer.from(pngBuffer).toString("base64"),
      isBase64Encoded: true,
    };

  } catch (err) {
    console.error("OG error:", err);
    return { statusCode: 500, body: String(err) };
  }
};
