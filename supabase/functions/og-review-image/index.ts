import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import satori from "npm:satori@0.10.11";
import { Resvg } from "npm:@resvg/resvg-js@2.6.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const reviewId = url.searchParams.get("id") || url.pathname.split("/").pop();

    if (!reviewId) {
      return new Response("Missing review ID", {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: review, error: reviewError } = await supabase
      .from("game_ratings")
      .select("id, user_id, game_id, rating, review_text, created_at")
      .eq("id", reviewId)
      .maybeSingle();

    if (reviewError || !review) {
      return new Response("Review not found", {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    const { data: user } = await supabase
      .from("users")
      .select("username, is_private")
      .eq("id", review.user_id)
      .maybeSingle();

    if (user?.is_private) {
      return new Response("Review is private", {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    const { data: game } = await supabase
      .from("games")
      .select("name, cover, background_image")
      .eq("id", review.game_id)
      .maybeSingle();

    const username = user?.username || "Anonymous";
    const gameName = game?.name || "Unknown Game";
    const coverUrl = game?.cover || game?.background_image || "";
    const rating = review.rating || 0;
    const reviewText = review.review_text || "";
    const excerpt = reviewText.length > 120 ? reviewText.slice(0, 120) + "..." : reviewText;

    const fontData = await fetch(
      "https://github.com/google/fonts/raw/main/ofl/inter/Inter-Bold.ttf"
    ).then((res) => res.arrayBuffer());

    const svg = await satori(
      {
        type: "div",
        props: {
          style: {
            width: "1200px",
            height: "630px",
            display: "flex",
            backgroundColor: "#0f172a",
            padding: "60px",
          },
          children: [
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  width: "100%",
                  height: "100%",
                  gap: "40px",
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        width: "360px",
                        height: "500px",
                        borderRadius: "20px",
                        overflow: "hidden",
                        backgroundColor: "#1e293b",
                      },
                      children: coverUrl
                        ? [
                            {
                              type: "img",
                              props: {
                                src: coverUrl,
                                style: {
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                },
                              },
                            },
                          ]
                        : [],
                    },
                  },
                  {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        flex: 1,
                      },
                      children: [
                        {
                          type: "div",
                          props: {
                            style: {
                              display: "flex",
                              flexDirection: "column",
                              gap: "20px",
                            },
                            children: [
                              {
                                type: "div",
                                props: {
                                  style: {
                                    fontSize: "48px",
                                    fontWeight: "bold",
                                    color: "#ffffff",
                                    lineHeight: 1.2,
                                  },
                                  children: gameName.length > 30 ? gameName.slice(0, 30) + "..." : gameName,
                                },
                              },
                              {
                                type: "div",
                                props: {
                                  style: {
                                    fontSize: "56px",
                                    fontWeight: "bold",
                                    color: "#facc15",
                                  },
                                  children: `${rating}/10`,
                                },
                              },
                              {
                                type: "div",
                                props: {
                                  style: {
                                    fontSize: "28px",
                                    color: "#cbd5e1",
                                    lineHeight: 1.4,
                                  },
                                  children: `"${excerpt}"`,
                                },
                              },
                              {
                                type: "div",
                                props: {
                                  style: {
                                    fontSize: "24px",
                                    color: "#94a3b8",
                                    marginTop: "20px",
                                  },
                                  children: `@${username}`,
                                },
                              },
                            ],
                          },
                        },
                        {
                          type: "div",
                          props: {
                            style: {
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-end",
                            },
                            children: [
                              {
                                type: "div",
                                props: {
                                  style: {
                                    fontSize: "20px",
                                    color: "#64748b",
                                  },
                                  children: "factiony.com",
                                },
                              },
                              {
                                type: "div",
                                props: {
                                  style: {
                                    fontSize: "32px",
                                    fontWeight: "bold",
                                    color: "#f97316",
                                  },
                                  children: "Factiony",
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Inter",
            data: fontData,
            weight: 700,
            style: "normal",
          },
        ],
      }
    );

    const resvg = new Resvg(svg, {
      fitTo: {
        mode: "width",
        value: 1200,
      },
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    return new Response(pngBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Error generating OG image:", error);
    return new Response(`Internal server error: ${error.message}`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }
});