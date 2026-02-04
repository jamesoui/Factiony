import React, { useState, useEffect } from 'react';
import { Star, Clock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getFriendsActivities,
  enrichActivitiesWithGameData,
  getActivityMessage,
  getActivityDetails,
  formatActivityDate,
  UserActivity
} from '../lib/api/activities';
import LikeButton from './LikeButton';
import CommentsList from './CommentsList';

interface FriendsActivitySectionProps {
  onGameClick?: (gameId: string) => void;
  onUserClick?: (userId: string) => void;
}

const FriendsActivitySection: React.FC<FriendsActivitySectionProps> = ({
  onGameClick,
  onUserClick
}) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [user, language]);

  const loadActivities = async () => {
    try {
      setLoading(true);

      if (!user) {
        console.log('[FRIENDS_ACTIVITY] No user authenticated, skipping');
        setActivities([]);
        return;
      }

      console.log('[FRIENDS_ACTIVITY] Loading activities for user:', user.id);
      const data = await getFriendsActivities(15);
      console.log('[FRIENDS_ACTIVITY] Received activities:', data.length);

      if (data.length > 0) {
        const enrichedData = await enrichActivitiesWithGameData(data, language);
        setActivities(enrichedData);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error('[FRIENDS_ACTIVITY] Error loading activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-16">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {language === 'fr' ? 'Les dernières actualités de vos amis' : 'Your Friends\' Latest Activity'}
          </h2>
          <p className="text-gray-400 text-sm">
            {language === 'fr'
              ? 'Découvrez ce que vos amis pensent des derniers jeux'
              : 'See what your friends think about the latest games'}
          </p>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex-shrink-0 w-80 bg-gray-800 rounded-lg p-4 animate-pulse">
              <div className="h-32 bg-gray-700 rounded-lg mb-4"></div>
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    if (!user) {
      return null;
    }

    return (
      <section className="mb-16">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            👥 {language === 'fr' ? 'Activité de mes follows' : 'Activity from my follows'}
          </h2>
          <p className="text-gray-400 text-sm">
            {language === 'fr'
              ? 'Découvrez ce que vos follows pensent des derniers jeux'
              : 'See what your follows think about the latest games'}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <div className="text-gray-500 mb-2">
            {language === 'fr'
              ? 'Aucune activité récente de vos follows'
              : 'No recent activity from your follows'}
          </div>
          <p className="text-gray-600 text-sm">
            {language === 'fr'
              ? 'Suivez des utilisateurs pour voir leur activité ici'
              : 'Follow users to see their activity here'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-16">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          👥 {language === 'fr' ? 'Activité de mes follows' : 'Activity from my follows'}
        </h2>
        <p className="text-gray-400 text-sm">
          {language === 'fr'
            ? 'Découvrez ce que vos follows pensent des derniers jeux'
            : 'See what your follows think about the latest games'}
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex-shrink-0 w-80 bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-colors"
          >
            {activity.game_image && (
              <div
                className="h-32 bg-cover bg-center cursor-pointer relative"
                style={{ backgroundImage: `url(${activity.game_image})` }}
                onClick={() => onGameClick?.(activity.game_id)}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent"></div>
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start space-x-3 mb-3">
                {activity.user_avatar ? (
                  <img
                    src={activity.user_avatar}
                    alt={activity.username}
                    className="w-10 h-10 rounded-full object-cover cursor-pointer"
                    onClick={() => onUserClick?.(activity.user_id)}
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-white font-bold cursor-pointer"
                    onClick={() => onUserClick?.(activity.user_id)}
                  >
                    {activity.username.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <button
                      onClick={() => onUserClick?.(activity.user_id)}
                      className="font-semibold text-white hover:text-orange-400 transition-colors truncate"
                    >
                      {activity.username}
                    </button>
                    <span className="text-gray-400 text-sm flex-shrink-0">
                      {getActivityMessage(activity, language)}
                    </span>
                  </div>

                  <button
                    onClick={() => onGameClick?.(activity.game_id)}
                    className="text-orange-400 hover:text-orange-300 transition-colors font-medium truncate block w-full text-left text-sm"
                  >
                    {activity.game_name}
                  </button>

                  {activity.activity_type === 'rating' && activity.activity_data.rating && (
                    <div className="flex items-center space-x-1 mt-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-yellow-400 font-semibold text-sm">
                        {activity.activity_data.rating.toFixed(1)}
                      </span>
                      <span className="text-gray-500 text-sm">/5</span>
                    </div>
                  )}

                  {activity.activity_type === 'review' && activity.activity_data.review_text && (
                    <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                      {activity.activity_data.review_text}
                    </p>
                  )}

                  <div className="flex items-center space-x-1 mt-2 text-gray-500 text-xs">
                    <Clock className="h-3 w-3" />
                    <span>{formatActivityDate(activity.created_at, language)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
                <div className="flex items-center space-x-3">
                  <LikeButton
                    type="activity"
                    id={activity.id}
                    initialLikeCount={activity.likes_count || 0}
                    initialIsLiked={false}
                  />
                </div>

                <CommentsList
                  activityId={activity.id}
                  initialCommentsCount={activity.comments_count || 0}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </section>
  );
};

export default FriendsActivitySection;
