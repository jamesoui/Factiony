import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { TOP_100_GAMES } from '../data/top100Games';
import { LoaderFactiony } from '../components/LoaderFactiony';
import { SimpleGameCard } from '../components/SimpleGameCard';
import GameDetailModal from '../components/GameDetailModal';
import { getUserRating } from '../lib/api/ratings';
import { supabase } from '../lib/supabaseClient';
import type { Game } from '../apiClient';

const ONBOARDING_GAMES = TOP_100_GAMES.slice(0, 65);

const OnboardingRatingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [visibleCount, setVisibleCount] = useState(18);
  const [games, setGames] = useState<(Game & { slug: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratedCount, setRatedCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadGamesData();
  }, []);

  const loadGamesData = async () => {
    try {
      const gamesWithData = await Promise.all(
        ONBOARDING_GAMES.map(async (game) => {
          const { data: coverData } = await supabase
            .from('top_games_covers_cache')
            .select('public_url, game_id')
            .eq('slug', game.slug)
            .maybeSingle();

          let userRating = null;
          if (coverData?.game_id) {
            userRating = await getUserRating(coverData.game_id);
          }

          return {
            id: coverData?.game_id || game.slug,
            name: game.name,
            slug: game.slug,
            images: {
              cover_url: coverData?.public_url || ''
            },
            released: null,
            userRating: userRating
          } as Game & { slug: string };
        })
      );

      setGames(gamesWithData);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const gameIds = gamesWithData.map(g => g.id).filter(Boolean);
        const { count } = await supabase
          .from('game_ratings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('game_id', gameIds);

        setRatedCount(count || 0);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading games data:', error);
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('users')
          .update({ onboarding_ratings_done: true })
          .eq('id', user.id);
      }
      navigate('/');
    } catch (error) {
      console.error('Error finishing onboarding:', error);
      navigate('/');
    }
  };

  const handleSkip = async () => {
    await handleFinish();
  };

  const showMore = () => {
    setVisibleCount(prev => Math.min(prev + 18, ONBOARDING_GAMES.length));
  };

  const openGameDetail = (slug: string, index: number) => {
    setSelectedIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedIndex(null);
    loadGamesData();
  };

  const handlePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < games.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoaderFactiony />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12 pb-40">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Découvre et note des jeux populaires</h1>
          <p className="text-slate-400 text-lg mb-2">
            Clique sur un jeu pour voir sa fiche détaillée et le noter
          </p>
          <p className="text-slate-500">
            Tu peux arrêter quand tu veux ou passer cette étape
          </p>
          {ratedCount > 0 && (
            <div className="mt-6 inline-block bg-slate-800 px-6 py-3 rounded-lg">
              <span className="text-2xl font-bold text-blue-400">{ratedCount}</span>
              <span className="text-slate-400 ml-2">jeu{ratedCount > 1 ? 'x' : ''} noté{ratedCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          {games.slice(0, visibleCount).map((game, index) => (
            <SimpleGameCard
              key={game.slug}
              game={game}
              onClick={() => openGameDetail(game.slug, index)}
              showRating={false}
              loading={index < 18 ? 'eager' : 'lazy'}
            />
          ))}
        </div>

        {visibleCount < ONBOARDING_GAMES.length && (
          <div className="flex justify-center mb-8">
            <button
              onClick={showMore}
              className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-lg flex items-center gap-2 transition-colors"
            >
              Afficher plus
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-white/10 shadow-2xl z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-white transition-colors px-4 py-2"
          >
            Passer
          </button>

          <button
            onClick={handleFinish}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors shadow-lg"
          >
            Terminer
          </button>
        </div>
      </div>

      {selectedIndex !== null && games[selectedIndex] && (
        <GameDetailModal
          isOpen={true}
          onClose={handleCloseModal}
          game={games[selectedIndex]}
          controlledIsOnboarding={true}
          controlledListType="topplayed"
          controlledIndex={selectedIndex}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}
    </div>
  );
};

export default OnboardingRatingsPage;
