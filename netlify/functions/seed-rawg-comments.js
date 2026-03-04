// netlify/functions/seed-rawg-comments.js

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  // Sécurité: clé secrète
  if (event.queryStringParameters?.key !== process.env.SEED_SECRET_KEY) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const RAWG_API_KEY = process.env.RAWG_API_KEY;

  try {
    console.log("Fetching popular games from RAWG...");
    
    // Fetch les 100 jeux les mieux notés
    const gamesRes = await fetch(
      `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-rating&limit=100`
    );
    const gamesData = await gamesRes.json();

    let commentsAdded = 0;

    // Pour chaque jeu
    for (const game of gamesData.results || []) {
      console.log(`Processing ${game.name}...`);
      
      // Fetch les reviews de ce jeu
      const reviewsRes = await fetch(
        `https://api.rawg.io/api/games/${game.id}/reviews?key=${RAWG_API_KEY}&limit=50`
      );
      const reviewsData = await reviewsRes.json();

      // Insert chaque review comme commentaire
      for (const review of reviewsData.results || []) {
        const { error } = await supabase
          .from('review_comments')
          .insert({
            game_id: game.id.toString(),
            user_id: null, // system comment
            content: review.text ? review.text.substring(0, 500) : `${review.title}: ${review.summary}`,
            rating: review.rating,
            created_at: review.created,
          })
          .select();

        if (!error) commentsAdded++;
      }

      // Éviter de surcharger l'API RAWG
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Seeded ${commentsAdded} comments from RAWG`,
      }),
    };
  } catch (error) {
    console.error('Seed error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};