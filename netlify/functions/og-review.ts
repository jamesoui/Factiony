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

    const isStory = format === "story";
    const BG = "#0d1117";
    const ORANGE = "#f97316";
    const MUTED = "#8892a4";
    const WHITE = "#ffffff";

    const w = 1080;
    const h = isStory ? 1920 : 1080;
    const coverH = isStory ? 860 : 460;
    const padX = isStory ? 80 : 64;
    const starSz = isStory ? 38 : 32;
    const logoSz = isStory ? 100 : 80;

    const fontData = readFileSync(join(__dirname, "fonts", "Inter.ttf"));
    const logoB64 = readFileSync(join(__dirname, "fonts", "logo.png")).toString("base64");

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

    // rating sur 5
    const ratingOn5 = rating > 5 ? rating / 2 : rating;
    const fullStars = Math.floor(ratingOn5);
    const hasHalf = (ratingOn5 - fullStars) >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    // Paths étoile 5 branches (viewBox 24x24)
    const STAR_FULL = "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17 5.8 21.3l2.4-7.4L2 9.4h7.6z";
    // Moitié GAUCHE de l'étoile uniquement
    const STAR_LEFT_HALF = "M12,2 L9.6,9.4 L2,9.4 L8.2,13.9 L5.8,21.3 L12,17 Z";

    const makeStar = (type: "full" | "half" | "empty", sz: number, idx: number) => ({
      type: "svg",
      props: {
        key: `s${idx}`,
        width: sz, height: sz,
        viewBox: "0 0 24 24",
        style: { display: "flex" },
        children: type === "full"
          ? [{ type: "path", props: { d: STAR_FULL, fill: ORANGE } }]
          : type === "empty"
          ? [{ type: "path", props: { d: STAR_FULL, fill: "#2a3040" } }]
          // demi-étoile : fond gris + moitié droite orange
          : [
              { type: "path", props: { d: STAR_FULL, fill: "#2a3040" } },
              { type: "path", props: { d: STAR_LEFT_HALF, fill: ORANGE } },
            ],
      },
    });

    const starElements = [
      ...Array.from({ length: fullStars }, (_, i) => makeStar("full", starSz, i)),
      ...(hasHalf ? [makeStar("half", starSz, fullStars)] : []),
      ...Array.from({ length: emptyStars }, (_, i) => makeStar("empty", starSz, fullStars + (hasHalf ? 1 : 0) + i)),
    ];

    const LogoRow = (sz: number) => ({
      type: "div",
      props: {
        style: { display: "flex", alignItems: "center", gap: 12 },
        children: [
          { type: "img", props: { src: ..., style: { width: sz, height: sz, ... } } },
          { type: "span", props: { style: { fontSize: isStory ? 30 : 24, fontWeight: 700, color: ORANGE, letterSpacing: "0.05em" }, children: "FACTIONY" } },
        ],
      },
    });

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
              children: [LogoRow(64)],
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
                  props: { style: { position: "absolute", bottom: 0, left: 0, right: 0, height: Math.round(coverH * 0.4), background: `linear-gradient(to bottom, transparent, ${BG})`, display: "flex" } },
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
                    style: { display: "flex", alignItems: "center", gap: 8 },
                    children: [
                      ...starElements,
                      { type: "span", props: { style: { fontSize: isStory ? 36 : 28, color: ORANGE, fontWeight: 700, marginLeft: 12 }, children: `${ratingOn5} / 5` } },
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
              style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: `20px ${padX}px ${isStory ? 80 : 36}px`, borderTop: "1px solid rgba(249,115,22,0.25)", marginTop: 16 },
              children: [
                { type: "span", props: { style: { fontSize: isStory ? 30 : 24, color: MUTED }, children: `par @${username}` } },
                LogoRow(logoSz),
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
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
      body: Buffer.from(pngBuffer).toString("base64"),
      isBase64Encoded: true,
    };

  } catch (err) {
    console.error("OG error:", err);
    return { statusCode: 500, body: String(err) };
  }
};