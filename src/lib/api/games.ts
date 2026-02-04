import { fetchGameFromCacheOrAPI, fetchMultipleGamesFromCache, searchGamesWithCache } from './gameCache';

export interface GameData {
  id: number;
  slug: string;
  name: string;
  cover_url?: string;
  background_image?: string;
  description?: string;
  description_raw?: string;
  rating?: number;
  rating_top?: number;
  ratings_count?: number;
  metacritic?: number;
  platforms?: Array<{ platform: { id: number; name: string; slug: string } }>;
  release_date?: string;
  released?: string;
  developers?: Array<{ id: number; name: string; slug: string }>;
  publishers?: Array<{ id: number; name: string; slug: string }>;
  genres?: Array<{ id: number; name: string; slug: string }>;
  tags?: Array<{ id: number; name: string; slug: string }>;
  esrb_rating?: { id: number; name: string; slug: string };
  playtime?: number;
  screenshots?: Array<{ id: number; image: string }>;
  from_cache?: boolean;
  [key: string]: any;
}

export interface SearchResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: GameData[];
  from_cache?: boolean;
}

export async function getGame(query: string): Promise<GameData> {
  const locale = localStorage.getItem('language') || 'fr';
  const game = await fetchGameFromCacheOrAPI(query, locale);

  if (!game) {
    throw new Error(`Game not found: ${query}`);
  }

  return game;
}

export async function fetchGame(slugOrQuery: string): Promise<GameData> {
  return getGame(slugOrQuery);
}

export async function searchGames(query: string, page = 1, pageSize = 10): Promise<SearchResult> {
  const locale = localStorage.getItem('language') || 'fr';
  const games = await searchGamesWithCache(query, locale);

  return {
    count: games.length,
    next: null,
    previous: null,
    results: games.slice((page - 1) * pageSize, page * pageSize),
    from_cache: false,
  };
}

export async function fetchFeaturedGames(slugs: string[]): Promise<GameData[]> {
  const locale = localStorage.getItem('language') || 'fr';
  return await fetchMultipleGamesFromCache(slugs, locale);
}

export async function fetchTopRatedGames(limit = 10): Promise<GameData[]> {
  const topRatedSlugs = [
    'the-witcher-3-wild-hunt',
    'red-dead-redemption-2',
    'the-last-of-us',
    'god-of-war',
    'hades',
    'portal-2',
    'bioshock-infinite',
    'grand-theft-auto-v',
    'the-elder-scrolls-v-skyrim',
    'half-life-2'
  ];

  const locale = localStorage.getItem('language') || 'fr';
  const games = await fetchMultipleGamesFromCache(topRatedSlugs.slice(0, limit), locale);
  return games;
}

export async function fetchUpcomingGames(limit = 10): Promise<GameData[]> {
  const iconicUpcoming = [
    {
      id: 999999,
      name: "Grand Theft Auto VI",
      slug: "grand-theft-auto-vi",
      cover_url: "https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg",
      background_image: "https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg",
      released: "2025-12-31",
      release_date: "2025-12-31",
      rating: 0,
      genres: [{ id: 4, name: "Action", slug: "action" }],
      platforms: [],
      metacritic: null
    },
    {
      id: 999998,
      name: "Project 007",
      slug: "project-007",
      cover_url: "https://images.pexels.com/photos/1174746/pexels-photo-1174746.jpeg",
      background_image: "https://images.pexels.com/photos/1174746/pexels-photo-1174746.jpeg",
      released: "2026-01-01",
      release_date: "2026-01-01",
      rating: 0,
      genres: [{ id: 4, name: "Action", slug: "action" }],
      platforms: [],
      metacritic: null
    }
  ];

  const upcomingSlugs = [
    'the-elder-scrolls-vi',
    'hollow-knight-silksong',
    'fable',
    'perfect-dark',
    'silksong',
    'metroid-prime-4',
    'wolverine',
    'star-wars-knights-of-the-old-republic-remake'
  ];

  const locale = localStorage.getItem('language') || 'fr';
  const fetchedGames = await fetchMultipleGamesFromCache(upcomingSlugs.slice(0, limit - 2), locale);
  const games: GameData[] = [...iconicUpcoming, ...fetchedGames];

  return games.slice(0, limit);
}

