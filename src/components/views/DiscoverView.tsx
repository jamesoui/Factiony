import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import GameCard from '../GameCard';
import FriendsActivitySection from '../FriendsActivitySection';
import HorizontalGameSection from '../HorizontalGameSection';
import { Game } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { getTopRated, getMostAnticipated } from '../../apiClient';
import { getTrendingGames, getTopRatedGames, getRecentlyRatedGames, getTopRatedGamesWithCompositeScore } from '../../lib/api/ratings';
import { fetchGamesByIds, searchPopularGames } from '../../lib/api/games';
import { getMostFollowedUnreleasedGames } from '../../lib/api/gameFollows';
import { gameDataCache } from '../../lib/gameDataCache';
import { supabase } from '../../lib/supabaseClient';
import { gameToSlug } from '../../utils/slugify';
import AdBanner from "../ads/AdBanner";

interface DiscoverViewProps {
  onViewChange?: (view: string, userId?: string) => void;
  onUserClick?: (userId: string) => void;
}

const DiscoverView: React.FC<DiscoverViewProps> = ({ onViewChange, onUserClick }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [topRatedGames, setTopRatedGames] = useState<Game[]>([]);
  const [anticipatedGames, setAnticipatedGames] = useState<Game[]>([]);
  const [trendingGames, setTrendingGames] = useState<Game[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL ?? "https://europe-west1-factiony-1fc0f.cloudfunctions.net/apiFunction";
  const FACTIONY_KEY = import.meta.env.VITE_FACTIONY_KEY ?? "FACTIONY_KEY_35d39805f838ac70aa9dca01e4e3ff0764e638dd341728f4";

  const transformGenres = (genres: any): string[] => {
    if (!Array.isArray(genres)) return [];
    return genres.map((g: any) => (typeof g === 'string' ? g : g?.name)).filter(Boolean);
  };

  const transformPlatforms = (platforms: any): string[] => {
    if (!Array.isArray(platforms)) return [];
    return platforms.map((p: any) => (typeof p === 'string' ? p : p?.platform?.name || p?.name)).filter(Boolean);
  };

  async function fetchRandomReleased() {
    const randomPage = Math.floor(Math.random() * 50) + 1;
    const res = await fetch(`${API_URL}/games?page_size=10&page=${randomPage}`, {
      headers: { "x-factiony-key": FACTIONY_KEY },
    });
    const json = await res.json();
    return (json.results || [])
      .filter((g: any) => g.released && new Date(g.released) <= new Date())
      .map((game: any) => ({
        id: game.id.toString(),
        title: game.name,
        coverUrl: game.images?.cover_url || game.background_image || '/placeholder.jpg',
        rating: game.rating || 0,
        releaseDate: game.released || '',
        genres: transformGenres(game.genres),
        platforms: transformPlatforms(game.platforms),
        developer: game.developers?.[0] || 'Unknown',
        publisher: game.publishers?.[0] || 'Unknown',
        description: game.description || '',
        metacritic: game.metacritic,
        playtime: game.playtime,
        esrbRating: game.esrb_rating
      }));
  }

  async function fetchRandomUpcoming() {
    const randomPage = Math.floor(Math.random() * 50) + 1;
    const res = await fetch(`${API_URL}/games?page_size=10&page=${randomPage}`, {
      headers: { "x-factiony-key": FACTIONY_KEY },
    });
    const json = await res.json();
    return (json.results || [])
      .filter((g: any) => {
        if (!g.released) return true;
        const releaseDate = new Date(g.released);
        const today = new Date();
        return g.tba === true || releaseDate.getTime() > today.getTime();
      })
      .map((game: any) => ({
        id: game.id.toString(),
        title: game.name,
        coverUrl: game.images?.cover_url || game.background_image || '/placeholder.jpg',
        rating: game.rating || 0,
        releaseDate: game.released || '',
        genres: transformGenres(game.genres),
        platforms: transformPlatforms(game.platforms),
        developer: game.developers?.[0] || 'Unknown',
        publisher: game.publishers?.[0] || 'Unknown',
        description: game.description || '',
        metacritic: game.metacritic,
        playtime: game.playtime,
        esrbRating: game.esrb_rating
      }));
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setTrendingLoading(true);

      async function loadTrendingGames() {
        try {
          let allStats: any[] = [];

          // 1. Obtenir les jeux en tendance
          const trendingStats = await getTrendingGames(10);
          allStats = [...trendingStats];

          // 2. Si moins de 10, compléter avec les jeux récemment notés
          if (allStats.length < 10) {
            const neededCount = 10 - allStats.length;
            const recentStats = await getRecentlyRatedGames(neededCount + 5);

            // Filtrer pour éviter les doublons
            const existingIds = new Set(allStats.map(s => s.game_id));
            const newRecent = recentStats.filter(s => !existingIds.has(s.game_id));
            allStats = [...allStats, ...newRecent.slice(0, neededCount)];
          }

          // 3. Si toujours moins de 10, compléter avec les jeux les mieux notés
          if (allStats.length < 10) {
            const neededCount = 10 - allStats.length;
            const topRatedStats = await getTopRatedGames(neededCount + 5);

            // Filtrer pour éviter les doublons
            const existingIds = new Set(allStats.map(s => s.game_id));
            const newTopRated = topRatedStats.filter(s => !existingIds.has(s.game_id));
            allStats = [...allStats, ...newTopRated.slice(0, neededCount)];
          }

          // 4. Si on a des stats, charger les détails des jeux
          if (allStats.length > 0) {
            const gameIds = allStats.map(stat => stat.game_id);
            const games = await fetchGamesByIds(gameIds);

            if (games.length > 0) {
              const gamesMap = new Map(games.map((g: any) => [g.id.toString(), g]));
              const statsMap = new Map(allStats.map(stat => [stat.game_id, stat.average_rating]));
              const trendingMapped = gameIds
                .map(id => gamesMap.get(id))
                .filter(Boolean)
                .map((game: any) => ({
                  id: game.id.toString(),
                  title: game.name,
                  coverUrl: game.background_image || game.cover_url || '/placeholder.jpg',
                  rating: statsMap.get(game.id.toString()) || 0,
                  releaseDate: game.released || '',
                  genres: transformGenres(game.genres),
                  platforms: transformPlatforms(game.platforms),
                  developer: game.developers?.[0] || 'Unknown',
                  publisher: game.publishers?.[0] || 'Unknown',
                  description: game.description || '',
                  metacritic: game.metacritic,
                  playtime: game.playtime,
                  esrbRating: game.esrb_rating
                }));
              setTrendingGames(trendingMapped);
              setTrendingLoading(false);
              return;
            }
          }

          // 5. Fallback : si aucun jeu noté, utiliser les jeux populaires de RAWG
          console.log("Chargement des jeux populaires par défaut...");
          const popularGames = await searchPopularGames(10);
          console.log("Jeux populaires chargés:", popularGames.length);

          if (popularGames.length > 0) {
            const trendingMapped = popularGames.map((game: any) => ({
              id: game.id.toString(),
              title: game.name,
              coverUrl: game.background_image || game.cover_url || '/placeholder.jpg',
              rating: game.metacritic ? parseFloat((game.metacritic / 20).toFixed(2)) : 0,
              releaseDate: game.released || '',
              genres: transformGenres(game.genres),
              platforms: transformPlatforms(game.platforms),
              developer: game.developers?.[0] || 'Unknown',
              publisher: game.publishers?.[0] || 'Unknown',
              description: game.description || '',
              metacritic: game.metacritic,
              playtime: game.playtime,
              esrbRating: game.esrb_rating
            }));
            setTrendingGames(trendingMapped);
          }
        } catch (error) {
          console.error("Erreur lors du chargement des jeux en tendance:", error);
        } finally {
          setTrendingLoading(false);
        }
      }

      loadTrendingGames();

      try {
        const topRatedGamesData = await getTopRatedGamesWithCompositeScore(20);

        if (!topRatedGamesData || topRatedGamesData.length === 0) {
          console.log('No top rated games from composite score view, setting empty array');
          setTopRatedGames([]);
        } else {
          console.log('Top rated games (composite score):', topRatedGamesData.length, 'games');
          console.log('First game composite_score:', topRatedGamesData[0]?.composite_score);
          console.log('Last game composite_score:', topRatedGamesData[topRatedGamesData.length - 1]?.composite_score);

          const topRatedMapped = topRatedGamesData.map((game: any) => ({
            id: game.id.toString(),
            title: game.name,
            coverUrl: game.background_image || game.cover || '/placeholder.jpg',
            rating: game.composite_score || 0,
            releaseDate: game.released || '',
            genres: transformGenres(game.genres),
            platforms: transformPlatforms(game.platforms),
            developer: game.developers?.[0] || 'Unknown',
            publisher: game.publishers?.[0] || 'Unknown',
            description: game.description || '',
            metacritic: game.metacritic_numeric || game.metacritic,
            playtime: game.playtime,
            esrbRating: game.esrb_rating
          }));

          setTopRatedGames(topRatedMapped);
        }

        const mostFollowedGames = await getMostFollowedUnreleasedGames(15);
        console.log('Most followed unreleased games:', mostFollowedGames);

        if (mostFollowedGames.length > 0) {
          const gameIds = mostFollowedGames.map(g => g.game_id);
          const locale = localStorage.getItem('language') || 'fr';
          const gamesData = await gameDataCache.getGames(gameIds, locale);

          const anticipatedMapped = gameIds
            .map(id => gamesData[id])
            .filter(Boolean)
            .map((game: any) => ({
              id: game.id.toString(),
              title: game.name,
              coverUrl: game.background_image || game.cover_url || '/placeholder.jpg',
              rating: game.factiony_rating || (game.metacritic ? parseFloat((game.metacritic / 20).toFixed(2)) : 0),
              releaseDate: game.released || '',
              genres: transformGenres(game.genres),
              platforms: transformPlatforms(game.platforms),
              developer: game.developers?.[0]?.name || game.developers?.[0] || 'Unknown',
              publisher: game.publishers?.[0]?.name || game.publishers?.[0] || 'Unknown',
              description: game.description_raw || game.description || '',
              metacritic: game.metacritic,
              playtime: game.playtime,
              esrbRating: game.esrb_rating
            }));

          setAnticipatedGames(anticipatedMapped);
        } else {
          const fallbackGames = await fetchRandomUpcoming();
          setAnticipatedGames(fallbackGames);
        }
      } catch (e) {
        console.error("Error loading discover:", e);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleGameClick = (game: Game) => {
    const slug = gameToSlug(game.id, game.title || game.name);
    navigate(`/game/${slug}`, { state: { from: window.location.pathname } });
  };

  const handleGameClickFromId = async (gameId: string) => {
    try {
      const res = await fetch(`${API_URL}/games/${gameId}`, {
        headers: { "x-factiony-key": FACTIONY_KEY },
      });
      const gameData = await res.json();

      const game: Game = {
        id: gameData.id.toString(),
        title: gameData.name,
        coverUrl: gameData.images?.cover_url || gameData.background_image || '/placeholder.jpg',
        rating: gameData.rating || 0,
        releaseDate: gameData.released || '',
        genres: Array.isArray(gameData.genres) ? gameData.genres.map((g: any) => g?.name || g).filter(Boolean) : [],
        platforms: Array.isArray(gameData.platforms) ? gameData.platforms.map((p: any) => p?.platform?.name || p?.name || p).filter(Boolean) : [],
        developer: typeof gameData.developers?.[0] === 'string' ? gameData.developers[0] : gameData.developers?.[0]?.name || 'Unknown',
        publisher: typeof gameData.publishers?.[0] === 'string' ? gameData.publishers[0] : gameData.publishers?.[0]?.name || 'Unknown',
        description: gameData.description || '',
        metacritic: gameData.metacritic,
        playtime: gameData.playtime,
        esrbRating: typeof gameData.esrb_rating === 'string' ? gameData.esrb_rating : gameData.esrb_rating?.name || undefined
      };

      handleGameClick(game);
    } catch (error) {
      console.error('Error loading game:', error);
    }
  };

  const handleRate = (rating: number) => {
    console.log('Rating:', rating);
  };

  const handleReview = (review: string, rating: number) => {
    console.log('Review:', review, 'Rating:', rating);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen space-y-10">
      {trendingLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-12 w-12 text-orange-500 animate-spin" />
        </div>
      ) : trendingGames.length > 0 ? (
        <HorizontalGameSection
          title="📈 Les jeux en tendance"
          games={trendingGames}
          onGameClick={handleGameClick}
        />
      ) : null}

      {loading && topRatedGames.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-12 w-12 text-orange-500 animate-spin" />
        </div>
      ) : topRatedGames.length > 0 ? (
        <HorizontalGameSection
          title="🎮 Les jeux les mieux notés"
          games={topRatedGames}
          onGameClick={handleGameClick}
        />
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-400">Aucun jeu noté pour l'instant.</p>
        </div>
      )}

<AdBanner slot="5751553228" className="my-4" />

      {user && (
        <FriendsActivitySection
          onGameClick={handleGameClickFromId}
          onUserClick={onUserClick}
        />
      )}

      {loading && anticipatedGames.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-12 w-12 text-orange-500 animate-spin" />
        </div>
      ) : anticipatedGames.length > 0 ? (
        <HorizontalGameSection
          title="🔥 Les jeux les plus attendus"
          games={anticipatedGames}
          onGameClick={handleGameClick}
        />
      ) : null}

    </div>
  );
};

export default DiscoverView;
