import React, { useState, useEffect } from 'react';
import {
  User,
  Settings,
  Calendar,
  Trophy,
  Star,
  Users,
  Heart,
  Play,
  Check,
  Plus,
  Monitor,
  Crown,
  Edit,
  UserPlus,
  UserCheck,
  X
} from 'lucide-react';
import GameCard from '../GameCard';
import { SimpleGameCard } from '../SimpleGameCard';
import GameDetailModal from '../GameDetailModal';
import FollowersListView from './FollowersListView';
import FollowsListView from './FollowsListView';
import { useAuth } from '../../contexts/AuthContext';
import StatsChart from '../StatsChart';
import {
  getUserById,
  UserProfile,
  isFollowing as checkIfFollowing,
  followUser,
  unfollowUser,
  getFollowerCount,
  getFollowingCount
} from '../../lib/api/users';
import {
  getUserRatedGames,
  getUserStats,
  getRecentUserActivity,
  UserGameRating,
  UserStats
} from '../../lib/api/userGames';
import Spinner from '../Spinner';
import { Game } from '../../types';
import { getGameById } from '../../apiClient';
import { supabase } from '../../lib/supabaseClient';

interface UserProfileViewProps {
  userId: string; // can be UUID OR username (for /u/:username)
  isOpen?: boolean;
  onClose?: () => void;
  onViewChange?: (view: string) => void;
  onGameClick?: (gameId: string) => void;
  onUserClick?: (userId: string) => void;
}

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