export async function searchPopularGames(limit = 10): Promise<GameData[]> {
  const fallbackGames: GameData[] = [
    {
      id: 326243,
      slug: 'elden-ring',
      name: 'Elden Ring',
      background_image: 'https://media.rawg.io/media/games/b29/b294fdd866dcdb643e7bab370a552855.jpg',
      rating: 4.5,
      released: '2022-02-25',
      metacritic: 96,
      genres: [{ id: 4, name: 'Action', slug: 'action' }, { id: 5, name: 'RPG', slug: 'role-playing-games-rpg' }],
      platforms: []
    },
    {
      id: 28,
      slug: 'red-dead-redemption-2',
      name: 'Red Dead Redemption 2',
      background_image: 'https://media.rawg.io/media/games/511/5118aff5091cb3efec399c808f8c598f.jpg',
      rating: 4.6,
      released: '2018-10-26',
      metacritic: 97,
      genres: [{ id: 4, name: 'Action', slug: 'action' }],
      platforms: []
    },
    {
      id: 3328,
      slug: 'the-witcher-3-wild-hunt',
      name: 'The Witcher 3: Wild Hunt',
      background_image: 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg',
      rating: 4.7,
      released: '2015-05-18',
      metacritic: 92,
      genres: [{ id: 4, name: 'Action', slug: 'action' }, { id: 5, name: 'RPG', slug: 'role-playing-games-rpg' }],
      platforms: []
    },
    {
      id: 3498,
      slug: 'grand-theft-auto-v',
      name: 'Grand Theft Auto V',
      background_image: 'https://media.rawg.io/media/games/456/456dea5e1c7e3cd07060c14e96612001.jpg',
      rating: 4.5,
      released: '2013-09-17',
      metacritic: 97,
      genres: [{ id: 4, name: 'Action', slug: 'action' }],
      platforms: []
    },
    {
      id: 802,
      slug: 'borderlands-2',
      name: 'Borderlands 2',
      background_image: 'https://media.rawg.io/media/games/49c/49c3dfa4ce2f6f140cc4825868e858cb.jpg',
      rating: 4.0,
      released: '2012-09-18',
      metacritic: 89,
      genres: [{ id: 4, name: 'Action', slug: 'action' }],
      platforms: []
    },
    {
      id: 4200,
      slug: 'portal-2',
      name: 'Portal 2',
      background_image: 'https://media.rawg.io/media/games/328/3283617cb7d75d67257fc58339188742.jpg',
      rating: 4.6,
      released: '2011-04-18',
      metacritic: 95,
      genres: [{ id: 2, name: 'Shooter', slug: 'shooter' }],
      platforms: []
    },
    {
      id: 5286,
      slug: 'tomb-raider',
      name: 'Tomb Raider (2013)',
      background_image: 'https://media.rawg.io/media/games/021/021c4e21a1824d2526f925eff6324653.jpg',
      rating: 4.0,
      released: '2013-03-05',
      metacritic: 86,
      genres: [{ id: 4, name: 'Action', slug: 'action' }],
      platforms: []
    },
    {
      id: 13536,
      slug: 'portal',
      name: 'Portal',
      background_image: 'https://media.rawg.io/media/games/7fa/7fa0b586293c5861ee32490e953a4996.jpg',
      rating: 4.5,
      released: '2007-10-09',
      metacritic: 90,
      genres: [{ id: 2, name: 'Shooter', slug: 'shooter' }],
      platforms: []
    },
    {
      id: 12020,
      slug: 'left-4-dead-2',
      name: 'Left 4 Dead 2',
      background_image: 'https://media.rawg.io/media/games/d58/d588947d4286e7b5e0e12e1bea7d9844.jpg',
      rating: 4.1,
      released: '2009-11-17',
      metacritic: 89,
      genres: [{ id: 4, name: 'Action', slug: 'action' }],
      platforms: []
    },
    {
      id: 5679,
      slug: 'the-elder-scrolls-v-skyrim',
      name: 'The Elder Scrolls V: Skyrim',
      background_image: 'https://media.rawg.io/media/games/7cf/7cfc9220b401b7a300e409e539c9afd5.jpg',
      rating: 4.4,
      released: '2011-11-11',
      metacritic: 94,
      genres: [{ id: 4, name: 'Action', slug: 'action' }, { id: 5, name: 'RPG', slug: 'role-playing-games-rpg' }],
      platforms: []
    }
  ];

  const popularSlugs = [
    'elden-ring',
    'cyberpunk-2077',
    'baldurs-gate-3',
    'hogwarts-legacy',
    'resident-evil-4',
    'the-legend-of-zelda-breath-of-the-wild',
    'spider-man',
    'god-of-war-ragnarok',
    'minecraft',
    'fortnite'
  ];

  const locale = localStorage.getItem('language') || 'fr';
  const games = await fetchMultipleGamesFromCache(popularSlugs.slice(0, limit), locale);

  if (games.length === 0) {
    console.log("Utilisation des jeux de secours");
    return fallbackGames.slice(0, limit);
  }

  return games;
}

export async function searchGamesByQuery(query: string, page = 1, pageSize = 10): Promise<SearchResult> {
  return searchGames(query, page, pageSize);
}

export async function fetchRandomPopularGames(count: number = 10): Promise<GameData[]> {
  const allPopularSlugs = [
    'the-witcher-3-wild-hunt',
    'red-dead-redemption-2',
    'the-last-of-us',
    'god-of-war',
    'hades',
    'portal-2',
    'bioshock-infinite',
    'grand-theft-auto-v',
    'the-elder-scrolls-v-skyrim',
    'half-life-2',
    'elden-ring',
    'cyberpunk-2077',
    'baldurs-gate-3',
    'hogwarts-legacy',
    'resident-evil-4',
    'the-legend-of-zelda-breath-of-the-wild',
    'spider-man',
    'god-of-war-ragnarok',
    'horizon-zero-dawn',
    'dark-souls-iii',
    'bloodborne',
    'sekiro-shadows-die-twice',
    'hollow-knight',
    'celeste',
    'stardew-valley',
    'terraria',
    'minecraft',
    'undertale',
    'disco-elysium',
    'mass-effect-2'
  ];

  const shuffled = allPopularSlugs.sort(() => Math.random() - 0.5);
  const selectedSlugs = shuffled.slice(0, count);

  const locale = localStorage.getItem('language') || 'fr';
  return await fetchMultipleGamesFromCache(selectedSlugs, locale);
}

export async function fetchGamesByIds(gameIds: string[]): Promise<GameData[]> {
  const locale = localStorage.getItem('language') || 'fr';
  return await fetchMultipleGamesFromCache(gameIds, locale);
}
