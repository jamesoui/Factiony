import React, { useState, useEffect } from 'react';
import { Users, Search, UserMinus, UserPlus, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { followUser, unfollowUser, isFollowing } from '../../lib/api/users';
import UserLink from '../UserLink';

interface FollowersListViewProps {
  userId?: string;
  onUserClick?: (userId: string) => void;
}

interface FollowerUser {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  is_verified?: boolean;
  is_premium?: boolean;
  isFollowingBack?: boolean;
}

const FollowersListView: React.FC<FollowersListViewProps> = ({ userId: propUserId, onUserClick }) => {
  const { user } = useAuth();
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actioningIds, setActioningIds] = useState<Set<string>>(new Set());

  const targetUserId = propUserId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      loadFollowers();
    }
  }, [targetUserId]);

  const loadFollowers = async () => {
    if (!targetUserId) return;

    try {
      setLoading(true);

      const { data: followersData, error: followersError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('followed_id', targetUserId);

      if (followersError) {
        console.error('Error loading followers IDs:', followersError);
        setFollowers([]);
        return;
      }

      if (!followersData || followersData.length === 0) {
        setFollowers([]);
        return;
      }

      const followerIds = followersData.map(f => f.follower_id);

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, avatar_url, bio, is_verified, is_premium')
        .in('id', followerIds);

      if (usersError) {
        console.error('Error loading follower profiles:', usersError);
        setFollowers([]);
        return;
      }

      const followersWithStatus = await Promise.all(
        (usersData || []).map(async (follower) => {
          const isFollowingBack = await isFollowing(follower.id);
          return {
            ...follower,
            isFollowingBack
          };
        })
      );

      setFollowers(followersWithStatus);
    } catch (error) {
      console.error('Error loading followers:', error);
      setFollowers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (userId: string, currentlyFollowing: boolean) => {
    if (!user) return;

    try {
      setActioningIds(prev => new Set(prev).add(userId));

      if (currentlyFollowing) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }

      setFollowers(prev =>
        prev.map(f =>
          f.id === userId ? { ...f, isFollowingBack: !currentlyFollowing } : f
        )
      );
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setActioningIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const filteredFollowers = followers.filter(follower =>
    follower.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="h-8 w-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const isOwnProfile = !propUserId || propUserId === user?.id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {isOwnProfile ? 'Mes Followers' : 'Followers'}
        </h1>
        <p className="text-gray-400">
          {followers.length} abonné{followers.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un abonné..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {filteredFollowers.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {searchQuery ? 'Aucun abonné trouvé' : 'Aucun abonné'}
          </h3>
          <p className="text-gray-400">
            {searchQuery
              ? 'Essayez une autre recherche'
              : 'Personne ne vous suit pour le moment'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFollowers.map(follower => (
            <div
              key={follower.id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div
                    className="flex-shrink-0 cursor-pointer"
                    onClick={() => onUserClick?.(follower.id)}
                  >
                    {follower.avatar_url ? (
                      <img
                        src={follower.avatar_url}
                        alt={follower.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {follower.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <UserLink
                        userId={follower.id}
                        username={follower.username}
                        onClick={onUserClick}
                      />
                      {follower.is_verified && (
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {follower.is_premium && (
                        <span className="bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded text-xs font-bold flex-shrink-0">
                          PREMIUM
                        </span>
                      )}
                    </div>
                    {follower.bio && (
                      <p className="text-gray-400 text-sm truncate">{follower.bio}</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleFollowToggle(follower.id, follower.isFollowingBack || false)}
                  disabled={actioningIds.has(follower.id)}
                  className={`ml-3 flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
                    follower.isFollowingBack
                      ? 'bg-gray-700 hover:bg-red-600 text-white'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  {actioningIds.has(follower.id) ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : follower.isFollowingBack ? (
                    <>
                      <UserMinus className="h-4 w-4" />
                      <span>Ne plus suivre</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Suivre</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FollowersListView;
