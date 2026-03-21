import React, { useState, useEffect } from 'react';
import { Calendar, Trophy, Star, Users, Heart, Plus, Monitor, Crown, CreditCard as Edit, Clock, X } from 'lucide-react';
import GameCard from '../GameCard';
import GameDetailModal from '../GameDetailModal';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import StatsChart from '../StatsChart';
import { Game } from '../../types';
import { getUserRatedGames, getUserStats, getRecentUserActivity, UserGameRating } from '../../lib/api/userGames';
import { getUserFollowedGamesCount } from '../../lib/api/gameFollows';
import { getFollowerCount, getFollowingCount } from '../../lib/api/users';
import { supabase } from '../../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { gameToSlug } from '../../utils/slugify';
import { SimpleGameCard } from '../SimpleGameCard';

interface ProfileViewProps {
  onViewChange: (view: string) => void;
  onUserClick?: (userId: string) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ onViewChange, onUserClick }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showStats, setShowStats] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showGameDetail, setShowGameDetail] = useState(false);
  const [ratedGames, setRatedGames] = useState<UserGameRating[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<UserGameRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [followedGamesCount, setFollowedGamesCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [profileSections, setProfileSections] = useState<any[]>([]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionGameQuery, setNewSectionGameQuery] = useState('');
  const [newSectionGames, setNewSectionGames] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingGames, setSearchingGames] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadUserData();
      }
    };

    const handleReviewSaved = () => {
      if (user) {
        loadUserData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('reviewSaved', handleReviewSaved);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('reviewSaved', handleReviewSaved);
    };
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [games, stats, activity, followedCount, followersCountData, followingCountData] = await Promise.all([
        getUserRatedGames(user.id),
        getUserStats(user.id),
        getRecentUserActivity(user.id, 5),
        getUserFollowedGamesCount(user.id),
        getFollowerCount(user.id),
        getFollowingCount(user.id)
      ]);

      setRatedGames(games);
      setUserStats(stats);
      setRecentActivity(activity);
      setFollowedGamesCount(followedCount);
      setFollowersCount(followersCountData);
      setFollowingCount(followingCountData);

      const { data: sections } = await supabase
        .from('profile_sections')
        .select('*')
        .eq('user_id', user.id)
        .order('position');
      setProfileSections(sections || []);
    } catch (error) {
      console.error('Erreur chargement données utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchGamesForSection = async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearchingGames(true);
    try {
      const { data } = await supabase
        .from('games')
        .select('id, name, background_image')
        .ilike('name', `%${query}%`)
        .limit(5);
      setSearchResults(data || []);
    } finally {
      setSearchingGames(false);
    }
  };

  const handleCreateSection = async () => {
    if (!newSectionTitle.trim() || newSectionGames.length === 0) return;
    const { data } = await supabase
      .from('profile_sections')
      .insert({
        user_id: user!.id,
        title: newSectionTitle,
        game_ids: newSectionGames.map(g => g.id),
        position: profileSections.length
      })
      .select()
      .single();
    if (data) {
      setProfileSections([...profileSections, { ...data, games: newSectionGames }]);
      setShowAddSection(false);
      setNewSectionTitle('');
      setNewSectionGames([]);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Supprimer cette section ?')) return;
    await supabase.from('profile_sections').delete().eq('id', sectionId);
    setProfileSections(profileSections.filter(s => s.id !== sectionId));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Chargement des données...</p>
        </div>
      </div>
    );
  }

  const topRatedGames = ratedGames
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 4);

  const handleGameClick = (game: Game) => {
    setSelectedGame(game);
    setShowGameDetail(true);
  };

  const handleRate = (rating: number) => {
    console.log('Rating:', rating);
  };

  const handleReview = (review: string, rating: number) => {
    console.log('Review:', review, 'Rating:', rating);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-purple-600 via-orange-600 to-red-600 rounded-2xl p-8 mb-8 text-white overflow-hidden">
        {user.banner && (
          <img src={user.banner} alt="Bannière" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative">
              <img src={user.avatar} alt={user.username} className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" />
              {user.isPremium && (
                <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-2">
                  <Crown className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold">{user.username}</h1>
                {user.isPremium && (
                  <span className="bg-yellow-500 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">PREMIUM</span>
                )}
              </div>
              <p className="text-purple-100 mb-4">{user.bio}</p>
              <div className="flex flex-wrap gap-6 text-sm">
                <button onClick={() => onViewChange('followers')} className="flex items-center space-x-1 hover:text-orange-400 transition-colors cursor-pointer">
                  <Users className="h-4 w-4" />
                  <span>{followersCount} {t('profile.followers')}</span>
                </button>
                <button onClick={() => onViewChange('follows')} className="flex items-center space-x-1 hover:text-orange-400 transition-colors cursor-pointer">
                  <Users className="h-4 w-4" />
                  <span>{followingCount} {t('profile.following')}</span>
                </button>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{t('profile.memberSince')} {new Date(user.joinDate).getFullYear()}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <button onClick={() => onViewChange('profile-edit')} className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors">
                <Edit className="h-4 w-4" />
                <span>{t('profile.editProfile')}</span>
              </button>
              <button onClick={() => onViewChange('add-friends')} className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors">
                <Users className="h-4 w-4" />
                <span>{t('profile.addFriends')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700 text-center">
          <Trophy className="h-8 w-8 text-orange-500 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white mb-1">{userStats?.totalGames || 0}</div>
          <div className="text-sm text-gray-400">{t('profile.gamesPlayed')}</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700 text-center">
          <Clock className="h-8 w-8 text-blue-500 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white mb-1">{followedGamesCount}</div>
          <div className="text-sm text-gray-400">Jeux en attente</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700 text-center">
          <Heart className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white mb-1">{topRatedGames.length}</div>
          <div className="text-sm text-gray-400">Top jeux notés</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700 text-center">
          <Star className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
          <div className="text-2xl font-bold text-white mb-1">{userStats?.averageRating || 0}</div>
          <div className="text-sm text-gray-400">{t('profile.averageRating')}</div>
        </div>
      </div>

      {/* Top 4 */}
      <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{t('profile.top4')}</h2>
        </div>
        {topRatedGames.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {topRatedGames.map((ratedGame) => {
              if (!ratedGame.game_data) return null;
              const game: Game = {
                id: ratedGame.game_id,
                title: ratedGame.game_data.name || 'Titre inconnu',
                coverImage: ratedGame.game_data.background_image || '',
                rating: ratedGame.rating,
                releaseDate: ratedGame.game_data.released || '',
                developer: ratedGame.game_data.developers?.[0]?.name || 'Développeur inconnu',
                genres: ratedGame.game_data.genres?.map((g: any) => g.name) || [],
                platforms: ratedGame.game_data.platforms?.map((p: any) => p.platform?.name) || [],
                description: ratedGame.game_data.description_raw || ''
              };
              return (
                <div key={ratedGame.id} className="relative">
                  <GameCard game={game} onClick={() => handleGameClick(game)} />
                  <div className="absolute top-2 right-2 bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                    <Star className="h-3 w-3 fill-current" />
                    <span>{ratedGame.rating}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Heart className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">Aucun jeu noté pour le moment</p>
            <p className="text-gray-500 text-sm">Commencez à noter vos jeux préférés !</p>
          </div>
        )}
      </div>

      {/* Statistiques détaillées */}
      {showStats && userStats && Object.keys(userStats.genreBreakdown).length > 0 && (
        <div className="space-y-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.keys(userStats.genreBreakdown).length > 0 && (
              <StatsChart title={t('profile.genreBreakdown')} data={userStats.genreBreakdown} type="pie" color="orange" />
            )}
            {Object.keys(userStats.platformBreakdown).length > 0 && (
              <StatsChart title={t('profile.platformsUsed')} data={userStats.platformBreakdown} type="bar" color="blue" />
            )}
          </div>
          {Object.keys(userStats.yearlyStats).length > 0 && (
            <StatsChart title={t('profile.yearlyActivity')} data={userStats.yearlyStats} type="line" color="green" />
          )}
        </div>
      )}

      {/* Activité récente */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-6">{t('profile.recentActivity')}</h2>
        {recentActivity.length > 0 ? (
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              if (!activity.game_data) return null;
              const daysAgo = Math.floor((Date.now() - new Date(activity.updated_at).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-700 rounded-lg">
                  <img src={activity.game_data.background_image || ''} alt={activity.game_data.name} className="w-16 h-20 bg-gray-600 rounded flex-shrink-0 object-cover" />
                  <div className="flex-1">
                    <p className="text-white font-medium">A noté {activity.game_data.name}</p>
                    <p className="text-gray-400 text-sm flex items-center space-x-2">
                      <span>Il y a {daysAgo === 0 ? "aujourd'hui" : `${daysAgo} jour${daysAgo > 1 ? 's' : ''}`}</span>
                      <span>•</span>
                      <span className="flex items-center">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                        {activity.rating}/5
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Aucune activité récente</p>
          </div>
        )}
      </div>

      {/* Sections personnalisées Premium */}
      {user.isPremium && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Mes sections</h2>
            <button
              onClick={() => setShowAddSection(true)}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nouvelle section
            </button>
          </div>

          {profileSections.map(section => (
            <div key={section.id} className="bg-gray-800 rounded-xl p-6 mb-4 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{section.title}</h3>
                <button onClick={() => handleDeleteSection(section.id)} className="text-gray-500 hover:text-red-400">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {(section.games || []).map((game: any) => (
                  <div key={game.id} className="cursor-pointer" onClick={() => navigate(`/game/${gameToSlug(Number(game.id), game.name)}`)}>
                    <SimpleGameCard game={{ ...game, images: { cover_url: game.background_image } }} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {showAddSection && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-xl max-w-lg w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Nouvelle section</h3>
                  <button onClick={() => setShowAddSection(false)} className="text-gray-400 hover:text-white">
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nom de la section</label>
                    <input
                      type="text"
                      value={newSectionTitle}
                      onChange={e => setNewSectionTitle(e.target.value)}
                      placeholder="ex: Mes jeux préférés"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Ajouter des jeux ({newSectionGames.length}/4)</label>
                    {newSectionGames.length < 4 && (
                      <div className="relative mb-2">
                        <input
                          type="text"
                          value={newSectionGameQuery}
                          onChange={e => { setNewSectionGameQuery(e.target.value); searchGamesForSection(e.target.value); }}
                          placeholder="Rechercher un jeu..."
                          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        />
                        {searchResults.length > 0 && (
                          <div className="absolute z-10 w-full bg-gray-700 border border-gray-600 rounded-lg mt-1 max-h-48 overflow-y-auto">
                            {searchResults.map(game => (
                              <button
                                key={game.id}
                                onClick={() => {
                                  if (newSectionGames.length < 4 && !newSectionGames.find(g => g.id === game.id)) {
                                    setNewSectionGames([...newSectionGames, game]);
                                  }
                                  setNewSectionGameQuery('');
                                  setSearchResults([]);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-600 text-white text-sm flex items-center gap-3"
                              >
                                {game.background_image && <img src={game.background_image} className="w-8 h-8 rounded object-cover" />}
                                {game.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {newSectionGames.map(game => (
                        <div key={game.id} className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-1">
                          <span className="text-sm text-white">{game.name}</span>
                          <button onClick={() => setNewSectionGames(newSectionGames.filter(g => g.id !== game.id))} className="text-gray-400 hover:text-red-400">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleCreateSection}
                    disabled={!newSectionTitle.trim() || newSectionGames.length === 0}
                    className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
                  >
                    Créer la section
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de détail du jeu */}
      {selectedGame && (
        <GameDetailModal
          isOpen={showGameDetail}
          onClose={() => setShowGameDetail(false)}
          game={selectedGame}
          onRate={handleRate}
          onReview={handleReview}
          onViewChange={onViewChange}
          onUserClick={onUserClick}
        />
      )}
    </div>
  );
};

export default ProfileView;
