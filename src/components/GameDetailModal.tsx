import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { X, Star, Calendar, Monitor, Users, Heart, Plus, ExternalLink, Clock, Trophy, MessageCircle, Share2, Play, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { Game } from '../types';
import StarRating from './StarRating';
import ReviewModal from './ReviewModal';
import UserLink from './UserLink';
import GameScreenshots from './GameScreenshots';
import GameVideos from './GameVideos';
import ShareReviewButton from './ShareReviewButton';
import ReviewCommentsList from './ReviewCommentsList';
import BuyLinks from './BuyLinks';
import LikeButton from './LikeButton';
import GameForum from './GameForum';
import { SimpleGameCard } from './SimpleGameCard';
import ContentActionsMenu from './ContentActionsMenu';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useAuthGuard } from '../contexts/AuthGuardContext';
import { getGameById } from '../apiClient';
import { supabase } from '../lib/supabaseClient';
import { rateGame, getGameAverageRating, getGameReviews } from '../lib/api/ratings';
import { getGameFollowersCount } from '../lib/api/gameFollows';
import { trackEvent } from '../lib/analytics';
import { getSimilarGames } from '../lib/api/similarGames';
import { gameToSlug } from '../utils/slugify';
import { TOP_100_GAMES } from '../data/top100Games';

// Composant pour gérer l'affichage des spoilers
const SpoilerText: React.FC<{ content: string }> = ({ content }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  
  return (
    <div className="relative">
      {!isRevealed && (
        <div 
          className="absolute inset-0 bg-gray-600 rounded flex items-center justify-center z-10 cursor-pointer"
          onClick={() => setIsRevealed(true)}
        >
          <span className="text-yellow-400 text-xs font-medium">⚠️ Spoiler - Cliquez pour révéler</span>
        </div>
      )}
      <div
        className={`transition-all duration-300 ${
          !isRevealed ? 'blur-sm select-none' : ''
        }`}
      >
        <p>{content}</p>
      </div>
    </div>
  );
};

interface GameDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game;
  onRate?: (rating: number) => void;
  onReview?: (review: string, rating: number) => void;
  onViewChange?: (view: string, userId?: string) => void;
  onUserClick?: (userId: string) => void;
  controlledIsOnboarding?: boolean;
  controlledListType?: string;
  controlledIndex?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

interface ForumPost {
  id: string;
  gameId: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  type: string;
  date: string;
  likes: number;
  isLiked: boolean;
  replies: ForumReply[];
  poll?: {
    id: string;
    question: string;
    options: {
      id: string;
      text: string;
      votes: number;
    }[];
    totalVotes: number;
  };
}

interface ForumReply {
  id: string;
  postId: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  date: string;
  likes: number;
  isLiked: boolean;
}

