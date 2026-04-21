import { logger } from '../lib/logger';
import React, { useState, useEffect } from 'react';
import { Star, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  getFriendsActivities,
  enrichActivitiesWithGameData,
  getActivityMessage,
  formatActivityDate,
  UserActivity
} from '../lib/api/activities';
import { gameToSlug } from '../utils/slugify';
import { supabase } from '../lib/supabaseClient';

interface FriendsActivitySectionProps {
  onGameClick?: (gameId: string) => void;
  onUserClick?: (userId: string) => void;
}

const FriendsActivitySection: React.FC<FriendsActivitySectionProps> = ({ onGameClick, onUserClick }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [resolvedReviewIds, setResolvedReviewIds] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // FIX : flag mounted au lieu d'AbortController pour éviter les soucis
    // de StrictMode double-mount qui annulent les requêtes en cours.
    let mounted = true;

    const loadActivities = async () => {
      try {
        setLoading(true);
        if (!user) { setActivities([]); setLoading(false); return; }

        const data = await getFriendsActivities(15);
        if (!mounted) return;

        if (data.length > 0) {
          const enrichedData = await enrichActivitiesWithGameData(data, language);
          if (!mounted) return;

          setActivities(enrichedData);

          // Batch query au lieu de N requêtes individuelles
          const resolved: Record<string, string | null> = {};

          enrichedData
            .filter(a => a.activity_data?.review_id)
            .forEach(a => { resolved[a.id] = a.activity_data.review_id; });

          const needsLookup = enrichedData.filter(
            a => !a.activity_data?.review_id &&
            (a.activity_type === 'review' || a.activity_data?.review_text)
          );

          if (needsLookup.length > 0) {
            const { data: ratingsData } = await supabase
              .from('game_ratings')
              .select('id, user_id, game_id')
              .in('user_id', needsLookup.map(a => a.user_id))
              .not('review_text', 'is', null);

            if (!mounted) return;

            needsLookup.forEach(a => {
              const match = ratingsData?.find(
                r => r.user_id === a.user_id && String(r.game_id) === String(a.game_id)
              );
              resolved[a.id] = match?.id || null;
            });
          }

          if (mounted) setResolvedReviewIds(resolved);
        } else {
          if (mounted) setActivities([]);
        }
      } catch (error) {
        console.error('[FRIENDS_ACTIVITY] Error loading activities:', error);
        if (mounted) setActivities([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadActivities();

    return () => {
      mounted = false;
    };
  }, [user, language]);

  if (loading) {
    return (
      <div className="mb-16">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            👥 {language === 'fr' ? 'Activité de mes follows' : 'Activity from my follows'}
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {[1,2,3,4,5,6,7,8].map((i) => (
            <div key={i} className="flex-shrink-0 w-72 bg-gray-800 rounded-lg p-4 animate-pulse">
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
    if (!user) return null;
    return (
      <section className="mb-16">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            👥 {language === 'fr' ? 'Activité de mes follows' : 'Activity from my follows'}
          </h2>
          <p className="text-gray-400 text-sm">
            {language === 'fr' ? 'Découvrez ce que vos follows pensent des derniers jeux' : 'See what your follows think about the latest games'}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <div className="text-gray-500 mb-2">
            {language === 'fr' ? 'Aucune activité récente de vos follows' : 'No recent activity from your follows'}
          </div>
          <p className="text-gray-600 text-sm">
            {language === 'fr' ? 'Suivez des utilisateurs pour voir leur activité ici' : 'Follow users to see their activity here'}
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
          {language === 'fr' ? 'Découvrez ce que vos follows pensent des derniers jeux' : 'See what your follows think about the latest games'}
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {activities.map((activity) => {
          const reviewId = resolvedReviewIds[activity.id];
          const gameSlug = gameToSlug(Number(activity.game_id), activity.game_name);

          return (
            <div
              key={activity.id}
              className="flex-shrink-0 w-72 bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors cursor-pointer"
              onClick={() => navigate(`/game/${gameSlug}${reviewId ? `?review=${reviewId}` : ''}`)}
            >
              {activity.game_image && (
                <div
                  className="h-32 bg-cover bg-center relative"
                  style={{ backgroundImage: `url(${activity.game_image})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent" />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start space-x-3">
                  {activity.user_avatar ? (
                    <img
                      src={activity.user_avatar}
                      alt={activity.username}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-orange-400"
                      onClick={(e) => { e.stopPropagation(); navigate(`/u/${activity.username}`); }}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0 text-sm cursor-pointer hover:ring-2 hover:ring-orange-400"
                      onClick={(e) => { e.stopPropagation(); navigate(`/u/${activity.username}`); }}
                    >
                      {activity.username.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1 flex-wrap">
                      <button
                        className="font-semibold text-white text-sm hover:text-orange-400 transition-colors truncate"
                        onClick={(e) => { e.stopPropagation(); navigate(`/u/${activity.username}`); }}
                      >
                        {activity.username}
                      </button>
                      <span className="text-gray-400 text-xs flex-shrink-0">
                        {getActivityMessage(activity, language)}
                      </span>
                    </div>

                    <button
                      className="text-orange-400 hover:text-orange-300 font-medium text-sm truncate block text-left w-full"
                      onClick={(e) => { e.stopPropagation(); navigate(`/game/${gameSlug}`); }}
                    >
                      {activity.game_name}
                    </button>

                    {activity.activity_type === 'rating' && activity.activity_data.rating && (
                      <div className="flex items-center space-x-1 mt-2">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span className="text-yellow-400 font-semibold text-sm">
                          {activity.activity_data.rating.toFixed(1)}
                        </span>
                        <span className="text-gray-500 text-xs">/5</span>
                      </div>
                    )}

                    {activity.activity_type === 'review' && activity.activity_data.review_text && (
                      <p className="text-gray-400 text-xs mt-2 line-clamp-2">
                        {activity.activity_data.review_text}
                      </p>
                    )}

                    <div className="flex items-center space-x-1 mt-2 text-gray-500 text-xs">
                      <Clock className="h-3 w-3" />
                      <span>{formatActivityDate(activity.created_at, language)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </section>
  );
};

export default FriendsActivitySection;