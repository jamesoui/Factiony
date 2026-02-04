import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, Clock, Star, Filter, BarChart3, TrendingUp, Monitor } from 'lucide-react';
import { UserGame, Game } from '../../types';
import GameCard from '../GameCard';
import StatsChart from '../StatsChart';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { getUserRatedGames, getUserStats, UserGameRating } from '../../lib/api/userGames';

interface JournalViewProps {
  onUserClick?: (userId: string) => void;
}

const JournalView: React.FC<JournalViewProps> = ({ onUserClick }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showStats, setShowStats] = useState(false);
  const [ratedGames, setRatedGames] = useState<UserGameRating[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserGames();
    }
  }, [user]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadUserGames();
      }
    };

    const handleReviewSaved = () => {
      if (user) {
        loadUserGames();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('reviewSaved', handleReviewSaved);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('reviewSaved', handleReviewSaved);
    };
  }, [user]);

  const loadUserGames = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [games, stats] = await Promise.all([
        getUserRatedGames(user.id),
        getUserStats(user.id)
      ]);

      setRatedGames(games);
      setUserStats(stats);
    } catch (error) {
      console.error('Erreur chargement jeux:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const getRatingCategory = (rating: number): string => {
    if (rating >= 4.5) return 'Excellent';
    if (rating >= 4) return 'Très bon';
    if (rating >= 3) return 'Bon';
    if (rating >= 2) return 'Moyen';
    return 'Décevant';
  };

  const filteredGames = ratedGames.filter(game => {
    if (statusFilter === 'all') return true;
    const category = getRatingCategory(game.rating);
    return category.toLowerCase() === statusFilter.toLowerCase();
  });

  const statusLabels: Record<string, string> = {
    all: 'Tous',
    excellent: 'Excellent (4.5+)',
    'très bon': 'Très bon (4+)',
    bon: 'Bon (3+)',
    moyen: 'Moyen (2+)',
    décevant: 'Décevant (<2)'
  };

  const getCategoryCount = (category: string) => {
    if (category === 'all') return ratedGames.length;
    return ratedGames.filter(game => getRatingCategory(game.rating).toLowerCase() === category.toLowerCase()).length;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Connectez-vous pour voir votre journal</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Chargement de votre journal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Jeux notés', count: ratedGames.length, icon: BookOpen, color: 'text-orange-600' },
          { label: 'Excellent (4.5+)', count: getCategoryCount('excellent'), icon: Star, color: 'text-yellow-600' },
          { label: 'Très bon (4+)', count: getCategoryCount('très bon'), icon: TrendingUp, color: 'text-green-600' },
          { label: 'Note moyenne', count: userStats?.averageRating || 0, icon: BarChart3, color: 'text-blue-600' }
        ].map(({ label, count, icon: Icon, color }) => (
          <div key={label} className="bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{typeof count === 'number' ? count.toFixed(label.includes('moyenne') ? 1 : 0) : count}</p>
                <p className="text-sm text-gray-400">{label}</p>
              </div>
              <Icon className={`h-8 w-8 ${color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === key
                      ? 'bg-orange-900 text-orange-300'
                      : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {ratedGames.length > 0 && (
            <button
              onClick={() => setShowStats(!showStats)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                showStats
                  ? 'bg-orange-900 text-orange-300'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Statistiques</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Statistics */}
      {showStats && userStats && (
        <div className="space-y-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.keys(userStats.yearlyStats).length > 0 && (
              <StatsChart
                title="Jeux par Année de Sortie"
                data={userStats.yearlyStats}
                type="line"
                color="blue"
              />
            )}
            {Object.keys(userStats.genreBreakdown).length > 0 && (
              <StatsChart
                title="Répartition par Genre"
                data={userStats.genreBreakdown}
                type="pie"
                color="green"
              />
            )}
          </div>

          {Object.keys(userStats.platformBreakdown).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StatsChart
                title="Plateformes Utilisées"
                data={userStats.platformBreakdown}
                type="bar"
                color="orange"
              />

              <div className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Résumé</h3>
                  <TrendingUp className="h-5 w-5 text-gray-400" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total des jeux</span>
                    <span className="text-white font-medium">{ratedGames.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Genres différents</span>
                    <span className="text-white font-medium">{Object.keys(userStats.genreBreakdown).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Plateformes utilisées</span>
                    <span className="text-white font-medium">{Object.keys(userStats.platformBreakdown).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Note moyenne</span>
                    <span className="text-white font-medium">{userStats.averageRating}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Games List */}
      <div className="space-y-6">
        {filteredGames.map((ratedGame) => {
          if (!ratedGame.game_data) return null;

          return (
            <div key={ratedGame.id} className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex flex-col lg:flex-row">
                <div className="lg:w-48 h-48 lg:h-auto flex-shrink-0 overflow-hidden">
                  <img
                    src={ratedGame.game_data.background_image || ''}
                    alt={ratedGame.game_data.name}
                    className="w-full h-full object-cover object-center"
                  />
                </div>

                <div className="flex-1 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{ratedGame.game_data.name}</h3>
                      <p className="text-gray-400">
                        {ratedGame.game_data.developers?.[0]?.name || 'Développeur inconnu'} • {ratedGame.game_data.released ? new Date(ratedGame.game_data.released).getFullYear() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 bg-yellow-500 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
                      <Star className="h-4 w-4 fill-current" />
                      <span>{ratedGame.rating}/5</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Noté le</p>
                      <p className="font-medium text-gray-300">{formatDate(ratedGame.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Catégorie</p>
                      <p className="font-medium text-gray-300">{getRatingCategory(ratedGame.rating)}</p>
                    </div>
                    {ratedGame.game_data.genres?.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500">Genres</p>
                        <p className="font-medium text-gray-300">{ratedGame.game_data.genres.slice(0, 2).map((g: any) => g.name).join(', ')}</p>
                      </div>
                    )}
                  </div>

                  {ratedGame.review_text && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-2">Ma critique</p>
                      <p className="text-gray-300 leading-relaxed">{ratedGame.review_text}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredGames.length === 0 && ratedGames.length > 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Aucun jeu dans cette catégorie</h3>
          <p className="text-gray-500">Essayez un autre filtre</p>
        </div>
      )}

      {ratedGames.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Aucun jeu noté</h3>
          <p className="text-gray-500">Commencez à noter vos jeux préférés pour les voir apparaître ici !</p>
        </div>
      )}
    </div>
  );
};

export default JournalView;