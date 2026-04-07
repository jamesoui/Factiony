import React, { useState, useEffect } from 'react';
import { BookOpen, Calendar, Clock, Star, Filter, BarChart3, TrendingUp, Monitor } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { gameToSlug } from '../../utils/slugify';
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
  const navigate = useNavigate();
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

  const statusLabels: Record<string, string> = {
    all: 'Tous',
    'En cours': '🎮 En cours',
    'Terminé': '✅ Terminé',
    '100% terminé': '🏆 100% terminé',
    'Abandonné': '❌ Abandonné',
    'Wishlist': '🔖 Wishlist',
  };

  const filteredGames = ratedGames.filter(game => {
    if (statusFilter === 'all') return true;
    return (game as any).game_status === statusFilter;
  });

  const getStatusCount = (status: string) => {
    if (status === 'all') return ratedGames.length;
    return ratedGames.filter(g => (g as any).game_status === status).length;
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

      {/* Filter by status */}
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
                  {key !== 'all' && (
                    <span className="ml-1 text-xs text-gray-500">({getStatusCount(key)})</span>
                  )}
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
          {/* Ligne 1 : Année + Genre (existant) */}
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

          {/* Ligne 2 : Plateformes + Résumé (existant) */}
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

          {/* Ligne 3 : Distribution des notes + Répartition par statut (nouveau) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribution des notes */}
            <div className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Distribution des notes</h3>
                <BarChart3 className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-2">
                {['0.5','1.0','1.5','2.0','2.5','3.0','3.5','4.0','4.5','5.0'].map(bucket => {
                  const dist = userStats.ratingDistribution || {};
                  const count = dist[bucket] || 0;
                  const max = Math.max(...Object.values(dist as Record<string, number>).map(Number), 1);
                  return (
                    <div key={bucket} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-8 text-right">{bucket}★</span>
                      <div className="flex-1 bg-gray-700 rounded-full h-3">
                        <div
                          className="bg-orange-500 h-3 rounded-full transition-all"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 w-4">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Répartition par statut */}
            <div className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Répartition par statut</h3>
                <BookOpen className="h-5 w-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                {Object.entries(statusLabels).filter(([k]) => k !== 'all' && k !== 'Wishlist').map(([key, label]) => {
                  const count = getStatusCount(key);
                  const pct = ratedGames.length > 0 ? Math.round((count / ratedGames.length) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-300">{label}</span>
                        <span className="text-sm text-white font-medium">{count} <span className="text-gray-500 text-xs">({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
                      <h3
                        className="text-xl font-bold text-white mb-2 cursor-pointer hover:text-orange-400 transition-colors"
                        onClick={() => navigate(`/game/${gameToSlug(Number(ratedGame.game_id), ratedGame.game_data.name)}`)}
                      >
                        {ratedGame.game_data.name}
                      </h3>
                      <p className="text-gray-400">
                        {ratedGame.game_data.developers?.[0]?.name || 'Développeur inconnu'} • {ratedGame.game_data.released ? new Date(ratedGame.game_data.released).getFullYear() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 bg-yellow-500 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
                      <Star className="h-4 w-4 fill-current" />
                      <span>{ratedGame.rating}/5</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Noté le</p>
                      <p className="font-medium text-gray-300">{formatDate(ratedGame.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Statut</p>
                      <p className="font-medium text-gray-300">{(ratedGame as any).game_status || '—'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Plateforme</p>
                      <p className="font-medium text-gray-300">{(ratedGame as any).platform?.split(',').join(', ') || '—'}</p>
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
                  {(ratedGame.rating_gameplay || ratedGame.rating_graphics || ratedGame.rating_story || ratedGame.rating_music) && (
                    <div className="bg-gray-700 rounded-lg p-4 mt-3 space-y-2">
                      <p className="text-sm text-gray-500 mb-2">Notes détaillées</p>
                      {[
                        { key: 'rating_gameplay', label: '🎮 Gameplay' },
                        { key: 'rating_graphics', label: '🎨 Graphismes' },
                        { key: 'rating_story', label: '📖 Histoire' },
                        { key: 'rating_music', label: '🎵 Musique' },
                      ].map(({ key, label }) => ratedGame[key] ? (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">{label}</span>
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < ratedGame[key] ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'}`} />
                            ))}
                          </div>
                        </div>
                      ) : null)}
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