const UserProfileView: React.FC<UserProfileViewProps> = ({
  userId,
  isOpen = true,
  onClose,
  onViewChange,
  onGameClick,
  onUserClick
}) => {
  const { user: currentUser, updateUser } = useAuth();
  const [showStats, setShowStats] = useState(false);
  const [isFollowingState, setIsFollowingState] = useState(false);
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [ratedGames, setRatedGames] = useState<UserGameRating[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<UserGameRating[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showGameDetail, setShowGameDetail] = useState(false);
  const [gameCovers, setGameCovers] = useState<Record<string, string>>({});
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);

  const resolveUserId = async (idOrUsername: string): Promise<string | null> => {
    const raw = (idOrUsername ?? '').trim();
    if (!raw) return null;

    if (isUuid(raw)) return raw;

    // treat as username (case-insensitive)
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .ilike('username', raw)
      .maybeSingle();

    if (error) {
      console.error('[resolveUserId] supabase error:', error);
      return null;
    }

    return data?.id ?? null;
  };

  const fetchGameCovers = async (gameIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('api_cache_rawg_igdb')
        .select('game_id, payload')
        .in('game_id', gameIds.map(id => `${id}_fr`));

      if (error) {
        console.error('Error fetching game covers:', error);
        return;
      }

      if (data) {
        const coversMap: Record<string, string> = {};
        data.forEach(item => {
          const gameId = item.game_id.replace('_fr', '');
          const coverUrl = item.payload?.cover;
          if (coverUrl) {
            coversMap[gameId] = coverUrl;
          }
        });
        console.log('Fetched covers:', coversMap);
        setGameCovers(coversMap);
      }
    } catch (err) {
      console.error('Unexpected error fetching covers:', err);
    }
  };

  const handleGameClick = async (gameId: string, gameName?: string, gameSlug?: string) => {
    try {
      console.log('Opening game details for:', gameId);

      const gameData = await getGameById(gameId);

      if (gameData) {
        setSelectedGame(gameData as Game);
        setShowGameDetail(true);
      } else {
        const coverUrl = gameCovers[gameId];
        const fallbackGame: Game = {
          id: parseInt(gameId) || 0,
          slug: gameSlug || gameId,
          name: gameName || 'Jeu inconnu',
          released: '',
          background_image: coverUrl || '',
          rating: 0,
          genres: [],
          platforms: []
        };
        setSelectedGame(fallbackGame);
        setShowGameDetail(true);
      }
    } catch (error) {
      console.error('Error loading game details:', error);
      alert('Impossible de charger les détails du jeu');
    }
  };

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);

        const resolvedId = await resolveUserId(userId);
        console.log('Loading profile for:', { input: userId, resolvedId });

        if (!resolvedId) {
          console.warn('User not found (could not resolve):', userId);
          setProfileUser(null);
          return;
        }

        const userData = await getUserById(resolvedId);

        if (!userData) {
          console.warn('User not found by id:', resolvedId);
          setProfileUser(null);
          return;
        }

        console.log('User data loaded:', {
          id: userData.id,
          username: userData.username,
          is_private: userData.is_private
        });

        if (userData.is_private && currentUser?.uid !== resolvedId) {
          console.log('Profile is private, checking if following...');
          const following = await checkIfFollowing(resolvedId);
          if (!following) {
            console.warn('User is not following this private profile');
            setProfileUser(null);
            return;
          }
        }

        setProfileUser(userData);

        console.log('Loading follower/following counts...');
        const [followers, following, isFollowingUser] = await Promise.all([
          getFollowerCount(resolvedId).catch(err => {
            console.error('Failed to load follower count:', err);
            return 0;
          }),
          getFollowingCount(resolvedId).catch(err => {
            console.error('Failed to load following count:', err);
            return 0;
          }),
          currentUser
            ? checkIfFollowing(resolvedId).catch(err => {
                console.error('Failed to check if following:', err);
                return false;
              })
            : Promise.resolve(false)
        ]);

        console.log('Profile loaded successfully:', { followers, following, isFollowingUser });
        setFollowerCount(followers);
        setFollowingCount(following);
        setIsFollowingState(isFollowingUser);

        console.log('Loading user games and stats...');
        const [games, stats, activity] = await Promise.all([
          getUserRatedGames(resolvedId).catch(err => {
            console.error('Failed to load rated games:', err);
            return [];
          }),
          getUserStats(resolvedId).catch(err => {
            console.error('Failed to load user stats:', err);
            return null;
          }),
          getRecentUserActivity(resolvedId, 5).catch(err => {
            console.error('Failed to load recent activity:', err);
            return [];
          })
        ]);

        console.log('User data loaded:', {
          gamesCount: games.length,
          hasStats: !!stats,
          activityCount: activity.length
        });

        setRatedGames(games);
        setUserStats(stats);
        setRecentActivity(activity);

        const allGameIds = new Set<string>();
        games.forEach(g => allGameIds.add(g.game_id));
        activity.forEach(g => allGameIds.add(g.game_id));

        if (allGameIds.size > 0) {
          console.log('Fetching covers for games:', Array.from(allGameIds));
          await fetchGameCovers(Array.from(allGameIds));
        }
      } catch (error) {
        console.error('Error loading user profile:', {
          error,
          message: error instanceof Error ? error.message : 'Unknown error',
          userId
        });
        setProfileUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [userId, currentUser]);

  const handleFollow = async () => {
    if (!currentUser) {
      console.warn('[FOLLOW] Cannot follow: user not logged in');
      alert('Vous devez être connecté pour suivre un utilisateur');
      return;
    }

    if (!profileUser) {
      console.warn('[FOLLOW] Cannot follow: profile not loaded');
      return;
    }

    const targetId = profileUser.id;

    if (currentUser.uid === targetId) {
      console.warn('[FOLLOW] Cannot follow: attempting to follow self');
      alert('Vous ne pouvez pas vous suivre vous-même');
      return;
    }

    try {
      const {
        data: { user: sessionUser }
      } = await supabase.auth.getUser();

      if (!sessionUser) {
        console.error('[FOLLOW] No Supabase session found');
        alert('Vous devez être connecté pour suivre un utilisateur');
        return;
      }

      console.log('[FOLLOW] Session user:', { id: sessionUser.id, email: sessionUser.email });

      if (isFollowingState) {
        console.log('[UNFOLLOW] Attempting to unfollow:', {
          follower_id: sessionUser.id,
          followed_id: targetId
        });

        setIsFollowingState(false);
        setFollowerCount(prev => Math.max(0, prev - 1));

        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', sessionUser.id)
          .eq('followed_id', targetId);

        if (error) {
          console.error('[UNFOLLOW ERROR]', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            follower_id: sessionUser.id,
            followed_id: targetId
          });
          throw new Error(error.message || 'Échec du désabonnement');
        }

        console.log('[UNFOLLOW] Successfully unfollowed');
      } else {
        const payload = {
          follower_id: sessionUser.id,
          followed_id: targetId
        };

        console.log('[FOLLOW] Attempting to follow with payload:', payload);

        setIsFollowingState(true);
        setFollowerCount(prev => prev + 1);

        const { error } = await supabase.from('follows').insert(payload);

        if (error) {
          console.error('[FOLLOW ERROR]', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            payload,
            sessionUserId: sessionUser.id
          });
          throw new Error(error.message || 'Échec du suivi');
        }

        console.log('[FOLLOW] Successfully followed');
      }
    } catch (error: any) {
      console.error('[FOLLOW] Error toggling follow:', {
        error,
        message: error?.message || 'Unknown error',
        target: profileUser?.id
      });

      alert(error?.message || 'Une erreur est survenue lors de la modification du suivi');
    }
  };

  if (loading) {
    const loadingContent = (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="xl" />
      </div>
    );

    return isOpen && onClose ? (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
          <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-2xl border border-gray-700">
            <div className="p-6">{loadingContent}</div>
          </div>
        </div>
      </div>
    ) : (
      loadingContent
    );
  }

  if (!profileUser) {
    const notFoundContent = (
      <div className="text-center py-12">
        <p className="text-gray-400">Utilisateur non trouvé ou profil privé</p>
      </div>
    );

    return isOpen && onClose ? (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
          <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-2xl border border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Profil utilisateur</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
                  <X className="h-6 w-6" />
                </button>
              </div>
              {notFoundContent}
            </div>
          </div>
        </div>
      </div>
    ) : (
      notFoundContent
    );
  }

  const isOwnProfile = currentUser?.uid === profileUser.id;
  const topRatedGames = ratedGames.sort((a, b) => b.rating - a.rating).slice(0, 4);

  const ProfileContent = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen">
      {isOpen && onClose && (
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Profil de {profileUser.username}</h1>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}

      <div className="relative bg-gradient-to-r from-purple-600 via-orange-600 to-red-600 rounded-2xl p-8 mb-8 text-white overflow-hidden">
        {profileUser?.banner_url && (
          <img src={profileUser.banner_url} alt="Bannière" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative">
              <img
                src={
                  profileUser.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUser.username}`
                }
                alt={profileUser.username}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover"
              />
              {profileUser.is_premium && (
                <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-2">
                  <Crown className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold">{profileUser.username}</h1>
                {profileUser.is_verified && (
                  <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {profileUser.is_premium && (
                  <span className="bg-yellow-500 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
                    PREMIUM
                  </span>
                )}
              </div>

              {profileUser.bio && <p className="text-purple-100 mb-4">{profileUser.bio}</p>}

              <div className="flex flex-wrap gap-6 text-sm">
                <button
                  onClick={() => setShowFollowersModal(true)}
                  className="flex items-center space-x-1 hover:text-orange-400 transition-colors cursor-pointer"
                >
                  <Users className="h-4 w-4" />
                  <span>{followerCount} abonnés</span>
                </button>
                <button
                  onClick={() => setShowFollowingModal(true)}
                  className="flex items-center space-x-1 hover:text-orange-400 transition-colors cursor-pointer"
                >
                  <Users className="h-4 w-4" />
                  <span>{followingCount} abonnements</span>
                </button>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Membre depuis {new Date(profileUser.join_date).getFullYear()}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              {!isOwnProfile && (
                <button
                  onClick={handleFollow}
                  className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    isFollowingState ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isFollowingState ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Suivi</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Suivre</span>
                    </>
                  )}
                </button>
              )}

              {isOwnProfile && (
                <button
                  onClick={() => onViewChange?.('profile-edit')}
                  className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Modifier le profil</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {userStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700 text-center">
            <Trophy className="h-8 w-8 text-orange-500 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white mb-1">{userStats.totalGames}</div>
            <div className="text-sm text-gray-400">Jeux notés</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700 text-center">
            <Star className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white mb-1">{userStats.averageRating.toFixed(1)}</div>
            <div className="text-sm text-gray-400">Note moyenne</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700 text-center">
            <Heart className="h-8 w-8 text-red-500 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white mb-1">{Object.keys(userStats.genreBreakdown).length}</div>
            <div className="text-sm text-gray-400">Genres explorés</div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700 text-center">
            <Monitor className="h-8 w-8 text-blue-500 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white mb-1">{Object.keys(userStats.platformBreakdown).length}</div>
            <div className="text-sm text-gray-400">Plateformes utilisées</div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Top 4 jeux les mieux notés</h2>
        </div>

        {topRatedGames.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {topRatedGames.map(gameRating => {
              const coverUrl =
                gameCovers[gameRating.game_id] ||
                gameRating.game_data?.background_image ||
                gameRating.game_data?.images?.cover_url;

              const gameForCard = gameRating.game_data
                ? {
                    ...gameRating.game_data,
                    images: {
                      cover_url: coverUrl || gameRating.game_data.images?.cover_url || null
                    }
                  }
                : {
                    id: parseInt(gameRating.game_id) || 0,
                    slug: gameRating.game_slug,
                    name: gameRating.game_slug,
                    released: '',
                    images: { cover_url: coverUrl || null },
                    rating: 0,
                    genres: [],
                    platforms: []
                  };

              return (
                <div key={gameRating.id} className="relative">
                  <SimpleGameCard
                    game={gameForCard}
                    onClick={() =>
                      handleGameClick(
                        gameRating.game_id,
                        gameRating.game_data?.name || gameRating.game_slug,
                        gameRating.game_slug
                      )
                    }
                  />
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-lg text-sm font-bold flex items-center space-x-1 pointer-events-none">
                    <Star className="h-3 w-3 fill-white" />
                    <span>{gameRating.rating.toFixed(1)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Heart className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Aucun jeu noté pour le moment</p>
          </div>
        )}
      </div>

      {showGameDetail && selectedGame && (
        <GameDetailModal
          isOpen={showGameDetail}
          game={selectedGame}
          onClose={() => {
            setShowGameDetail(false);
            setSelectedGame(null);
          }}
        />
      )}

      {showFollowersModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
              onClick={() => setShowFollowersModal(false)}
            ></div>
            <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-900 shadow-xl rounded-2xl border border-gray-700">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Followers</h2>
                <button
                  onClick={() => setShowFollowersModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                <FollowersListView
                  userId={profileUser.id}
                  onUserClick={id => {
                    setShowFollowersModal(false);
                    onUserClick?.(id);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showFollowingModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
              onClick={() => setShowFollowingModal(false)}
            ></div>
            <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-900 shadow-xl rounded-2xl border border-gray-700">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white">Abonnements</h2>
                <button
                  onClick={() => setShowFollowingModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                <FollowsListView
                  userId={profileUser.id}
                  onUserClick={id => {
                    setShowFollowingModal(false);
                    onUserClick?.(id);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (isOpen && onClose) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
          <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-2xl border border-gray-700">
            <div className="max-h-[90vh] overflow-y-auto">
              <ProfileContent />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ProfileContent />;
};

export default UserProfileView;
