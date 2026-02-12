import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, X, ChevronDown, ChevronUp, Loader } from 'lucide-react';
import { mockUsers } from '../../data/mockData';
import GameCard from '../GameCard';
import UserProfileView from './UserProfileView';
import TopGamesSection from '../TopGamesSection';
import ActiveFiltersChips from '../ActiveFiltersChips';
import { Game } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { searchGames as searchGamesAPI, getGamesWithFilters } from '../../apiClient';
import { GameData } from '../../lib/api/games';
import { computeGlobalRating } from '../../lib/utils/ratings';
import { searchUsers, UserProfile, getFollowerCount, getFollowingCount } from '../../lib/api/users';
import { calculateDisplayRating } from '../../lib/utils/ratingCalculator';
import { TOP_100_GAMES } from '../../data/top100Games';
import { gameToSlug } from '../../utils/slugify';
import AdBanner from "../ads/AdBanner";

interface SearchViewProps {
  initialQuery?: string;
  initialFilters?: {
    year?: string;
    platform?: string;
    tag?: string;
    multiplayer?: boolean;
  };
  onViewChange?: (view: string, userId?: string) => void;
  onUserClick?: (userId: string) => void;
}

const SearchView: React.FC<SearchViewProps> = ({ initialQuery = '', initialFilters, onViewChange, onUserClick }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [searchType, setSearchType] = useState<'games' | 'users'>('games');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  const [games, setGames] = useState<GameData[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userStats, setUserStats] = useState<Record<string, { followers: number; following: number }>>({});
  const [loading, setLoading] = useState(false);
  const isInitialMount = useRef(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [battleRoyalePinnedGames, setBattleRoyalePinnedGames] = useState<GameData[]>([]);

  const defaultFilters = {
    year: '',
    platform: '',
    tag: '',
    multiplayer: false,
    ...initialFilters
  };

  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

  const sortBy = '-rating';

  const publishers: string[] = [];
  const genres: string[] = [];
  const years: string[] = [];

  const playerCountOptions = ['Solo', '2 joueurs', '3 joueurs', '4+ joueurs'];
  const ratingOptions = ['4.5+ étoiles', '4.0+ étoiles', '3.5+ étoiles', '3.0+ étoiles'];

  const fetchGames = useCallback(async (query: string, pageNum: number) => {
    if (searchType !== 'games') return;

    try {
      setLoading(true);
      setError(null);

      if (searchQuery && searchQuery.trim().length >= 3) {
        const data = await searchGamesAPI(searchQuery, 20);

        const result = {
          count: data.results?.length || 0,
          next: data.next || null,
          previous: data.previous || null,
          results: (data.results || []).map((game: any) => ({
            id: game.id,
            name: game.name,
            slug: game.slug || '',
            cover_url: game.images?.cover_url || game.background_image,
            background_image: game.background_image,
            rating: game.rating,
            released: game.released,
            release_date: game.release_date,
            genres: game.genres,
            platforms: game.platforms,
            developers: game.developers,
            publishers: game.publishers,
            metacritic: game.metacritic,
            tags: game.tags || []
          }))
        };

        if (pageNum === 1) {
          setGames(result.results);
        } else {
          setGames(prev => [...prev, ...result.results]);
        }

        setHasMore(result.next !== null);
      } else {
        const params: Record<string, any> = {
          page_size: 20,
          page: pageNum,
        };

        if (appliedFilters.year) {
          params.dates = `${appliedFilters.year}-01-01,${appliedFilters.year}-12-31`;
        }

        if (appliedFilters.platform) {
          params.platforms = appliedFilters.platform;
        }

        if (appliedFilters.tag) {
          params.tags = appliedFilters.tag;
        }

        if (appliedFilters.multiplayer) {
          params.tags = 'multiplayer';
        }

        if (sortBy !== 'relevance') {
          params.ordering = sortBy;
        } else {
          params.ordering = '-added,-rating,-ratings_count';
        }

        const data = await getGamesWithFilters(params);

        const result = {
          count: data.results?.length || 0,
          next: data.next || null,
          previous: data.previous || null,
          results: (data.results || []).map((game: any) => ({
            id: game.id,
            name: game.name,
            slug: game.slug || '',
            cover_url: game.images?.cover_url || game.background_image,
            background_image: game.background_image,
            rating: game.rating,
            released: game.released,
            release_date: game.release_date,
            genres: game.genres,
            platforms: game.platforms,
            developers: game.developers,
            publishers: game.publishers,
            metacritic: game.metacritic,
            tags: game.tags || []
          }))
        };

        if (pageNum === 1) {
          setGames(result.results);
        } else {
          setGames(prev => [...prev, ...result.results]);
        }

        setHasMore(result.next !== null);
      }
    } catch (err) {
      console.error('Erreur de recherche:', err);
      const errorMessage = err instanceof Error && err.message.includes('Network error')
        ? 'Erreur réseau. Vérifie ta connexion et réessaie.'
        : 'Aucun jeu trouvé. Vérifie le titre ou essaie un mot-clé plus court.';
      setError(errorMessage);
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [searchType, searchQuery, appliedFilters, sortBy]);

  useEffect(() => {
    if (isInitialMount.current && searchType === 'games') {
      isInitialMount.current = false;
      if (initialQuery) {
        fetchGames(initialQuery, 1);
      }
    }
  }, [fetchGames, initialQuery, searchType]);

  useEffect(() => {
    if (!isInitialMount.current) {
      const timer = setTimeout(() => {
        if (searchType === 'games') {
          setPage(1);
          fetchGames(searchQuery, 1);
        } else {
          setGames([]);
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [searchQuery, searchType, appliedFilters, sortBy, fetchGames]);

  useEffect(() => {
    if (initialQuery && initialQuery !== searchQuery) {
      setSearchQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    const rawTag = typeof appliedFilters.tag === 'object' && appliedFilters.tag !== null
      ? (appliedFilters.tag as any).value
      : (appliedFilters.tag ?? '');
    const tagSlug = String(rawTag).trim().toLowerCase().replace(/[_\s]+/g, '-');
    const isBattleRoyaleFilter = tagSlug === 'battle-royale';

    if (!isBattleRoyaleFilter) {
      setBattleRoyalePinnedGames([]);
      return;
    }

    const pinnedGameSearchTerms = [
      'fortnite',
      'playerunknown battlegrounds',
      'call of duty warzone',
      'apex legends'
    ];

    const fetchPinnedGames = async () => {
      const fetchedGames: GameData[] = [];

      for (const searchTerm of pinnedGameSearchTerms) {
        try {
          const data = await searchGamesAPI(searchTerm, 1);
          if (data.results && data.results.length > 0) {
            const game = data.results[0];
            fetchedGames.push({
              id: game.id,
              name: game.name,
              slug: game.slug || '',
              cover_url: game.images?.cover_url || game.background_image,
              background_image: game.background_image,
              rating: game.rating,
              released: game.released,
              release_date: game.release_date,
              genres: game.genres,
              platforms: game.platforms,
              developers: game.developers,
              publishers: game.publishers,
              metacritic: game.metacritic,
              tags: game.tags || []
            });
          }
        } catch (error) {
          console.error(`Error fetching ${searchTerm}:`, error);
        }
      }

      setBattleRoyalePinnedGames(fetchedGames);
    };

    fetchPinnedGames();
  }, [appliedFilters.tag]);

  const draftFiltersCount =
    (draftFilters.year ? 1 : 0) +
    (draftFilters.platform ? 1 : 0) +
    (draftFilters.tag ? 1 : 0) +
    (draftFilters.multiplayer ? 1 : 0);

  const appliedFiltersCount =
    (appliedFilters.year ? 1 : 0) +
    (appliedFilters.platform ? 1 : 0) +
    (appliedFilters.tag ? 1 : 0) +
    (appliedFilters.multiplayer ? 1 : 0);

  const hasActiveFilters = searchQuery.trim() !== '' || appliedFiltersCount > 0;

  const hasUnappliedChanges = JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters);

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setShowFilters(false);
    setPage(1);
  };

  const resetFilters = () => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPage(1);
  };

  const removeAppliedFilter = (filterKey: keyof typeof defaultFilters) => {
    const newFilters = { ...appliedFilters, [filterKey]: filterKey === 'multiplayer' ? false : '' };
    setAppliedFilters(newFilters);
    setDraftFilters(newFilters);
    setPage(1);
  };

  const handleGameClick = (gameData: GameData) => {
    const slug = gameToSlug(gameData.id.toString(), gameData.name);
    navigate(`/game/${slug}`, { state: { from: window.location.pathname } });
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchGames(searchQuery, nextPage);
  };

  const handleRate = (rating: number) => {
    console.log('Rating:', rating);
  };

  const handleReview = (review: string, rating: number) => {
    console.log('Review:', review, 'Rating:', rating);
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setShowUserProfile(true);
  };

  const handleTopGameClick = async (slug: string) => {
    try {
      setLoading(true);
      const data = await searchGamesAPI(slug, 1);

      if (data.results && data.results.length > 0) {
        const gameData = data.results[0];
        handleGameClick(gameData);
      }
    } catch (error) {
      console.error('Error loading top game:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = useCallback(async (query: string) => {
    if (searchType !== 'users' || !query.trim() || query.trim().length < 2) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const results = await searchUsers(query.trim());
      setUsers(results);

      const stats: Record<string, { followers: number; following: number }> = {};
      await Promise.all(
        results.map(async (user) => {
          const [followers, following] = await Promise.all([
            getFollowerCount(user.id),
            getFollowingCount(user.id)
          ]);
          stats[user.id] = { followers, following };
        })
      );
      setUserStats(stats);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Erreur lors de la recherche d\'utilisateurs');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [searchType]);

  useEffect(() => {
    if (searchType === 'users') {
      const timer = setTimeout(() => {
        fetchUsers(searchQuery);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [searchQuery, searchType, fetchUsers]);

  const displayedGames = useMemo(() => {
    if (games.length === 0) {
      return games;
    }

    const hasSearch = searchQuery.trim().length >= 3;
    const hasFilters = appliedFiltersCount > 0;

    if (!hasSearch && !hasFilters) {
      return games;
    }

    const rawTag = typeof appliedFilters.tag === 'object' && appliedFilters.tag !== null
      ? (appliedFilters.tag as any).value
      : (appliedFilters.tag ?? '');

    const tagSlug = String(rawTag).trim().toLowerCase().replace(/[_\s]+/g, '-');
    const isBattleRoyaleFilter = tagSlug === 'battle-royale';

    const sortByScore = (a: GameData, b: GameData) => {
      const ratingA = calculateDisplayRating(a.rating, a.metacritic) || 0;
      const ratingB = calculateDisplayRating(b.rating, b.metacritic) || 0;

      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }

      const metacriticA = a.metacritic || 0;
      const metacriticB = b.metacritic || 0;

      if (metacriticB !== metacriticA) {
        return metacriticB - metacriticA;
      }

      return (a.name || '').localeCompare(b.name || '');
    };

    if (isBattleRoyaleFilter && battleRoyalePinnedGames.length > 0) {
      const pinnedIds = new Set(battleRoyalePinnedGames.map(g => g.id));
      const restGames = games.filter(g => !pinnedIds.has(g.id));
      restGames.sort(sortByScore);
      return [...battleRoyalePinnedGames, ...restGames];
    }

    const topSlugs = new Set(TOP_100_GAMES.map(g => g.slug.toLowerCase()));
    const topBoost: GameData[] = [];
    const rest: GameData[] = [];

    games.forEach(game => {
      const gameSlug = (game.slug || '').toLowerCase();
      if (gameSlug && topSlugs.has(gameSlug)) {
        topBoost.push(game);
      } else {
        rest.push(game);
      }
    });

    topBoost.sort(sortByScore);
    rest.sort(sortByScore);

    return [...topBoost, ...rest];
  }, [games, appliedFiltersCount, appliedFilters.tag, battleRoyalePinnedGames, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen">
      <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setSearchType('games')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              searchType === 'games'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t('search.games')}
          </button>
          <button
            onClick={() => setSearchType('users')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              searchType === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t('search.users')}
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchType === 'games' ? t('search.searchGames') : t('search.searchUsers')}
            className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {searchType === 'games' && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  showFilters || appliedFiltersCount > 0
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>{t('search.filters')}</span>
                {appliedFiltersCount > 0 && (
                  <span className="bg-blue-800 text-blue-200 px-2 py-0.5 rounded-full text-xs">
                    {appliedFiltersCount}
                  </span>
                )}
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {showFilters && searchType === 'games' && (
        <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-gray-400 mb-2 text-sm font-medium">Année</label>
              <input
                type="number"
                placeholder="ex: 2023"
                value={draftFilters.year}
                onChange={(e) => setDraftFilters({ ...draftFilters, year: e.target.value })}
                className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-2 text-sm font-medium">Plateforme</label>
              <select
                value={draftFilters.platform}
                onChange={(e) => setDraftFilters({ ...draftFilters, platform: e.target.value })}
                className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes</option>
                <option value="4">PC</option>
                <option value="187">PlayStation 5</option>
                <option value="18">PlayStation 4</option>
                <option value="1">Xbox One</option>
                <option value="186">Xbox Series S/X</option>
                <option value="7">Nintendo Switch</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-2 text-sm font-medium">Tags</label>
              <select
                value={draftFilters.tag}
                onChange={(e) => setDraftFilters({ ...draftFilters, tag: e.target.value })}
                className="w-full p-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous</option>
                <option value="action">Action</option>
                <option value="action-adventure">Action-Adventure</option>
                <option value="action-rpg">Action RPG</option>
                <option value="adventure">Aventure</option>
                <option value="atmospheric">Atmospheric</option>
                <option value="battle">Battle</option>
                <option value="battle-royale">Battle Royale</option>
                <option value="blood">Blood</option>
                <option value="character">Character</option>
                <option value="character-customization">Character Customization</option>
                <option value="choices-matter">Choices Matter</option>
                <option value="cinematic">Cinematic</option>
                <option value="co-op">Coopération</option>
                <option value="combat">Combat</option>
                <option value="cooperative">Cooperative</option>
                <option value="crime">Crime</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="dark">Dark</option>
                <option value="explore">Explore</option>
                <option value="exploration">Exploration</option>
                <option value="family-friendly">Family Friendly</option>
                <option value="fantasy">Fantasy</option>
                <option value="first-person">First-Person</option>
                <option value="fps">FPS</option>
                <option value="free-to-play">Free to Play</option>
                <option value="friends">Friends</option>
                <option value="futuristic">Futuristic</option>
                <option value="gore">Gore</option>
                <option value="great-soundtrack">Great Soundtrack</option>
                <option value="journey">Journey</option>
                <option value="magic">Magic</option>
                <option value="masterpiece">Masterpiece</option>
                <option value="mature">Mature</option>
                <option value="military">Military</option>
                <option value="multiplayer">Multijoueur</option>
                <option value="nudity">Nudity</option>
                <option value="online">Online</option>
                <option value="online-pvp">Online PvP</option>
                <option value="open-world">Open World</option>
                <option value="pvp">PvP</option>
                <option value="realistic">Realistic</option>
                <option value="robots">Robots</option>
                <option value="role-playing">Role-Playing</option>
                <option value="rpg">RPG</option>
                <option value="sandbox">Sandbox</option>
                <option value="school">School</option>
                <option value="sci-fi">Sci-fi</option>
                <option value="secrets">Secrets</option>
                <option value="sexual-content">Sexual Content</option>
                <option value="singleplayer">Solo</option>
                <option value="story">Story</option>
                <option value="story-rich">Story Rich</option>
                <option value="survival">Survival</option>
                <option value="third-person">Third Person</option>
                <option value="violent">Violent</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftFilters.multiplayer}
                  onChange={(e) => setDraftFilters({ ...draftFilters, multiplayer: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-300 text-sm">Jeux multijoueurs uniquement</span>
              </label>
            </div>
          </div>

          {hasUnappliedChanges && (
            <div className="mb-4 text-xs text-orange-400 flex items-center gap-1">
              <span>⚠️ Modifications non appliquées</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-700">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
            >
              Réinitialiser
            </button>
            <button
              onClick={applyFilters}
              disabled={!hasUnappliedChanges}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                hasUnappliedChanges
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Appliquer les filtres
            </button>
          </div>
        </div>
      )}

      {searchType === 'games' && appliedFiltersCount > 0 && (
        <ActiveFiltersChips
          filters={appliedFilters}
          onRemoveFilter={removeAppliedFilter}
          onClearAll={resetFilters}
        />
      )}

      {searchType === 'games' ? (
        <div>
          {/* Show TopGamesSection only in discovery mode (no filters and no search) */}
          {!hasActiveFilters && (
            <TopGamesSection onGameClick={handleTopGameClick} />
          )}

          {/* Show search results when filters or search are active */}
          {hasActiveFilters && (
            <>
              {searchQuery.trim() && (
                <h2 className="text-2xl font-bold text-white mb-4">
                  {t('search.results')} "{searchQuery}"
                </h2>
              )}

              {loading && page === 1 && (
                <div className="flex items-center justify-center py-12">
                  <Loader className="h-12 w-12 text-orange-500 animate-spin" />
                </div>
              )}

              {error && (
                <div className="bg-red-900/20 border border-red-700 text-red-400 rounded-lg p-4 mb-4">
                  {error}
                </div>
              )}

              {!loading && !error && games.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg mb-2">
                    {t('search.noResults')} "{searchQuery}"
                  </p>
                  <p className="text-gray-500 text-sm">{t('search.tryOtherKeywords')}</p>
                </div>
              )}

              {games.length > 0 && (
  <>
    {(() => {
      const SPLIT_INDEX = 15; // 3 lignes desktop (lg:grid-cols-5)
      const firstBatch = displayedGames.slice(0, SPLIT_INDEX);
      const secondBatch = displayedGames.slice(SPLIT_INDEX);

      const renderGameItem = (game: any) => {
        const excludedTags = [
          'steam', 'xbox', 'playstation', 'nintendo', 'controller', 'fps',
          'achievements', 'cloud', 'vr', 'mobile', 'singleplayer',
          'multiplayer', 'co-op'
        ];

        const gameTags = Array.isArray(game.tags) ? game.tags : [];
        const filteredTags = gameTags
          .filter((tag: any) => {
            const tagName = typeof tag === 'string' ? tag : tag?.name;
            return tagName && !excludedTags.some(excluded => tagName.toLowerCase().includes(excluded));
          })
          .slice(0, 5);

        return (
          <div key={game.id} className="cursor-pointer">
            <div onClick={() => handleGameClick(game)}>
              <GameCard
                game={{
                  id: game.id.toString(),
                  title: game.name,
                  coverUrl: game.cover_url || game.background_image || '/placeholder.jpg',
                  rating: 0,
                  releaseDate: game.released || game.release_date || '',
                  genres: Array.isArray(game.genres)
                    ? game.genres.filter((g: any) => g && g.name).map((g: any) => g.name)
                    : [],
                  platforms: Array.isArray(game.platforms)
                    ? game.platforms.filter((p: any) => p && p.platform && p.platform.name).map((p: any) => p.platform.name)
                    : [],
                  developer: game.developers?.[0]?.name || 'Unknown',
                  publisher: game.publishers?.[0]?.name || 'Unknown',
                  description: '',
                  metacritic: game.metacritic
                }}
                onClick={() => handleGameClick(game)}
              />
            </div>

            {filteredTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {filteredTags.map((tag: any, idx: number) => {
                  const tagName = typeof tag === 'string' ? tag : tag?.name;
                  const tagSlug = typeof tag === 'string' ? tag.toLowerCase() : tag?.slug;
                  return (
                    <button
                      key={`${tagSlug}-${idx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const newTag = tagSlug || tagName.toLowerCase();
                        setDraftFilters({ ...draftFilters, tag: newTag });
                        setAppliedFilters({ ...appliedFilters, tag: newTag });
                        setPage(1);
                      }}
                      className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded text-[10px] hover:bg-blue-800/70 transition-colors"
                    >
                      {tagName}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      };

      return (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
            {firstBatch.map(renderGameItem)}
          </div>

          {displayedGames.length > SPLIT_INDEX && (
  <AdBanner slot="9798609443" className="my-3" />
)}

          {secondBatch.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
              {secondBatch.map(renderGameItem)}
            </div>
          )}
        </>
      );
    })()}

    {hasMore && !loading && (
      <div className="flex justify-center">
        <button
          onClick={handleLoadMore}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Afficher plus
        </button>
      </div>
    )}

    {loading && page > 1 && (
      <div className="flex items-center justify-center py-4">
        <Loader className="h-12 w-12 text-orange-500 animate-spin" />
      </div>
    )}
  </>
)}
            </>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">
            {t('search.results')} {searchQuery && `"${searchQuery}"`}
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-12 w-12 text-orange-500 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-2">
                {searchQuery.trim().length < 2
                  ? "Saisissez au moins 2 caractères pour rechercher"
                  : `${t('search.noUsersFound')} "${searchQuery}"`
                }
              </p>
              {searchQuery.trim().length >= 2 && (
                <p className="text-gray-500 text-sm">{t('search.tryOtherUsers')}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => {
                const stats = userStats[user.id] || { followers: 0, following: 0 };
                return (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user.id)}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <img
                        src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                        alt={user.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          <h3 className="font-semibold text-white">{user.username}</h3>
                          {user.is_verified && (
                            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          {user.is_premium && (
                            <span className="text-xs bg-gradient-to-r from-orange-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
                              Premium
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          {stats.followers} {t('search.followers')} · {stats.following} {t('search.following')}
                        </p>
                      </div>
                    </div>
                    {user.bio && (
                      <p className="text-sm text-gray-400 line-clamp-2">{user.bio}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedUserId && (
        <UserProfileView
          isOpen={showUserProfile}
          onClose={() => setShowUserProfile(false)}
          userId={selectedUserId}
          onViewChange={onViewChange}
          onUserClick={handleUserClick}
        />
      )}
    </div>
  );
};

export default SearchView;
