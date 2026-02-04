import React, { useState, useEffect } from 'react';
import { Users, Search, UserMinus, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import UserLink from '../UserLink';

interface FollowsListViewProps {
  userId?: string;
  onUserClick?: (userId: string) => void;
}

interface FollowedUser {
  id: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  is_verified?: boolean;
  is_premium?: boolean;
}

const FollowsListView: React.FC<FollowsListViewProps> = ({ userId: propUserId, onUserClick }) => {
  const { user } = useAuth();
  const [follows, setFollows] = useState<FollowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [unfollowingIds, setUnfollowingIds] = useState<Set<string>>(new Set());

  const targetUserId = propUserId || user?.id;
  const isOwnProfile = !propUserId || propUserId === user?.id;

  useEffect(() => {
    if (targetUserId) {
      loadFollows();
    }
  }, [targetUserId]);

  const loadFollows = async () => {
    if (!targetUserId) return;

    try {
      setLoading(true);

      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('followed_id')
        .eq('follower_id', targetUserId);

      if (followsError) {
        console.error('Error loading follows IDs:', followsError);
        setFollows([]);
        return;
      }

      if (!followsData || followsData.length === 0) {
        setFollows([]);
        return;
      }

      const followedIds = followsData.map(f => f.followed_id);

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username, avatar_url, bio, is_verified, is_premium')
        .in('id', followedIds);

      if (usersError) {
        console.error('Error loading followed users profiles:', usersError);
        setFollows([]);
        return;
      }

      setFollows(usersData || []);
    } catch (error) {
      console.error('Error loading follows:', error);
      setFollows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (userId: string) => {
    if (!user) return;

    try {
      setUnfollowingIds(prev => new Set(prev).add(userId));

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('followed_id', userId);

      if (error) throw error;

      setFollows(prev => prev.filter(f => f.id !== userId));
    } catch (error) {
      console.error('Error unfollowing user:', error);
    } finally {
      setUnfollowingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const filteredFollows = follows.filter(follow =>
    follow.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="h-8 w-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {isOwnProfile ? 'Mes Follows' : 'Abonnements'}
        </h1>
        <p className="text-gray-400">
          {follows.length} utilisateur{follows.length > 1 ? 's' : ''} suivi{follows.length > 1 ? 's' : ''}
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-orange-500 focus:outline-none"
          />
        </div>
      </div>

      {filteredFollows.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {searchQuery ? 'Aucun utilisateur trouvé' : 'Aucun follow'}
          </h3>
          <p className="text-gray-400">
            {searchQuery
              ? 'Essayez une autre recherche'
              : 'Commencez à suivre des utilisateurs pour voir leur activité'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFollows.map(follow => (
            <div
              key={follow.id}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div
                    className="flex-shrink-0 cursor-pointer"
                    onClick={() => onUserClick?.(follow.id)}
                  >
                    {follow.avatar_url ? (
                      <img
                        src={follow.avatar_url}
                        alt={follow.username}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {follow.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <UserLink
                        userId={follow.id}
                        username={follow.username}
                        onClick={onUserClick}
                      />
                      {follow.is_verified && (
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {follow.is_premium && (
                        <span className="bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded text-xs font-bold flex-shrink-0">
                          PREMIUM
                        </span>
                      )}
                    </div>
                    {follow.bio && (
                      <p className="text-gray-400 text-sm truncate">{follow.bio}</p>
                    )}
                  </div>
                </div>

                {isOwnProfile && (
                  <button
                    onClick={() => handleUnfollow(follow.id)}
                    disabled={unfollowingIds.has(follow.id)}
                    className="ml-3 flex items-center space-x-1 px-3 py-1.5 bg-gray-700 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {unfollowingIds.has(follow.id) ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserMinus className="h-4 w-4" />
                        <span>Ne plus suivre</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FollowsListView;
