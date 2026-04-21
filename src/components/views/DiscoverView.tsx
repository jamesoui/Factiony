import { logger } from '../../lib/logger';
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
import HeroSection from './HeroSection';

interface DiscoverViewProps {
  onViewChange?: (view: string, userId?: string) => void;
  onUserClick?: (userId: string) => void;
}

const DiscoverView: React.FC<DiscoverViewProps> = ({ onViewChange, onUserClick }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [topRatedGames, setTopRatedGames] = useState<Game[]>([]);
  const [anticipatedGames, setAnticipatedGames] = useState<Game[]>([]);
  const [trendingGames, setTrendingGames] = useState<Game[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL ?? "https://europe-west1-factiony-1fc0f.cloudfunctions.net/apiFunction";
  const FACTIONY_KEY = import.meta.env.VITE_FACTIONY_KEY;

  const transformGenres = (genres: any): string[] => {
    if (!Array.isArray(genres)) return [];
    return genres.map((g: any) => (typeof g === 'string' ? g : g?.name)).filter(Boolean);
  };

  const transformPlatforms = (platforms: any): string[] => {
    if (!Array.isArray(platforms)) return [];
    return platforms.map((p: any) => (typeof p === 'string' ? p : p?.platform?.name || p?.name)).filter(Boolean);
  };

  async function fetchRandomReleased(signal?: AbortSignal) {
    const randomPage = Math.floor(Math.random() * 50) + 1;
    const res = await fetch(`${API_URL}/games?page_size=10&page=${randomPage}`, {
      headers: { "x-factiony-key": FACTIONY_KEY },
      signal,
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

  async function fetchRandomUpcoming(signal?: AbortSignal) {
    const randomPage = Math.floor(Math.random() * 50) + 1;
    const res = await fetch(`${API_URL}/games?page_size=10&page=${randomPage}`, {
      headers: { "x-factiony-key": FACTIONY_KEY },
      signal,
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
    const controller = new AbortController();
    const signal = controller.signal;
    console.log('🟢 DiscoverView mount - useEffect start');

    async function loadTrendingGames() {
      try {
        let allStats: any[] = [];

        const trendingStats = await getTrendingGames(10);
        if (signal.aborted) { console.log('⏸️ aborted after getTrendingGames'); return; }
        allStats = [...trendingStats];

        if (allStats.length < 10) {
          const neededCount = 10 - allStats.length;
          const recentStats = await getRecentlyRatedGames(neededCount + 5);
          if (signal.aborted) { console.log('⏸️ aborted after getRecentlyRatedGames'); return; }
          const existingIds = new Set(allStats.map(s => s.game_id));
          const newRecent = recentStats.filter(s => !existingIds.has(s.game_id));
          allStats = [...allStats, ...newRecent.slice(0, neededCount)];
        }

        if (allStats.length < 10) {
          const neededCount = 10 - allStats.length;
          const topRatedStats = await getTopRatedGames(neededCount + 5);
          if (signal.aborted) { console.log('⏸️ aborted after getTopRatedGames'); return; }
          const existingIds = new Set(allStats.map(s => s.game_id));
          const newTopRated = topRatedStats.filter(s => !existingIds.has(s.game_id));
          allStats = [...allStats, ...newTopRated.slice(0, neededCount)];
        }

        if (allStats.length > 0) {
          const gameIds = allStats.map(stat => stat.game_id);
          const games = await fetchGamesByIds(gameIds);
          if (signal.aborted) { console.log('⏸️ aborted after fetchGamesByIds'); return; }

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
            console.log('✅ trending loaded, setting state');
            setTrendingGames(trendingMapped);
            setTrendingLoading(false);
            return;
          }
        }

        logger.log("Chargement des jeux populaires par défaut...");
        const popularGames = await searchPopularGames(10);
        if (signal.aborted) { console.log('⏸️ aborted after searchPopularGames'); return; }

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
      } catch (error: any) {
        if (error.name === 'AbortError') { console.log('⏸️ AbortError in loadTrendingGames'); return; }
        console.error("Erreur lors du chargement des jeux en tendance:", error);
      } finally {
        if (!signal.aborted) {
          console.log('🏁 trendingLoading → false');
          setTrendingLoading(false);
        } else {
          console.log('🚫 trendingLoading stays true because aborted');
        }
      }
    }

    async function loadData() {
      setLoading(true);
      setTrendingLoading(true);

      loadTrendingGames();

      try {
        const topRatedGamesData = await getTopRatedGamesWithCompositeScore(20);
        if (signal.aborted) { console.log('⏸️ aborted after getTopRatedGamesWithCompositeScore'); return; }

        if (!topRatedGamesData || topRatedGamesData.length === 0) {
          setTopRatedGames([]);
        } else {
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
        if (signal.aborted) { console.log('⏸️ aborted after getMostFollowedUnreleasedGames'); return; }

        if (mostFollowedGames.length > 0) {
          const gameIds = mostFollowedGames.map(g => g.game_id);
          const locale = localStorage.getItem('language') || 'fr';
          const gamesData = await gameDataCache.getGames(gameIds, locale);
          if (signal.aborted) { console.log('⏸️ aborted after gameDataCache.getGames'); return; }

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
          const fallbackGames = await fetchRandomUpcoming(signal);
          if (signal.aborted) { console.log('⏸️ aborted after fetchRandomUpcoming'); return; }
          setAnticipatedGames(fallbackGames);
        }
      } catch (e: any) {
        if (e.name === 'AbortError') { console.log('⏸️ AbortError in loadData'); return; }
        console.error("Error loading discover:", e);
      } finally {
        if (!signal.aborted) {
          console.log('🏁 loading → false');
          setLoading(false);
        } else {
          console.log('🚫 loading stays true because aborted');
        }
      }
    }

    loadData();

    return () => {
      console.log('🔴 DiscoverView unmount - aborting');
      controller.abort();
    };
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
    logger.log('Rating:', rating);
  };

  const handleReview = (review: string, rating: number) => {
    logger.log('Review:', review, 'Rating:', rating);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen space-y-10">
      {!user && <HeroSection />}
      {trendingLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="h-12 w-12 text-orange-500 animate-spin" />
        </div>
      ) : trendingGames.length > 0 ? (
        <HorizontalGameSection
          title={language === 'en' ? '📈 Trending Games' : '📈 Les jeux en tendance'}
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
          title={language === 'en' ? '🎮 Top Rated Games' : '🎮 Les jeux les mieux notés'}
          games={topRatedGames}
          onGameClick={handleGameClick}
        />
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-400">Aucun jeu noté pour l'instant.</p>
        </div>
      )}

      {!user?.isPremium && <AdBanner slot="5751553228" className="my-4" />}

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
          title={language === 'en' ? '🔥 Most Anticipated' : '🔥 Les jeux les plus attendus'}
          games={anticipatedGames}
          onGameClick={handleGameClick}
        />
      ) : null}
    </div>
  );
};

export default DiscoverView;