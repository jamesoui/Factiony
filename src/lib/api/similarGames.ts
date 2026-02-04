import { Game } from '../../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface GameWithScore {
  game: any;
  score: number;
}

export interface SimilarGamesDebugInfo {
  tagsCurrent: number;
  genresCurrent: number;
  candidatePool: number;
  scored: number;
  fallbackUsed: boolean;
}

/**
 * Normalise une chaîne en slug pour comparaison et appels API
 * Ex: "Story Rich" -> "story-rich"
 */
function toSlug(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Extrait et normalise la valeur d'un tag/genre (string ou object)
 */
function extractValue(item: any): string {
  if (typeof item === 'string') return toSlug(item);
  if (item?.slug) return toSlug(item.slug);
  if (item?.name) return toSlug(item.name);
  if (item?.value) return toSlug(item.value);
  return '';
}

/**
 * Calcule le score de similarité entre deux jeux basé sur leurs tags et genres
 * Les paramètres sont déjà normalisés en slugs
 */
function calculateSimilarityScore(
  currentTagsSlugs: string[],
  currentGenresSlugs: string[],
  otherTagsSlugs: string[],
  otherGenresSlugs: string[]
): number {
  // Compter les tags en commun
  const commonTags = otherTagsSlugs.filter(tag =>
    currentTagsSlugs.includes(tag)
  ).length;

  // Compter les genres en commun
  const commonGenres = otherGenresSlugs.filter(genre =>
    currentGenresSlugs.includes(genre)
  ).length;

  // Score = (tags en commun * 3) + (genres en commun * 2)
  return (commonTags * 3) + (commonGenres * 2);
}

export async function getSimilarGames(
  gameId: number,
  genres?: string[],
  tags?: string[],
  limit = 6
): Promise<{ games: Game[]; debugInfo: SimilarGamesDebugInfo }> {
  const debugInfo: SimilarGamesDebugInfo = {
    tagsCurrent: (tags || []).length,
    genresCurrent: (genres || []).length,
    candidatePool: 0,
    scored: 0,
    fallbackUsed: false
  };

  try {
    // Si pas de genres ni de tags, retourner des jeux populaires variés
    if ((!genres || genres.length === 0) && (!tags || tags.length === 0)) {
      console.log('No genres or tags provided, fetching varied popular games as fallback');
      debugInfo.fallbackUsed = true;
      const games = await fetchPopularGames(gameId, limit, gameId);
      return { games, debugInfo };
    }

    // Normaliser en slugs AVANT l'appel API et le scoring
    const currentTagsSlugs = (tags || []).map(toSlug).filter(Boolean);
    const currentGenresSlugs = (genres || []).map(toSlug).filter(Boolean);

    // Récupérer un catalogue de jeux plus large (100+ jeux via plusieurs pages)
    const catalogGames = await fetchLargeCatalogGames(currentGenresSlugs, currentTagsSlugs, 100);
    debugInfo.candidatePool = catalogGames.length;

    // Calculer le score de similarité pour chaque jeu
    const gamesWithScores: GameWithScore[] = catalogGames
      .filter((g: any) => {
        // Exclure le jeu courant
        if (g.id === gameId) return false;

        // Exclure les jeux sans tags ni genres
        const hasTags = Array.isArray(g.tags) && g.tags.length > 0;
        const hasGenres = Array.isArray(g.genres) && g.genres.length > 0;

        return hasTags || hasGenres;
      })
      .map((g: any) => {
        // Extraire et normaliser en slugs
        const gameTagsSlugs = (g.tags || [])
          .map((t: any) => extractValue(t))
          .filter(Boolean);
        const gameGenresSlugs = (g.genres || [])
          .map((genre: any) => extractValue(genre))
          .filter(Boolean);

        const score = calculateSimilarityScore(
          currentTagsSlugs,
          currentGenresSlugs,
          gameTagsSlugs,
          gameGenresSlugs
        );

        return {
          game: g,
          score
        };
      })
      .filter(item => item.score > 0);

    debugInfo.scored = gamesWithScores.length;

    // Trier par score décroissant, puis par note décroissante
    gamesWithScores.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const ratingA = a.game.rating || (a.game.metacritic ? a.game.metacritic / 20 : 0);
      const ratingB = b.game.rating || (b.game.metacritic ? b.game.metacritic / 20 : 0);
      return ratingB - ratingA;
    });

    // Prendre les meilleurs
    let similarGames = gamesWithScores.slice(0, limit).map(item => item.game);

    // Si moins de 6 résultats, compléter avec un fallback varié
    if (similarGames.length < limit) {
      console.log(`Only ${similarGames.length} similar games found, completing with varied popular games`);
      debugInfo.fallbackUsed = true;
      const needed = limit - similarGames.length;
      const popularGames = await fetchPopularGames(gameId, needed + 10, gameId);

      const existingIds = new Set(similarGames.map(g => g.id));
      const additionalGames = popularGames
        .filter(g => !existingIds.has(g.id))
        .slice(0, needed);

      similarGames = [...similarGames, ...additionalGames];
    }

    // Convertir en format Game[]
    const formattedGames = similarGames.map((g: any) => ({
      id: g.id,
      name: g.name,
      images: {
        cover_url: g.background_image || null,
      },
      rating: g.rating,
      metacritic: g.metacritic,
      released: g.released,
      genres: Array.isArray(g.genres)
        ? g.genres.map((genre: any) => extractValue(genre)).filter(Boolean)
        : [],
    }));

    // Log debug détaillé
    console.log({
      gameId,
      currentTagsSlugs,
      currentGenresSlugs,
      catalogSize: catalogGames.length,
      scored: gamesWithScores.length,
      usedFallback: similarGames.length < limit
    });

    return { games: formattedGames, debugInfo };
  } catch (error) {
    console.error('Error fetching similar games:', error);
    return { games: [], debugInfo };
  }
}

