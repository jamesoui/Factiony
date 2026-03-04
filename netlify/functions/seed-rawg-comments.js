const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
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
    
    const gamesRes = await fetch(
      `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-rating&limit=100`
    );
    const gamesData = await gamesRes.json();

    let commentsAdded = 0;

    for (const game of gamesData.results || []) {
      console.log(`Processing ${game.name}...`);
      
      // Créer un commentaire système basé sur la description du jeu
      if (game.description_raw || game.description) {
        const gameDesc = game.description_raw || game.description;
        const sentences = gameDesc.split('. ').slice(0, 2).join('. ');
        
        const { error } = await supabase
          .from('review_comments')
          .insert({
            game_id: game.id.toString(),
            user_id: null,
            content: sentences.substring(0, 500) || `${game.name} - Jeu populaire`,
            rating: Math.round(game.rating),
            created_at: game.updated || new Date().toISOString(),
          })
          .select();

        if (!error) {
          commentsAdded++;
          console.log(`Added comment for ${game.name}`);
        }
      }

      // Éviter de surcharger l'API RAWG
      await new Promise(resolve => setTimeout(resolve, 50));
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