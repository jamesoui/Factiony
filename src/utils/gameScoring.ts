import { TOP_100_GAMES } from '../data/top100Games';

export interface ScoredGame {
  id: number;
  name: string;
  slug?: string;
  rating?: number;
  metacritic?: number;
  factiony_rating?: number;
  [key: string]: any;
}

export function getDisplayScore(game: ScoredGame): number {
  if (game.factiony_rating && game.factiony_rating > 0) {
    return game.factiony_rating;
  }

  if (game.metacritic && game.metacritic > 0) {
    return game.metacritic / 20;
  }

  if (game.rating && game.rating > 0) {
    return game.rating;
  }

  return 0;
}

export function boostTopGames<T extends ScoredGame>(games: T[]): T[] {
  const topSlugs = new Set(TOP_100_GAMES.map(g => g.slug.toLowerCase()));

  const topBoost: T[] = [];
  const rest: T[] = [];

  games.forEach(game => {
    const gameSlug = (game.slug || '').toLowerCase();
    if (gameSlug && topSlugs.has(gameSlug)) {
      topBoost.push(game);
    } else {
      rest.push(game);
    }
  });

  const sortByScore = (a: T, b: T) => {
    const scoreA = getDisplayScore(a);
    const scoreB = getDisplayScore(b);

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    const metacriticA = a.metacritic || 0;
    const metacriticB = b.metacritic || 0;

    if (metacriticB !== metacriticA) {
      return metacriticB - metacriticA;
    }

    return a.name.localeCompare(b.name);
  };

  topBoost.sort(sortByScore);
  rest.sort(sortByScore);

  return [...topBoost, ...rest];
}

export function hasActiveFilters(filters: Record<string, any>): boolean {
  return Object.values(filters).some(v => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return v.trim() !== '';
    return false;
  });
}
