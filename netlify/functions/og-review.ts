// netlify/functions/og-review.ts
// Netlify Function Node.js — utilise @vercel/og déjà installé

import { ImageResponse } from "@vercel/og";
import type { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
  try {
    const parts = (event.path || "").split("/").filter(Boolean);
    const reviewId = parts[parts.length - 1]?.replace(/^<|>$/g, "").trim();
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

    const gameName = game?.name ?? "Jeu inconnu";
    const coverUrl = game?.cover ?? game?.background_image ?? null;
    const username = user?.username ?? "Anonymous";
    const rating = Math.round((review.rating ?? 0) * 10) / 10;
    const reviewText = review.review_text
      ? review.review_text.length > 160
        ? review.review_text.slice(0, 160) + "…"
        : review.review_text
      : "";

    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;

    const BG = "#0d1117";
    const ORANGE = "#f97316";
    const MUTED = "#8892a4";
    const WHITE = "#ffffff";

    const w = 1080;
    const h = format === "story" ? 1920 : 1080;
    const coverH = format === "story" ? 860 : 460;
    const padX = format === "story" ? 80 : 64;

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            width: w,
            height: h,
            background: BG,
            display: "flex",
            flexDirection: "column",
            fontFamily: "sans-serif",
          }}
        >
          {/* Barre orange */}
          <div style={{ width: "100%", height: 5, background: ORANGE, display: "flex" }} />

          {/* Logo story */}
          {format === "story" && (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px 0 40px" }}>
              <span style={{ fontSize: 40, fontWeight: 700, color: ORANGE, letterSpacing: "0.05em" }}>
                FACTIONY
              </span>
            </div>
          )}

          {/* Cover */}
          <div style={{ width: "100%", height: coverH, position: "relative", display: "flex", overflow: "hidden" }}>
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg,#1a2d4a,#0d1f38)", display: "flex" }} />
            )}
            <div
              style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                height: Math.round(coverH * 0.4),
                background: `linear-gradient(to bottom, transparent, ${BG})`,
                display: "flex",
              }}
            />
          </div>

          {/* Corps */}
          <div style={{ flex: 1, padding: `${format === "story" ? 50 : 36}px ${padX}px 0`, display: "flex", flexDirection: "column", gap: 16 }}>
            <span style={{ fontSize: format === "story" ? 30 : 22, color: ORANGE, textTransform: "uppercase", letterSpacing: "0.2em" }}>
              Critique
            </span>
            <span style={{ fontSize: format === "story" ? 74 : 54, fontWeight: 700, color: WHITE, lineHeight: 1.1 }}>
              {gameName}
            </span>

            {/* Étoiles */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {Array.from({ length: fullStars }).map((_, i) => (
                <div
                  key={`f${i}`}
                  style={{
                    width: format === "story" ? 34 : 28,
                    height: format === "story" ? 34 : 28,
                    background: ORANGE,
                    clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
                  }}
                />
              ))}
              {Array.from({ length: emptyStars }).map((_, i) => (
                <div
                  key={`e${i}`}
                  style={{
                    width: format === "story" ? 34 : 28,
                    height: format === "story" ? 34 : 28,
                    background: "#2a3040",
                    clipPath: "polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)",
                  }}
                />
              ))}
              <span style={{ fontSize: format === "story" ? 36 : 28, color: ORANGE, fontWeight: 700, marginLeft: 8 }}>
                {rating} / 5
              </span>
            </div>

            {reviewText && (
              <span style={{ fontSize: format === "story" ? 36 : 27, color: MUTED, lineHeight: 1.55, fontStyle: "italic" }}>
                "{reviewText}"
              </span>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: `20px ${padX}px ${format === "story" ? 80 : 36}px`,
              borderTop: "1px solid rgba(249,115,22,0.25)",
              marginTop: 16,
            }}
          >
            <span style={{ fontSize: format === "story" ? 30 : 24, color: MUTED }}>par @{username}</span>
            <span style={{ fontSize: format === "story" ? 30 : 24, fontWeight: 700, color: ORANGE, letterSpacing: "0.05em" }}>
              FACTIONY
            </span>
          </div>
        </div>
      ),
      { width: w, height: h }
    );

    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
      body: buffer.toString("base64"),
      isBase64Encoded: true,
    };

  } catch (err) {
    console.error("OG error:", err);
    return { statusCode: 500, body: "Error generating image" };
  }
};
