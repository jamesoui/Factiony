import React, { useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Filter, Clock, Star, Loader } from 'lucide-react';
import UserLink from '../UserLink';
import GameDetailModal from '../GameDetailModal';
import ReviewCommentsList from '../ReviewCommentsList';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Game } from '../../types';
import { getGameById } from '../../apiClient';
import { supabase } from '../../lib/supabaseClient';
import {
  getFriendsActivitiesWithInteractions,
  getPublicActivitiesWithInteractions,
  enrichActivitiesWithGameData,
  formatActivityDate,
  UserActivity
} from '../../lib/api/activities';
import {
  likeActivity,
  unlikeActivity,
  isActivityLikedByUser,
  likeReview,
  unlikeReview
} from '../../lib/api/likes';

interface FeedViewProps {
  onUserClick?: (userId: string) => void;
  onGameClick?: (gameId: string) => void;
}

// Cache review_id par activity.id pour éviter des requêtes répétées
const reviewIdCache: Record<string, string | null> = {};

async function resolveReviewId(activity: UserActivity): Promise<string | null> {
  // 1. Déjà dans activity_data (nouvelles activités après patch ratings.ts)
  if (activity.activity_data?.review_id) {
    return activity.activity_data.review_id;
  }
  // 2. Cache local
  if (activity.id in reviewIdCache) {
    return reviewIdCache[activity.id];
  }
  // 3. Fallback : lookup game_ratings par user_id + game_id (anciennes activités)
  try {
    const { data } = await supabase
      .from('game_ratings')
      .select('id')
      .eq('user_id', activity.user_id)
      .eq('game_id', activity.game_id)
      .not('review_text', 'is', null)
      .maybeSingle();
    const resolved = data?.id || null;
    reviewIdCache[activity.id] = resolved;
    return resolved;
  } catch {
    reviewIdCache[activity.id] = null;
    return null;
  }
}

