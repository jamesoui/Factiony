import { supabase } from '../supabaseClient';

export interface PublicReview {
  id: string;
  user_id: string;
  game_id: string;
  game_slug: string;
  rating: number;
  review_text: string;
  created_at: string;
  updated_at: string;
  username?: string;
  avatar_url?: string;
  is_verified?: boolean;
  is_premium?: boolean;
  game_name?: string;
  game_cover?: string;
  game_background?: string;
}

export async function getPublicReview(reviewId: string): Promise<PublicReview | null> {
  const { data: review, error } = await supabase
    .from('game_ratings')
    .select(`
      id,
      user_id,
      game_id,
      game_slug,
      rating,
      review_text,
      created_at,
      updated_at
    `)
    .eq('id', reviewId)
    .maybeSingle();

  if (error || !review) {
    console.error('Error fetching review:', error);
    return null;
  }

  const { data: userData } = await supabase
    .from('users')
    .select('username, avatar_url, is_verified, is_premium, is_private')
    .eq('id', review.user_id)
    .maybeSingle();

  if (userData?.is_private) {
    return null;
  }

  const { data: gameData } = await supabase
    .from('games')
    .select('name, cover, background_image')
    .eq('id', review.game_id)
    .maybeSingle();

  return {
    ...review,
    username: userData?.username || 'Anonymous',
    avatar_url: userData?.avatar_url,
    is_verified: userData?.is_verified || false,
    is_premium: userData?.is_premium || false,
    game_name: gameData?.name || 'Unknown Game',
    game_cover: gameData?.cover || gameData?.background_image,
    game_background: gameData?.background_image
  };
}

export async function getUserReviews(userId: string, limit: number = 10): Promise<PublicReview[]> {
  const { data: reviews, error } = await supabase
    .from('game_ratings')
    .select(`
      id,
      user_id,
      game_id,
      game_slug,
      rating,
      review_text,
      created_at,
      updated_at
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !reviews) {
    console.error('Error fetching user reviews:', error);
    return [];
  }

  const { data: userData } = await supabase
    .from('users')
    .select('username, avatar_url, is_verified, is_premium, is_private')
    .eq('id', userId)
    .maybeSingle();

  if (userData?.is_private) {
    return [];
  }

  const gameIds = [...new Set(reviews.map(r => r.game_id))];
  const { data: gamesData } = await supabase
    .from('games')
    .select('id, name, cover, background_image')
    .in('id', gameIds);

  const gamesMap = new Map(gamesData?.map(g => [g.id, g]) || []);

  return reviews.map(review => {
    const game = gamesMap.get(review.game_id);
    return {
      ...review,
      username: userData?.username || 'Anonymous',
      avatar_url: userData?.avatar_url,
      is_verified: userData?.is_verified || false,
      is_premium: userData?.is_premium || false,
      game_name: game?.name || 'Unknown Game',
      game_cover: game?.cover || game?.background_image,
      game_background: game?.background_image
    };
  });
}
