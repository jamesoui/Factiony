import type { Context } from "https://edge.netlify.com";
import satori from "https://esm.sh/satori@0.10.11";
import { Resvg } from "https://esm.sh/@resvg/resvg-js@2.4.0";

interface ReviewData {
  rating: number;
  review_text: string;
  user_id: string;
  game_id: string;
  game_slug: string;
}

interface GameData {
  name: string;
  background_image?: string;
  cover?: string;
}

interface UserData {
  username: string;
}

async function imageToDataUri(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('[og-review] Error converting image to data URI:', error);
    return null;
  }
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const pathname = url.pathname;

  const match = pathname.match(/\/og\/review\/(.+)\.png$/);
  const reviewId = match?.[1];

  if (!reviewId) {
    return new Response('Review ID not found', { status: 404 });
  }

  console.log('[og-review] Generating OG image for review:', reviewId);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://ffcocumtwoyydgsuhwxi.supabase.co';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseServiceKey) {
    console.error('[og-review] SUPABASE_SERVICE_ROLE_KEY not found');
    return new Response('Configuration error', { status: 500 });
  }

  try {
    const reviewResponse = await fetch(
      `${supabaseUrl}/rest/v1/game_ratings?id=eq.${reviewId}&select=rating,review_text,user_id,game_id,game_slug`,
      {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
      }
    );

    if (!reviewResponse.ok) {
      console.error('[og-review] Error fetching review:', await reviewResponse.text());
      return new Response('Review not found', { status: 404 });
    }

    const reviews = await reviewResponse.json() as ReviewData[];
    const review = reviews[0];

    if (!review) {
      return new Response('Review not found', { status: 404 });
    }

    const [gameResponse, userResponse] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/games?id=eq.${review.game_id}&select=name,background_image,cover`,
        {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
        }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${review.user_id}&select=username`,
        {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
        }
      ),
    ]);

    const games = await gameResponse.json() as GameData[];
    const users = await userResponse.json() as UserData[];

    const game = games[0];
    const user = users[0];

    const gameName = game?.name || 'Jeu';
    const username = user?.username || 'Utilisateur';
    const rating = review.rating;
    const reviewText = review.review_text
      ? review.review_text.replace(/\n/g, ' ').trim().slice(0, 140) + (review.review_text.length > 140 ? '...' : '')
      : 'Aucun commentaire';

    const coverUrl = game?.cover || game?.background_image;
    let backgroundDataUri: string | null = null;

    if (coverUrl) {
      backgroundDataUri = await imageToDataUri(coverUrl);
    }

    const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));

    const svg = await satori(
      {
        type: 'div',
        props: {
          style: {
            width: '1200px',
            height: '630px',
            display: 'flex',
            position: 'relative',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#1a1a1a',
          },
          children: [
            backgroundDataUri && {
              type: 'div',
              props: {
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                },
                children: [
                  {
                    type: 'img',
                    props: {
                      src: backgroundDataUri,
                      style: {
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: 'brightness(0.4) blur(2px)',
                      },
                    },
                  },
                ],
              },
            },
            {
              type: 'div',
              props: {
                style: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 100%)',
                },
              },
            },
            {
              type: 'div',
              props: {
                style: {
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '40px 50px',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  backdropFilter: 'blur(10px)',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '20px',
                      },
                      children: [
                        {
                          type: 'div',
                          props: {
                            style: {
                              fontSize: '48px',
                              fontWeight: '700',
                              color: '#ffffff',
                              marginRight: '20px',
                              lineHeight: 1.2,
                              maxWidth: '800px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            },
                            children: gameName,
                          },
                        },
                      ],
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '20px',
                      },
                      children: [
                        {
                          type: 'div',
                          props: {
                            style: {
                              display: 'flex',
                              alignItems: 'center',
                              backgroundColor: 'rgba(255, 149, 0, 0.2)',
                              padding: '10px 20px',
                              borderRadius: '12px',
                              border: '2px solid rgba(255, 149, 0, 0.5)',
                            },
                            children: [
                              {
                                type: 'span',
                                props: {
                                  style: {
                                    fontSize: '36px',
                                    color: '#FFD700',
                                    marginRight: '10px',
                                  },
                                  children: stars,
                                },
                              },
                              {
                                type: 'span',
                                props: {
                                  style: {
                                    fontSize: '32px',
                                    fontWeight: '700',
                                    color: '#ffffff',
                                  },
                                  children: `${rating}/5`,
                                },
                              },
                            ],
                          },
                        },
                      ],
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: '24px',
                        color: '#d1d5db',
                        marginBottom: '20px',
                        lineHeight: 1.4,
                        maxHeight: '120px',
                        overflow: 'hidden',
                      },
                      children: reviewText,
                    },
                  },
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      },
                      children: [
                        {
                          type: 'div',
                          props: {
                            style: {
                              fontSize: '22px',
                              color: '#9ca3af',
                            },
                            children: `Par ${username}`,
                          },
                        },
                        {
                          type: 'div',
                          props: {
                            style: {
                              fontSize: '28px',
                              fontWeight: '700',
                              color: '#ff9500',
                              letterSpacing: '1px',
                            },
                            children: 'FACTIONY',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ].filter(Boolean),
        },
      },
      {
        width: 1200,
        height: 630,
      }
    );

    const resvg = new Resvg(svg, {
      fitTo: {
        mode: 'width',
        value: 1200,
      },
    });

    const pngBuffer = resvg.render().asPng();

    return new Response(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        'X-Review-ID': reviewId,
      },
    });
  } catch (error) {
    console.error('[og-review] Error generating OG image:', error);

    const errorSvg = await satori(
      {
        type: 'div',
        props: {
          style: {
            width: '1200px',
            height: '630px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a1a',
            color: '#ffffff',
            fontSize: '48px',
            fontWeight: '700',
            fontFamily: 'system-ui',
          },
          children: 'Critique sur Factiony',
        },
      },
      {
        width: 1200,
        height: 630,
      }
    );

    const resvg = new Resvg(errorSvg);
    const pngBuffer = resvg.render().asPng();

    return new Response(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60',
      },
    });
  }
};
