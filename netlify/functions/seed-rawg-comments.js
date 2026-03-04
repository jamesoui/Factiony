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
    console.log("Starting seed...");
    
    const gamesRes = await fetch(
      `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&ordering=-rating&limit=100`
    );
    const gamesData = await gamesRes.json();
    
    console.log("Games fetched:", gamesData.results?.length);

    let commentsAdded = 0;
    let errors = [];

    for (const game of gamesData.results || []) {
      const content = game.description_raw || game.description || `${game.name} is a great game!`;
      
      const { error } = await supabase
        .from('game_comments')
        .insert({
          game_id: game.id.toString(),
          content: content.substring(0, 500),
          rating: Math.round(game.rating || 5),
          created_at: new Date().toISOString(),
        })
        .select();

      if (error) {
        console.log(`[${game.name}] ERROR:`, error);
        errors.push({ game: game.name, error: error.message });
      } else {
        commentsAdded++;
        console.log(`[${game.name}] SUCCESS`);
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Seeded ${commentsAdded} comments from RAWG`,
        errors: errors,
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