const GameDetailModal: React.FC<GameDetailModalProps> = ({
  isOpen,
  onClose,
  game,
  onRate,
  onReview,
  onViewChange,
  onUserClick,
  controlledIsOnboarding,
  controlledListType,
  controlledIndex,
  onPrev,
  onNext
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { requireAuth } = useAuthGuard();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isOnboarding = controlledIsOnboarding !== undefined ? controlledIsOnboarding : searchParams.get('onboarding') === '1';
  const listType = controlledListType !== undefined ? controlledListType : searchParams.get('list');
  const currentIndex = controlledIndex !== undefined ? controlledIndex : parseInt(searchParams.get('index') || '-1', 10);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [similarGames, setSimilarGames] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isAnticipating, setIsAnticipating] = useState(false);
  const [anticipationCount, setAnticipationCount] = useState(game.anticipationCount || 0);
  const [reviewLikes, setReviewLikes] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [fullGame, setFullGame] = useState<any>(null);
  const [loadingFullGame, setLoadingFullGame] = useState(true);
  const [forumPosts, setForumPosts] = useState<ForumPost[]>([
    {
      id: '1',
      gameId: game.id,
      userId: '2',
      username: 'GameMaster92',
      avatar: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=150',
      content: 'Quelqu\'un a-t-il des conseils pour le boss final ? Je suis bloqué depuis des heures !',
      type: 'question',
      date: '2024-01-20',
      likes: 5,
      isLiked: false,
      replies: [
        {
          id: '1-1',
          postId: '1',
          userId: '3',
          username: 'ProGamer',
          avatar: 'https://images.pexels.com/photos/1337247/pexels-photo-1337247.jpeg?auto=compress&cs=tinysrgb&w=150',
          content: 'Essaie d\'utiliser la magie de feu, c\'est très efficace contre ce boss !',
          date: '2024-01-20',
          likes: 3,
          isLiked: false
        }
      ]
    },
    {
      id: '2',
      gameId: game.id,
      userId: '4',
      username: 'IndieExplorer',
      avatar: 'https://images.pexels.com/photos/1298601/pexels-photo-1298601.jpeg?auto=compress&cs=tinysrgb&w=150',
      content: 'Ce jeu est absolument magnifique ! Les détails dans chaque environnement sont incroyables.',
      type: 'comment',
      date: '2024-01-19',
      likes: 12,
      isLiked: true,
      replies: []
    }
  ]);
  const [newForumPost, setNewForumPost] = useState('');
  const [forumSortBy, setForumSortBy] = useState('recent');
  const [expandedReplies, setExpandedReplies] = useState<string[]>([]);
  const [postType, setPostType] = useState<'text' | 'poll'>('text');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [userRating, setUserRating] = useState<any>(null);
  const [isEditingRating, setIsEditingRating] = useState(false);
  const [tempRating, setTempRating] = useState(0);
  const [tempReview, setTempReview] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [factionyAvgRating, setFactionyAvgRating] = useState<number | null>(null);
  const [showAllTags, setShowAllTags] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL ?? 'https://europe-west1-factiony-1fc0f.cloudfunctions.net/apiFunction';
  const FACTIONY_KEY = import.meta.env.VITE_FACTIONY_KEY ?? 'FACTIONY_KEY_35d39805f838ac70aa9dca01e4e3ff0764e638dd341728f4';

  const ONBOARDING_GAMES = TOP_100_GAMES.slice(0, 65);

  const navigateToGame = (direction: 'prev' | 'next') => {
    if (!isOnboarding || listType !== 'topplayed' || currentIndex < 0) return;

    if (direction === 'prev' && onPrev) {
      onPrev();
      return;
    }

    if (direction === 'next' && onNext) {
      onNext();
      return;
    }

    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= ONBOARDING_GAMES.length) return;

    const nextGame = ONBOARDING_GAMES[newIndex];
    navigate(`/game/${nextGame.slug}?onboarding=1&list=topplayed&index=${newIndex}`);
  };

  const canNavigatePrev = isOnboarding && listType === 'topplayed' && currentIndex > 0;
  const canNavigateNext = isOnboarding && listType === 'topplayed' && currentIndex >= 0 && currentIndex < ONBOARDING_GAMES.length - 1;

  useEffect(() => {
    if (!game?.id || !isOpen) return;

    setLoadingFullGame(true);
    setFullGame(null);
    (async () => {
      try {
        // Appeler l'edge function qui gère le cache intelligemment
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const currentLocale = localStorage.getItem('language') || 'fr';

        console.log(`🔄 Chargement des données pour le jeu ${game.id}...`);

        const res = await fetch(
          `${supabaseUrl}/functions/v1/fetch-game-data?gameId=${game.id}&locale=${currentLocale}`,
          {
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
          }
        );

        const data = await res.json();

        if (data?.ok && data?.game) {
          console.log('✅ Données du jeu reçues:', {
            name: data.game.name,
            hasDescription: !!data.game.description_raw,
            descriptionLength: data.game.description_raw?.length || 0,
            hasStores: !!data.game.stores,
            storesCount: data.game.stores?.length || 0,
            stores: data.game.stores
          });
          console.log('FRONT_MEDIA_DEBUG', {
            screenshots: data.game?.screenshots,
            videos: data.game?.videos,
            videosType: typeof data.game?.videos,
            trailersCount: data.game?.videos?.trailers?.length || 0,
            gameplayCount: data.game?.videos?.gameplay?.length || 0
          });
          setFullGame(data.game);
        } else {
          console.warn("⚠️ fetchGameData n'a rien renvoyé :", data);
        }
      } catch (e) {
        console.error("❌ Erreur côté front lors du fetch du jeu :", e);
      } finally {
        setLoadingFullGame(false);
      }
    })();
  }, [game?.id, isOpen]);

  useEffect(() => {
    if (!fullGame?.id || !isOpen) return;

    const genres = fullGame.genres?.map((g: any) => g.name ?? g).filter(Boolean) || [];
    const tags = fullGame.tags?.map((t: any) => t.name ?? t).filter(Boolean) || [];

    // Ne rien faire si pas de genres ni de tags
    if (genres.length === 0 && tags.length === 0) return;

    console.log("SIMILAR INPUT", {
      game: fullGame.name,
      genres,
      tags: tags.slice(0, 10)
    });

    (async () => {
      try {
        const result = await getSimilarGames(fullGame.id, genres, tags);
        setSimilarGames(result.games || []);
      } catch (e) {
        console.error('Error loading similar games:', e);
        setSimilarGames([]);
      }
    })();
  }, [fullGame?.id, isOpen]);

  // Reset all game-specific states when game.id changes
  useEffect(() => {
    if (!game?.id || !isOpen) return;

    // Reset rating/review states
    setUserRating(null);
    setTempRating(userRating?.rating ?? 0);
    setTempReview('');
    setIsEditingRating(false);
    setIsSubmittingRating(false);

    // Reset other states
    setFactionyAvgRating(null);
    setFollowersCount(0);
    setIsFollowing(false);
    setGameReviews([]);
    setActiveTab('overview');
    setShowAllTags(false);
  }, [game?.id, isOpen]);

  useEffect(() => {
    if (!user || !game?.id || !isOpen) return;
    loadUserRating();
    checkIfFollowing();
  }, [user, game?.id, isOpen]);

  useEffect(() => {
    if (!game?.id || !isOpen) return;
    loadFactionyRating();
    loadFollowersCount();
  }, [game?.id, isOpen]);

  const loadFactionyRating = async () => {
    if (!game?.id) return;
    try {
      const avg = await getGameAverageRating(game.id);
      setFactionyAvgRating(avg);
    } catch (e) {
      console.error('Error loading Factiony rating:', e);
    }
  };

  const loadFollowersCount = async () => {
    if (!game?.id) return;
    try {
      const count = await getGameFollowersCount(game.id);
      setFollowersCount(count);
    } catch (e) {
      console.error('Error loading followers count:', e);
    }
  };

  const loadUserRating = async () => {
    if (!user || !game?.id) return;

    try {
      const { data, error } = await supabase
        .from('game_ratings')
        .select('*')
        .eq('user_id', user.id)
        .eq('game_id', game.id.toString())
        .maybeSingle();

      if (error) {
        console.error('Error loading user rating:', error);
        return;
      }

      console.log('Loaded user rating:', data);
      setUserRating(data);
      if (data) {
        setTempRating(data.rating);
        setTempReview(data.review_text || '');
      }
    } catch (e) {
      console.error('Error loading user rating:', e);
    }
  };

  const checkIfFollowing = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('game_follows')
        .select('id')
        .eq('user_id', user.id)
        .eq('game_id', game.id.toString())
        .maybeSingle();

      if (error) {
        console.error('Error checking follow status:', error);
        return;
      }

      setIsFollowing(!!data);
    } catch (e) {
      console.error('Error checking follow status:', e);
    }
  };

  // Calculer les dates de sortie en fonction de fullGame
  const releaseDateData = React.useMemo(() => {
    const releaseDateStr = fullGame?.released || game?.releaseDate || game?.released;

    const releaseDate = !releaseDateStr
      ? 'Inconnue'
      : isNaN(new Date(releaseDateStr).getTime())
      ? 'Inconnue'
      : new Date(releaseDateStr).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });

    const isReleased =
      !!releaseDateStr &&
      !isNaN(new Date(releaseDateStr).getTime()) &&
      new Date(releaseDateStr).getTime() <= Date.now();

    return { releaseDateStr, releaseDate, isReleased };
  }, [fullGame, game]);

  const { releaseDateStr, releaseDate, isReleased } = releaseDateData;
  const isGameReleased = isReleased;

  const [gameReviews, setGameReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (activeTab === 'reviews' && isGameReleased) {
      loadGameReviews();
    }
  }, [activeTab, isGameReleased, game.id]);

  useEffect(() => {
    if (isOpen && game?.id) {
      trackEvent('view_game', {
        game_id: game.id?.toString() || null,
        game_name: game.name || game.title || null
      });
    }
  }, [isOpen, game?.id]);

  useEffect(() => {
    if (!isOpen) return;

    const reviewId = searchParams.get('review');
    const commentId = searchParams.get('comment');

    if (reviewId) {
      // Switch to reviews tab if we're showing a specific review
      if (activeTab !== 'reviews') {
        setActiveTab('reviews');
      }

      // Scroll to and highlight the review
      setTimeout(() => {
        const element = document.getElementById(`review-${reviewId}`);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });

          // Add highlight effect
          element.classList.add('ring-2', 'ring-orange-500', 'ring-offset-2', 'ring-offset-gray-800');

          // Remove highlight after 3 seconds
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-orange-500', 'ring-offset-2', 'ring-offset-gray-800');
          }, 3000);
        }
      }, 800);
    }

    if (commentId) {
      setTimeout(() => {
        const element = document.getElementById(`comment-${commentId}`);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });

          // Add highlight effect
          element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2', 'ring-offset-gray-800');

          // Remove highlight after 3 seconds
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2', 'ring-offset-gray-800');
          }, 3000);
        }
      }, 800);
    }
  }, [isOpen, searchParams, activeTab]);

  const loadGameReviews = async () => {
    setLoadingReviews(true);
    try {
      const reviews = await getGameReviews(game.id);
      setGameReviews(reviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleAnticipationToggle = () => {
    if (!requireAuth()) return;

    setIsAnticipating(!isAnticipating);
    setAnticipationCount(prev => isAnticipating ? prev - 1 : prev + 1);
  };

  const handleFollowToggle = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    console.log('[FOLLOW] handleFollowToggle called');

    if (!user) {
      console.log('[FOLLOW] User not connected, requireAuth');
      requireAuth();
      return;
    }

    console.log('[FOLLOW] User:', user.id);
    const g = fullGame ?? game;
    const gameId = g.id.toString();
    const gameName = g.name || g.title;
    console.log('[FOLLOW]', { userId: user.id, gameId, gameName });

    try {
      if (isFollowing) {
        console.log('[FOLLOW] Unfollowing...');
        const { error } = await supabase
          .from('game_follows')
          .delete()
          .eq('user_id', user.id)
          .eq('game_id', gameId);

        if (error) {
          console.error('[FOLLOW] Error unfollowing:', error);
          return;
        }
        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
        console.log('[FOLLOW] Success: unfollowed', gameName);
      } else {
        console.log('[FOLLOW] Following...');

        // Ensure game exists in games table before following
        const { error: gameUpsertError } = await supabase
          .from('games')
          .upsert({
            id: gameId,
            slug: g.slug || gameId,
            name: gameName,
            background_image: g.background_image || g.coverUrl || g.coverImage || null,
            released: g.released || g.releaseDate || null
          }, {
            onConflict: 'id',
            ignoreDuplicates: true
          });

        if (gameUpsertError) {
          console.error('[FOLLOW] Error upserting game:', gameUpsertError);
        }

        // Now insert the follow
        const { error } = await supabase
          .from('game_follows')
          .insert({
            user_id: user.id,
            game_id: gameId,
            game_name: gameName
          });

        if (error) {
          console.error('[FOLLOW] Error following:', error);
          return;
        }
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        console.log('[FOLLOW] Success: now following', gameName);
      }
    } catch (e) {
      console.error('[FOLLOW] Exception:', e);
    }
  };

  const handleReviewLike = (reviewId: string) => {
    if (!requireAuth()) return;

    setReviewLikes(prev => {
      const current = prev[reviewId] || { liked: false, count: 0 };
      return {
        ...prev,
        [reviewId]: {
          liked: !current.liked,
          count: current.liked ? current.count - 1 : current.count + 1
        }
      };
    });
  };

  const handleForumPostLike = (postId: string) => {
    if (!requireAuth()) return;

    setForumPosts(posts => posts.map(post =>
      post.id === postId
        ? { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
        : post
    ));
  };

  const handleReplySubmit = (postId: string) => {
    if (!requireAuth()) return;
    if (!replyText.trim()) return;
    
    const newReply: ForumReply = {
      id: `${postId}-${Date.now()}`,
      postId,
      userId: '1',
      username: 'GamerPro2024',
      avatar: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=150',
      content: replyText.trim(),
      date: new Date().toISOString().split('T')[0],
      likes: 0,
      isLiked: false
    };

    setForumPosts(posts => posts.map(post => 
      post.id === postId 
        ? { ...post, replies: [...post.replies, newReply] }
        : post
    ));
    
    setReplyText('');
    setReplyingTo(null);
  };

  const handleForumPostSubmit = () => {
    if (!requireAuth()) return;
    if (postType === 'text' && !newForumPost.trim()) return;
    if (postType === 'poll' && (!pollQuestion.trim() || pollOptions.filter(opt => opt.trim()).length < 2)) return;
    
    const newPost: ForumPost = {
      id: Date.now().toString(),
      gameId: game.id,
      userId: '1',
      username: 'GamerPro2024',
      avatar: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=150',
      content: postType === 'text' ? newForumPost.trim() : pollQuestion.trim(),
      type: postType === 'poll' ? 'poll' : 'comment',
      date: new Date().toISOString().split('T')[0],
      likes: 0,
      isLiked: false,
      replies: [],
      poll: postType === 'poll' ? {
        id: `poll-${Date.now()}`,
        question: pollQuestion.trim(),
        options: pollOptions.filter(opt => opt.trim()).map((option, index) => ({
          id: `option-${index}`,
          text: option.trim(),
          votes: 0
        })),
        totalVotes: 0
      } : undefined
    };
    
    setForumPosts([newPost, ...forumPosts]);
    setNewForumPost('');
    setPollQuestion('');
    setPollOptions(['', '']);
    setPostType('text');
  };

  const toggleReplies = (postId: string) => {
    setExpandedReplies(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const handleVote = (pollId: string, optionId: string) => {
    if (!requireAuth()) return;
    // Vérifier si l'utilisateur a déjà voté
    if (userVotes[pollId]) return;
    
    // Enregistrer le vote de l'utilisateur
    setUserVotes(prev => ({ ...prev, [pollId]: optionId }));
    
    // Mettre à jour les votes dans les posts
    setForumPosts(posts => posts.map(post => {
      if (post.poll && post.poll.id === pollId) {
        return {
          ...post,
          poll: {
            ...post.poll,
            options: post.poll.options.map(option => 
              option.id === optionId 
                ? { ...option, votes: option.votes + 1 }
                : option
            ),
            totalVotes: post.poll.totalVotes + 1
          }
        };
      }
      return post;
    }));
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleSubmitRating = async () => {
    if (!user) {
      requireAuth();
      return;
    }

    if (!game?.id || tempRating === 0) return;

    setIsSubmittingRating(true);
    try {
      const g = fullGame ?? game;
      const gameSlug = g?.slug || game.id.toString();

      if (userRating) {
        // Update existing rating
        console.log('Updating existing rating');
        const { error } = await supabase
          .from('game_ratings')
          .update({
            rating: tempRating,
            review_text: tempReview,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('game_id', game.id.toString());

        if (error) throw error;
      } else {
        // Insert new rating
        console.log('Inserting new rating');
        const { error } = await supabase
          .from('game_ratings')
          .insert({
            user_id: user.id,
            game_id: game.id.toString(),
            game_slug: gameSlug,
            rating: tempRating,
            review_text: tempReview
          });

        if (error) throw error;
      }

      // Reload user rating
      console.log('Reloading user rating after submit');
      await loadUserRating();
      setIsEditingRating(false);
    } catch (e) {
      console.error('Error submitting rating:', e);
      alert('Erreur lors de l\'enregistrement de votre note');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleStartEditing = () => {
    if (!requireAuth()) return;

    const ratingVal =
  typeof userRating === 'number'
    ? userRating
    : (userRating as any)?.rating ?? 0;

const reviewVal =
  typeof userRating === 'object' && userRating
    ? ((userRating as any).review_text || '')
    : '';

setTempRating(ratingVal);
setTempReview(reviewVal);
setIsEditingRating(true);
  };

  const handleCancelEditing = () => {
    setIsEditingRating(false);
    const ratingVal =
  typeof userRating === 'number'
    ? userRating
    : (userRating as any)?.rating ?? 0;

const reviewVal =
  typeof userRating === 'object' && userRating
    ? ((userRating as any).review_text || '')
    : '';

setTempRating(ratingVal);
setTempReview(reviewVal);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => {
      const isFullStar = i < Math.floor(rating);
      const isHalfStar = i < rating && i >= Math.floor(rating);

      return (
        <div key={i} className="relative inline-block">
          <Star
            className={`h-4 w-4 ${
              isFullStar
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-600'
            }`}
          />
          {isHalfStar && (
            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>
          )}
        </div>
      );
    });
  };

  const renderInteractiveStars = (rating: number, onChange: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => {
      const isFullStar = i < Math.floor(rating);
      const isHalfStar = i < rating && i >= Math.floor(rating);

      return (
        <div key={i} className="relative inline-block">
          <button
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const isLeftHalf = x < rect.width / 2;
              onChange(isLeftHalf ? i + 0.5 : i + 1);
            }}
            className="focus:outline-none relative"
          >
            <Star
              className={`h-8 w-8 transition-colors cursor-pointer ${
                isFullStar
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-600 hover:text-yellow-400'
              }`}
            />
            {isHalfStar && (
              <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
              </div>
            )}
          </button>
        </div>
      );
    });
  };

  // Helper pour mapper les tableaux en toute sécurité
  const safeMap = (arr: any, mapper: (x: any) => string): string => {
    if (!arr) return '';
    if (!Array.isArray(arr)) return '';
    const mapped = arr.map(mapper).filter(Boolean);
    return mapped.length > 0 ? mapped.join(', ') : '';
  };

  // Utiliser useMemo pour recalculer les données à chaque changement de fullGame ou game
  const gameData = React.useMemo(() => {
    const g = fullGame ?? game;

    console.log('🎮 Recalcul des données du jeu:', {
      name: g?.name,
      hasDescription: !!g?.description_raw,
      descriptionLength: g?.description_raw?.length || 0,
      hasStores: !!g?.stores,
      storesCount: g?.stores?.length || 0,
      stores: g?.stores
    });

    const getDeveloperName = () => {
      if (g?.developers?.[0]?.name) return g.developers[0].name;
      if (typeof g?.developer === 'string') return g.developer;
      if (typeof game?.developer === 'string') return game.developer;
      if (game?.developer && typeof game.developer === 'object' && (game.developer as any).name) {
        return (game.developer as any).name;
      }
      return 'Inconnu';
    };

    const getStoresHTML = () => {
      const buyLinks = g?.buy_links;
      const storeList = g?.stores || [];

      const useDirectLinks = Array.isArray(buyLinks) && buyLinks.length > 0;
      const linksToUse = useDirectLinks ? buyLinks : storeList;

      console.log('🛒 Buy links:', buyLinks);
      console.log('🛒 Stores:', storeList);
      console.log('🛒 Using direct links:', useDirectLinks);

      if (!Array.isArray(linksToUse) || linksToUse.length === 0) {
        console.log('⚠️ Aucun store trouvé dans les données');
        return 'Non disponible';
      }

      const filteredStores = linksToUse.filter((s: any) => s.url && s.url.length > 0);
      console.log('✅ Stores filtrés:', filteredStores);

      if (filteredStores.length === 0) return 'Non disponible';

      const storeOrder = ['steam', 'playstation', 'xbox', 'epic', 'nintendo', 'gog'];

      const sortedStores = [...filteredStores].sort((a, b) => {
        const aStore = (a.store || a.name || '').toLowerCase();
        const bStore = (b.store || b.name || '').toLowerCase();

        const aIndex = storeOrder.findIndex(s => aStore.includes(s));
        const bIndex = storeOrder.findIndex(s => bStore.includes(s));

        const aOrder = aIndex === -1 ? 999 : aIndex;
        const bOrder = bIndex === -1 ? 999 : bIndex;

        return aOrder - bOrder;
      });

      return sortedStores
        .map((s: any) =>
          `<a href="${s.url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">${s.name}</a>`
        )
        .join(' • ');
    };

    const publishersStr = safeMap(g?.publishers, (x: any) => typeof x === 'string' ? x : x?.name);
    const publishersStr2 = publishersStr || safeMap(game?.publishers, (x: any) => typeof x === 'string' ? x : x?.name);

    const genresStr = safeMap(g?.genres, (x: any) => typeof x === 'string' ? x : x?.name);
    const genresStr2 = genresStr || safeMap(game?.genres, (x: any) => typeof x === 'string' ? x : x?.name);

    const tagsStr = (Array.isArray(g?.tags) && g.tags.length > 0) ? safeMap(g.tags.slice(0, 6), (x: any) => x?.name) : '';
    const tagsStr2 = tagsStr || ((Array.isArray(game?.tags) && game.tags.length > 0) ? safeMap(game.tags.slice(0, 6), (x: any) => x?.name) : '');

    const platformsStr = safeMap(g?.platforms, (p: any) => typeof p === 'string' ? p : p?.platform?.name);
    const platformsStr2 = platformsStr || safeMap(game?.platforms, (p: any) => typeof p === 'string' ? p : p?.platform?.name);

    const metacriticValue = g?.metacritic ?? game?.metacritic ?? 'Inconnue';
    const displayMetacritic = (metacriticValue === 'Inconnue' || metacriticValue === 'Unknown' || !metacriticValue) ? '—' : String(metacriticValue);

    const tagsArray = Array.isArray(g?.tags) && g.tags.length > 0 ? g.tags : (Array.isArray(game?.tags) && game.tags.length > 0 ? game.tags : []);
    const excludedTags = ['steam', 'xbox', 'playstation', 'nintendo', 'controller', 'fps', 'achievements', 'cloud', 'vr', 'mobile', 'singleplayer', 'multiplayer', 'co-op'];
    const filteredTags = tagsArray.filter((tag: any) => {
      const tagName = typeof tag === 'string' ? tag : tag?.name;
      return tagName && !excludedTags.some(excluded => tagName.toLowerCase().includes(excluded));
    });

    return {
      g,
      metacritic: displayMetacritic,
      playtime: g?.playtime ? `${g.playtime} h` : game?.playtime ? `${game.playtime} h` : 'Inconnue',
      cover: g?.background_image ?? g?.images?.cover_url ?? g?.coverUrl ?? g?.coverImage ?? game?.coverImage ?? game?.coverUrl ?? null,
      studio: getDeveloperName(),
      publishers: publishersStr2 || 'Inconnus',
      genres: genresStr2 || 'Inconnue',
      tags: tagsStr2 || 'Inconnue',
      tagsArray: filteredTags,
      platforms: platformsStr2 || 'Inconnues',
      stores: getStoresHTML(),
      buyLinks: g?.buy_links,
      storesList: g?.stores,
      pcRequirements: g?.pc_requirements || {}
    };
  }, [fullGame, game]);

  const { g, metacritic, playtime, cover, studio, publishers, genres, tags, tagsArray, platforms, stores, buyLinks, storesList, pcRequirements } = gameData;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-2xl border border-gray-700">
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                {canNavigatePrev && (
                  <button
                    onClick={() => navigateToGame('prev')}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
                    title="Jeu précédent"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                )}
                <h2 className="text-2xl font-bold text-white">{g?.name || game.title || game.name || ''}</h2>
                {canNavigateNext && (
                  <button
                    onClick={() => navigateToGame('next')}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
                    title="Jeu suivant"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            {(g?.name || game.title || game.name) && (
              <p className="text-sm text-gray-400">
                Tout sur {g?.name || game.title || game.name} : notes, critiques, discussions et recommandations.
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-700">
            <nav className="flex">
              {[
                { key: 'overview', label: t('game.overview') },
                ...(isGameReleased ? [{ key: 'reviews', label: t('game.reviews') }] : []),
                { key: 'forum', label: t('game.forum') }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === key
                      ? 'border-orange-500 text-orange-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="max-h-[70vh] overflow-y-auto">
            {activeTab === 'overview' && (
              <div className="p-6">
                {/* Bouton Suivre pour jeux non sortis */}
                {user && !isReleased && (
                  <div className="mb-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white">Suivre ce jeu</h3>
                      {followersCount > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">
                            {followersCount} {followersCount === 1 ? 'personne en attente' : 'personnes en attente'}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleFollowToggle}
                      className={`py-2 px-4 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                        isFollowing
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <Bell className="h-5 w-5" />
                      <span>{isFollowing ? '✓ Suivi' : '🔔 Suivre'}</span>
                    </button>
                    {isFollowing && (
                      <p className="text-xs text-gray-400 mt-2">
                        Vous recevrez une notification pour chaque mise à jour de ce jeu
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-6">
                  {cover && (
                    <div className="md:w-1/3">
                      <img
                        src={cover}
                        alt={g?.name || game.title}
                        className="w-full rounded-xl shadow-lg object-contain bg-black/10"
                      />
                    </div>
                  )}

                  <div className="flex-1 space-y-4 text-sm text-white">
                    <h2 className="text-2xl font-bold text-white mb-2">{g?.name || game.title}</h2>

                    {/* Genres badges */}
                    <div className="flex flex-wrap gap-2">
                      {typeof genres === 'string' && genres !== 'Inconnue' && genres.split(', ').map((genre: string, idx: number) => (
                        <span key={`${genre}-${idx}`} className="px-3 py-1 bg-orange-900 text-orange-300 rounded-full text-xs font-medium">
                          {genre}
                        </span>
                      ))}
                    </div>

                    {/* Tags section */}
                    {tagsArray && tagsArray.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-gray-400 text-xs font-medium">🏷️ Tags</p>
                        <div className="flex flex-wrap gap-2">
                          {tagsArray.slice(0, showAllTags ? 25 : 12).map((tag: any, idx: number) => {
                            const tagName = typeof tag === 'string' ? tag : tag?.name;
                            return (
                              <span key={`${tagName}-${idx}`} className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-xs">
                                {tagName}
                              </span>
                            );
                          })}
                        </div>
                        {tagsArray.length > 12 && (
                          <button
                            onClick={() => setShowAllTags(!showAllTags)}
                            className="text-xs text-orange-400 hover:text-orange-300 transition-colors font-medium"
                          >
                            {showAllTags ? '− Voir moins' : `+ Voir plus (${tagsArray.length - 12} autres)`}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Structured info grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 bg-gray-700/30 rounded-lg p-4">
                      <div>
                        <p className="text-gray-400 text-xs">🎯 Score Metacritic</p>
                        <p className="text-white font-semibold">
                          {metacritic !== '—' ? String(metacritic) : 'Non disponible'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">⭐ Note Factiony</p>
                        <p className="text-white font-semibold">
                          {factionyAvgRating !== null ? `${factionyAvgRating.toFixed(1)}/5` : 'Pas encore noté'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">⏱️ Durée moyenne</p>
                        <p className="text-white font-semibold">{String(playtime)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">🏢 Studio principal</p>
                        <p className="text-white font-semibold">{String(studio)}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-gray-400 text-xs">📆 Date de sortie</p>
                        <p className="text-white font-semibold">{String(releaseDate)}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-gray-400 text-xs">🎮 Plateformes</p>
                        <p className="text-white font-semibold">{String(typeof platforms === 'string' ? platforms : 'Inconnues')}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-gray-400 text-xs">🏷️ Catégories principales</p>
                        <p className="text-white font-semibold">{String(typeof genres === 'string' ? genres : 'Inconnue')}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-gray-400 text-xs">🛒 Où acheter</p>
                        <BuyLinks
                          buyLinks={buyLinks}
                          stores={storesList}
                          gameId={game.id}
                          gameName={game.name || game.title}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <h3 className="font-semibold text-white text-base mb-2 flex items-center gap-2">
                        <span>📜</span> Description
                      </h3>
                      {loadingFullGame ? (
                        <div className="flex items-center space-x-2 text-gray-400">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                          <span className="text-sm">Chargement de la description...</span>
                        </div>
                      ) : (
                        <p className="text-white/80 leading-relaxed text-sm whitespace-pre-line">
                          {g?.description_raw || game.description || 'Aucune description disponible.'}
                        </p>
                      )}
                    </div>

                    {/* PC Requirements */}
                    {!loadingFullGame && pcRequirements && (pcRequirements.minimum || pcRequirements.recommended) && (
                      <div className="bg-gray-700/30 rounded-lg p-4">
                        <h3 className="font-semibold text-white text-base mb-3 flex items-center gap-2">
                          <span>💻</span> Configuration PC
                        </h3>
                        <div className="space-y-4">
                          {pcRequirements.minimum && (
                            <div>
                              <p className="text-orange-400 font-medium text-sm mb-2">Minimum</p>
                              <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap bg-gray-800/50 rounded p-3 leading-relaxed">
                                {pcRequirements.minimum}
                              </pre>
                            </div>
                          )}
                          {pcRequirements.recommended && (
                            <div>
                              <p className="text-green-400 font-medium text-sm mb-2">Recommandée</p>
                              <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap bg-gray-800/50 rounded p-3 leading-relaxed">
                                {pcRequirements.recommended}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section de notation utilisateur - INLINE */}
                {isReleased && (
                  <div className="mt-6 mb-6 p-6 bg-gray-700/50 rounded-lg border border-gray-600">
                    <h3 className="text-xl font-semibold text-white mb-4">
                      {userRating && !isEditingRating ? 'Votre avis' : 'Noter et critiquer ce jeu'}
                    </h3>

                    {userRating && !isEditingRating ? (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-white font-medium">Ma note :</span>
                          <div className="flex items-center space-x-1">
                            {renderStars(userRating.rating)}
                          </div>
                          <span className="text-yellow-400 font-bold text-lg">{userRating.rating.toFixed(1)} ★</span>
                        </div>

                        {userRating.review_text && (
                          <div className="bg-gray-800 rounded-lg p-4">
                            <p className="text-sm text-gray-400 mb-1">Ma critique :</p>
                            <p className="text-white">{userRating.review_text}</p>
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button
                            onClick={handleStartEditing}
                            className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                          >
                            Modifier
                          </button>
                          {(() => {
                            console.log('ShareReviewButton render check:', {
                              hasUserRatingId: !!userRating?.id,
                              hasUser: !!user,
                              userRating,
                              reviewId: userRating?.id
                            });
                            return userRating?.id && user ? (
                              <ShareReviewButton
                                reviewId={userRating.id}
                                gameId={game.id}
                                gameName={game.title}
                                username={user.username || 'User'}
                                rating={userRating.rating}
                              />
                            ) : null;
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Votre note (obligatoire)
                          </label>
                          <div className="flex items-center space-x-2">
                            {renderInteractiveStars(tempRating, setTempRating)}
                            {tempRating > 0 && (
                              <span className="ml-3 text-yellow-400 font-bold text-lg">{tempRating.toFixed(1)} ★</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Votre critique (optionnel)
                          </label>
                          <textarea
                            value={tempReview}
                            onChange={(e) => setTempReview(e.target.value)}
                            placeholder="Partagez votre avis sur ce jeu..."
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                            rows={4}
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={handleSubmitRating}
                            disabled={tempRating === 0 || isSubmittingRating}
                            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-6 rounded-lg font-medium transition-colors"
                          >
                            {isSubmittingRating ? 'Enregistrement...' : userRating ? 'Enregistrer les modifications' : 'Publier'}
                          </button>
                          {isEditingRating && userRating && (
                            <button
                              onClick={handleCancelEditing}
                              disabled={isSubmittingRating}
                              className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-6 rounded-lg font-medium transition-colors"
                            >
                              Annuler
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Media Section - Screenshots and Videos */}
                {!loadingFullGame && fullGame && (
                  <div className="mt-6 space-y-6">
                    <GameScreenshots screenshots={fullGame.screenshots || []} />
                    <GameVideos
                      trailers={fullGame.videos?.trailers || []}
                      gameplay={fullGame.videos?.gameplay || []}
                    />
                  </div>
                )}

                {/* SEO Block - Jeux similaires */}
                {similarGames.length > 0 && (
                  <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
                    <h2 className="text-xl font-bold text-white mb-4">
                      Jeux similaires à "{g?.name || game.title || game.name}"
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {similarGames.map((similarGame) => (
                        <div
                          key={similarGame.id}
                          onClick={() => {
                            try {
                              const slug = gameToSlug(similarGame.id, similarGame.name);
                              navigate(`/game/${slug}`);
                            } catch (e) {
                              console.error('Navigation error:', e);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <SimpleGameCard game={similarGame} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white">{t('game.userReviews')}</h3>
                </div>

                {loadingReviews ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                    <p className="text-gray-400 mt-4">{t('common.loading')}</p>
                  </div>
                ) : gameReviews.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">{t('game.noReviews')}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {gameReviews.map(review => (
                      <div key={review.id} id={`review-${review.id}`} className="bg-gray-700 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            {review.avatar ? (
                              <img
                                src={review.avatar}
                                alt={review.username}
                                className="w-10 h-10 rounded-full object-cover cursor-pointer"
                                onClick={() => onUserClick?.(review.userId)}
                              />
                            ) : (
                              <div
                                className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center cursor-pointer"
                                onClick={() => onUserClick?.(review.userId)}
                              >
                                <span className="text-sm font-medium text-gray-400">
                                  {review.username[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                            )}
                            <div>
                              <UserLink
                                userId={review.userId}
                                username={review.username}
                                onUserClick={onUserClick}
                                className="font-semibold text-white"
                              />
                              <div className="flex items-center space-x-2 mt-1">
                                <div className="flex space-x-1">
                                  {renderStars(review.rating)}
                                </div>
                                <span className="text-sm text-gray-400">{review.rating}/5</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{new Date(review.date).toLocaleDateString()}</span>
                            <ContentActionsMenu
                              authorUserId={review.userId}
                              authorUsername={review.username}
                              contentType="review"
                              contentId={review.id}
                              contentUrl={`${window.location.origin}/share/review/${review.id}`}
                              contentExcerpt={review.content}
                            />
                          </div>
                        </div>

                        <div className="mb-4">
                          {review.spoilers ? (
                            <SpoilerText content={review.content} />
                          ) : (
                            <p className="text-gray-300 leading-relaxed">{review.content}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-3 mb-4">
                          <LikeButton
                            type="review"
                            id={review.id}
                            initialLikeCount={review.likesCount || 0}
                            initialIsLiked={review.isLiked || false}
                            onLikeChange={(liked, newCount) => {
                              setGameReviews(prevReviews =>
                                prevReviews.map(r =>
                                  r.id === review.id
                                    ? { ...r, likesCount: newCount, isLiked: liked }
                                    : r
                                )
                              );
                            }}
                          />
                          <ShareReviewButton
                            reviewId={review.id}
                            gameId={game.id}
                            gameName={game.name}
                            username={review.username}
                            rating={review.rating}
                          />
                        </div>

                        <ReviewCommentsList
                          reviewId={review.id}
                          onUserClick={onUserClick}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'forum' && (
              <div className="p-6">
                <GameForum gameId={String(game.id)} gameName={game.name} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de critique */}
      {showReviewModal && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          game={game}
          onSave={async (review) => {
            try {
              const g = fullGame ?? game;
              const gameSlug = g?.slug || game.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
              const reviewText = review.isQuickReview ? null : review.content;
              const gameId = game.id.toString();

              await rateGame(gameId, gameSlug, review.rating, reviewText || undefined, review.spoilers);

              alert('Votre note et critique ont été enregistrées avec succès !');
              setShowReviewModal(false);

              await loadUserRating();

              if (onRate) {
                onRate(review.rating);
              }

              if (onReview && reviewText) {
                onReview(reviewText, review.rating);
              }

              window.dispatchEvent(new CustomEvent('reviewSaved'));
            } catch (error) {
              console.error('Erreur lors de la sauvegarde:', error);
              alert('Erreur lors de l\'enregistrement de votre note. Veuillez réessayer.');
              throw error;
            }
          }}
        />
      )}
    </div>
  );
};

export default GameDetailModal;