/**
 * Récupère un large catalogue de jeux basé sur les genres et tags (déjà en slugs)
 * Utilise plusieurs pages pour obtenir un pool vraiment varié
 */
async function fetchLargeCatalogGames(
  genresSlugs: string[],
  tagsSlugs: string[],
  targetSize: number
): Promise<any[]> {
  try {
    const allGames: any[] = [];
    const pageSize = 40;
    const numPages = Math.ceil(targetSize / pageSize);

    for (let page = 1; page <= Math.min(numPages, 3); page++) {
      const params = new URLSearchParams();

      if (genresSlugs && genresSlugs.length > 0) {
        params.set('genres', genresSlugs.slice(0, 3).join(','));
      }

      if (tagsSlugs && tagsSlugs.length > 0) {
        params.set('tags', tagsSlugs.slice(0, 5).join(','));
      }

      params.set('page_size', String(pageSize));
      params.set('page', String(page));
      params.set('ordering', '-rating');

      const url = `${SUPABASE_URL}/functions/v1/rawg-games/games?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`API error for page ${page}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        allGames.push(...data.results);
      }

      if (!data.next) break;
    }

    return allGames;
  } catch (error) {
    console.error('Error fetching catalog games:', error);
    return [];
  }
}

/**
 * Récupère des jeux populaires variés selon un seed
 * Utilise une rotation pour que chaque jeu ait des recommandations différentes
 */
async function fetchPopularGames(
  excludeGameId: number,
  limit: number,
  seed?: number
): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    params.set('page_size', '40');
    params.set('ordering', '-rating');

    const url = `${SUPABASE_URL}/functions/v1/rawg-games/games?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const results = (data.results || []).filter((g: any) => g.id !== excludeGameId);

    if (results.length === 0) return [];

    // Si pas de seed, retourner simplement les premiers
    if (seed === undefined) {
      return results.slice(0, limit);
    }

    // Calculer offset basé sur le seed pour varier les résultats
    const offset = seed % results.length;

    // Rotation avec wrap-around
    const rotated: any[] = [];
    for (let i = 0; i < limit && results.length > 0; i++) {
      const index = (offset + i) % results.length;
      rotated.push(results[index]);
    }

    return rotated;
  } catch (error) {
    console.error('Error fetching popular games:', error);
    return [];
  }
}
