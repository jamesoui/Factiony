import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RAWG_API_KEY = Deno.env.get('VITE_RAWG_API_KEY') || '11b490685c024c71a0c6562e37e1a87d';

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('query') || url.searchParams.get('search');
    const pageSize = url.searchParams.get('page_size') || '20';

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query parameter is required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rawgUrl = `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=${pageSize}`;

    const response = await fetch(rawgUrl);

    if (!response.ok) {
      throw new Error(`RAWG API error: ${response.status}`);
    }

    const data = await response.json();

    const normalizedQuery = query.toLowerCase().trim();

    const resultsWithScore = data.results.map((game: any) => {
      const gameName = (game.name || '').toLowerCase();
      let score = 0;

      if (gameName === normalizedQuery) {
        score = 1000;
      } else if (gameName.startsWith(normalizedQuery)) {
        score = 500;
      } else if (gameName.includes(normalizedQuery)) {
        score = 100;
      } else {
        const queryWords = normalizedQuery.split(' ');
        const matchingWords = queryWords.filter((word: string) => gameName.includes(word));
        score = matchingWords.length * 10;
      }

      score += (game.rating || 0) * 2;
      score += (game.metacritic || 0) / 10;

      return { ...game, _score: score };
    });

    resultsWithScore.sort((a: any, b: any) => b._score - a._score);

    const gameIds = resultsWithScore.map((game: any) => game.id.toString());

    const { data: statsData } = await supabase
      .from('game_stats')
      .select('game_id, average_rating')
      .in('game_id', gameIds);

    const statsMap = new Map();
    if (statsData) {
      statsData.forEach((stat: any) => {
        statsMap.set(stat.game_id, stat.average_rating);
      });
    }

    const results = resultsWithScore.map((game: any) => {
      const { _score, ...gameData } = game;
      const factionyRating = statsMap.get(game.id.toString());

      return {
        ...gameData,
        factiony_rating: factionyRating || null,
        images: {
          cover_url: game.background_image || null,
        },
      };
    });

    return new Response(
      JSON.stringify({
        count: data.count,
        next: data.next,
        previous: data.previous,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in search-games function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});