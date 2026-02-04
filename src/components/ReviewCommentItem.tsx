import React, { useState, useEffect } from 'react';
import { MessageCircle, MoreVertical, Trash2, Edit2, Heart, Check } from 'lucide-react';
import {
  ReviewComment,
  getCommentReplies,
  updateReviewComment,
  deleteReviewComment,
  createReviewComment,
  toggleReviewCommentLike
} from '../lib/api/reviewComments';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import UserLink from './UserLink';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface ReviewCommentItemProps {
  comment: ReviewComment;
  onCommentDeleted?: () => void;
  onReplyCreated?: () => void;
  onUserClick?: (userId: string) => void;
}

const ReviewCommentItem: React.FC<ReviewCommentItemProps> = ({
  comment,
  onCommentDeleted,
  onReplyCreated,
  onUserClick
}) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replies, setReplies] = useState<ReviewComment[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isUpdating, setIsUpdating] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [likesCount, setLikesCount] = useState(comment.likes_count || 0);
  const [isLiked, setIsLiked] = useState(comment.is_liked || false);
  const [isTogglingLike, setIsTogglingLike] = useState(false);

  const isOwner = user?.id === comment.user_id;
  const locale = language === 'fr' ? fr : enUS;

  useEffect(() => {
    if (showReplies && replies.length === 0 && (comment.replies_count || 0) > 0) {
      loadReplies();
    }
  }, [showReplies]);

  const loadReplies = async () => {
    setIsLoadingReplies(true);
    try {
      const data = await getCommentReplies(comment.id);
      setReplies(data);
    } catch (error) {
      console.error('Error loading replies:', error);
    } finally {
      setIsLoadingReplies(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('common.confirmDelete'))) return;

    const result = await deleteReviewComment(comment.id);
    if (result.success) {
      onCommentDeleted?.();
    }
  };

  const handleUpdate = async () => {
    if (!editContent.trim() || isUpdating) return;

    setIsUpdating(true);
    try {
      const result = await updateReviewComment(comment.id, editContent.trim());
      if (result.success) {
        comment.content = editContent.trim();
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      const result = await createReviewComment({
        review_id: comment.review_id,
        content: replyContent.trim(),
        parent_id: comment.id
      });

      if (result.success) {
        setReplyContent('');
        setShowReplyForm(false);
        loadReplies();
        setShowReplies(true);
        onReplyCreated?.();
      }
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleToggleLike = async () => {
    if (isTogglingLike || !user) return;

    setIsTogglingLike(true);
    const previousLiked = isLiked;
    const previousCount = likesCount;

    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    try {
      const result = await toggleReviewCommentLike(comment.id);
      if (!result.success) {
        setIsLiked(previousLiked);
        setLikesCount(previousCount);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
    } finally {
      setIsTogglingLike(false);
    }
  };

  const handleReplyCreated = () => {
    loadReplies();
    onReplyCreated?.();
  };

  return (
    <div id={`comment-${comment.id}`} className="space-y-3">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {comment.user?.avatar_url ? (
            <img
              src={comment.user.avatar_url}
              alt={comment.user.username}
              className="w-8 h-8 rounded-full object-cover cursor-pointer"
              onClick={() => onUserClick?.(comment.user_id)}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center cursor-pointer"
              onClick={() => onUserClick?.(comment.user_id)}
            >
              <span className="text-sm font-medium text-gray-400">
                {comment.user?.username?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserLink
                userId={comment.user_id}
                username={comment.user?.username || 'Unknown'}
                onUserClick={onUserClick}
                className="font-medium text-white"
              />
              {comment.user?.is_verified && (
                <Check className="w-4 h-4 text-blue-500" />
              )}
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale })}
              </span>
            </div>

            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-gray-700 rounded transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 mt-1 w-40 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-20 overflow-hidden">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-700 text-white transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>{t('common.edit')}</span>
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-gray-700 text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>{t('common.delete')}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleUpdate}
                  disabled={!editContent.trim() || isUpdating}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.save')}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-300">{comment.content}</p>
          )}

          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleLike}
              disabled={isTogglingLike || !user}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
                isLiked
                  ? 'bg-red-900/30 text-red-500'
                  : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-red-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{likesCount}</span>
            </button>

            {!comment.parent_id && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-blue-400 rounded-lg transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{t('feed.reply')}</span>
              </button>
            )}

            {(comment.replies_count || 0) > 0 && !comment.parent_id && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
              >
                {showReplies
                  ? t('common.hideReplies')
                  : `${t('common.showReplies')} (${comment.replies_count})`}
              </button>
            )}
          </div>
        </div>
      </div>

      {showReplyForm && (
        <div className="ml-11">
          <div className="space-y-2">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={t('feed.writeComment')}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
              rows={3}
              autoFocus
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || isSubmittingReply}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.reply')}
              </button>
              <button
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyContent('');
                }}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReplies && (
        <div className="ml-11 space-y-3 border-l-2 border-gray-700 pl-4">
          {isLoadingReplies ? (
            <div className="text-center text-gray-500 py-2">
              {t('common.loading')}
            </div>
          ) : (
            replies.map((reply) => (
              <ReviewCommentItem
                key={reply.id}
                comment={reply}
                onCommentDeleted={loadReplies}
                onReplyCreated={handleReplyCreated}
                onUserClick={onUserClick}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewCommentItem;