const FeedView: React.FC<FeedViewProps> = ({ onUserClick, onGameClick }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState('follows');
  const [activeSort, setActiveSort] = useState('recent');
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedActivities, setLikedActivities] = useState<Set<string>>(new Set());
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showGameDetail, setShowGameDetail] = useState(false);
  const [resolvedReviewIds, setResolvedReviewIds] = useState<Record<string, string | null>>({});
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  // Compteurs live mis à jour quand on poste depuis le feed
  const [commentsCounts, setCommentsCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user) loadActivities();
  }, [user, language, activeFilter]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      let data: UserActivity[] = [];

      if (activeFilter === 'trends') {
        // BUG 1 FIX : merger public + amis pour avoir tout le monde dans Tendances
        const [publicData, friendsData] = await Promise.all([
          getPublicActivitiesWithInteractions(100),
          getFriendsActivitiesWithInteractions(50)
        ]);
        const seen = new Set<string>();
        const merged: UserActivity[] = [];
        for (const a of [...publicData, ...friendsData]) {
          if (!seen.has(a.id)) { seen.add(a.id); merged.push(a); }
        }
        data = merged;
      } else {
        data = await getFriendsActivitiesWithInteractions(50);
      }

      if (data.length > 0) {
        const enriched = await enrichActivitiesWithGameData(data, language);
        setActivities(enriched);

        // Initialiser compteurs de commentaires
        const counts: Record<string, number> = {};
        enriched.forEach(a => { counts[a.id] = a.comments_count || 0; });
        setCommentsCounts(counts);

        // BUG 2 FIX : résoudre review_id pour toutes les critiques (nouvelles + anciennes)
        const reviewActivities = enriched.filter(
          a => a.activity_type === 'review' || a.activity_data?.review_text
        );
        const resolved: Record<string, string | null> = {};
        await Promise.all(
          reviewActivities.map(async a => {
            resolved[a.id] = await resolveReviewId(a);
          })
        );
        setResolvedReviewIds(resolved);

        // Statuts de like
        if (user) {
          const statuses = await Promise.all(enriched.map(a => isActivityLikedByUser(a.id)));
          const liked = new Set<string>();
          enriched.forEach((a, i) => { if (statuses[i]) liked.add(a.id); });
          setLikedActivities(liked);
        }
      } else {
        setActivities([]);
      }
    } catch (err) {
      console.error('Error loading activities:', err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeClick = async (activityId: string) => {
    if (!user) return;
    const isLiked = likedActivities.has(activityId);
    const updated = new Set(likedActivities);
    if (isLiked) updated.delete(activityId); else updated.add(activityId);
    setLikedActivities(updated);
    setActivities(prev => prev.map(a =>
      a.id === activityId ? { ...a, likes_count: (a.likes_count || 0) + (isLiked ? -1 : 1) } : a
    ));
    try {
      // Like dans activity_likes (feed)
      if (isLiked) await unlikeActivity(activityId);
      else await likeActivity(activityId);

      // Like aussi dans review_likes (fiche jeu) si on a le review_id
      const reviewId = resolvedReviewIds[activityId];
      if (reviewId) {
        if (isLiked) await unlikeReview(reviewId);
        else await likeReview(reviewId);
      }
    } catch {
      setLikedActivities(likedActivities);
      setActivities(activities);
    }
  };

  const handleGameClick = async (gameId: string) => {
    try {
      const gameData = await getGameById(gameId);
      if (gameData) { setSelectedGame(gameData as Game); setShowGameDetail(true); }
    } catch (err) {
      console.error('Error loading game details:', err);
    }
  };

  const handleToggleComments = (activityId: string) => {
    setOpenCommentsId(prev => prev === activityId ? null : activityId);
  };

  // Incrémente le compteur live dès qu'un commentaire est posté depuis le feed
  const handleCommentPosted = useCallback((activityId: string) => {
    setCommentsCounts(prev => ({ ...prev, [activityId]: (prev[activityId] || 0) + 1 }));
  }, []);

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? 'fill-yellow-400 text-yellow-400'
          : i < rating ? 'fill-yellow-400/50 text-yellow-400'
          : 'text-gray-600'
        }`}
      />
    ));

  const sortedActivities = [...activities].sort((a, b) => {
    if (activeFilter === 'trends') {
      const diff = (b.interaction_count || 0) - (a.interaction_count || 0);
      if (diff !== 0) return diff;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center py-20">
          <Loader className="h-12 w-12 text-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen">
      {/* Filtres */}
      <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <div className="flex space-x-2">
              {[
                { key: 'follows', label: t('feed.follows') || 'Follows' },
                { key: 'trends', label: t('feed.trends') }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeFilter === key ? 'bg-orange-900 text-orange-300' : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <select
            value={activeSort}
            onChange={e => setActiveSort(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="recent">{t('feed.recent')}</option>
          </select>
        </div>
      </div>

      {/* Activités */}
      {sortedActivities.length === 0 ? (
        <div className="text-center py-20">
          <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            {activeFilter === 'trends'
              ? language === 'fr' ? 'Aucune activité publique' : 'No public activity'
              : language === 'fr' ? 'Aucune activité récente' : 'No recent activity'}
          </h3>
          <p className="text-gray-500">
            {activeFilter === 'trends'
              ? language === 'fr' ? 'Aucune activité publique pour le moment' : 'No public activity yet'
              : language === 'fr' ? 'Suivez des utilisateurs pour voir leur activité ici !' : 'Follow users to see their activity here!'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedActivities.map(activity => {
            const reviewId = resolvedReviewIds[activity.id];
            const commentsOpen = openCommentsId === activity.id;
            const commentsCount = commentsCounts[activity.id] ?? activity.comments_count ?? 0;

            return (
              <div key={activity.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                {/* Header utilisateur */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
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
                    <div>
                      <UserLink
                        userId={activity.user_id}
                        username={activity.username}
                        onUserClick={onUserClick}
                        className="font-semibold text-white"
                      />
                      <p className="text-sm text-gray-400">
                        {formatActivityDate(activity.created_at, language)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Jeu */}
                <div
                  className="flex items-center space-x-4 mb-4 p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => handleGameClick(activity.game_id)}
                >
                  {activity.game_image && (
                    <img
                      src={activity.game_image}
                      alt={activity.game_name}
                      className="w-16 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold text-white mb-2">{activity.game_name}</h4>
                    {activity.activity_data.rating && (
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">{renderStars(activity.activity_data.rating)}</div>
                        <span className="text-sm text-gray-400">{activity.activity_data.rating.toFixed(1)}/5</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Texte critique */}
                {activity.activity_data.review_text && (
                  <div className="text-gray-300 mb-4 leading-relaxed">
                    {activity.activity_data.contains_spoilers ? (
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gray-800 backdrop-blur-md rounded-lg flex items-center justify-center z-10 group-hover:opacity-0 transition-opacity cursor-pointer">
                          <div className="text-center">
                            <span className="text-orange-400 font-semibold">⚠️ Spoilers</span>
                            <p className="text-sm text-gray-400 mt-1">
                              {language === 'fr' ? 'Survolez pour révéler' : 'Hover to reveal'}
                            </p>
                          </div>
                        </div>
                        <p className="blur-sm group-hover:blur-none transition-all">
                          {activity.activity_data.review_text}
                        </p>
                      </div>
                    ) : (
                      <p>{activity.activity_data.review_text}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-4 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => handleLikeClick(activity.id)}
                    className={`flex items-center space-x-1 transition-colors ${
                      likedActivities.has(activity.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${likedActivities.has(activity.id) ? 'fill-current' : ''}`} />
                    <span className="text-sm">{activity.likes_count || 0}</span>
                  </button>

                  {reviewId ? (
                    // Bouton commentaires cliquable → ouvre le thread inline
                    <button
                      onClick={() => handleToggleComments(activity.id)}
                      className={`flex items-center space-x-1 transition-colors ${
                        commentsOpen ? 'text-orange-400' : 'text-gray-400 hover:text-orange-400'
                      }`}
                    >
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-sm">{commentsCount}</span>
                    </button>
                  ) : commentsCount > 0 ? (
                    // Pas de review_id résolu : compteur affiché mais non cliquable
                    <div className="flex items-center space-x-1 text-gray-400">
                      <MessageCircle className="h-5 w-5" />
                      <span className="text-sm">{commentsCount}</span>
                    </div>
                  ) : null}
                </div>

                {/* Thread commentaires inline — même table review_comments que la fiche jeu = sync auto */}
                {reviewId && commentsOpen && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <ReviewCommentsList
                      reviewId={reviewId}
                      onUserClick={onUserClick}
                      onCommentPosted={() => handleCommentPosted(activity.id)}
                      defaultOpen={true}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedGame && (
        <GameDetailModal
          isOpen={showGameDetail}
          onClose={() => { setShowGameDetail(false); setSelectedGame(null); }}
          game={selectedGame}
          onUserClick={onUserClick}
        />
      )}
    </div>
  );
};

export default FeedView;
