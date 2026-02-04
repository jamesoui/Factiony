import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { ReviewComment, getReviewComments, createReviewComment } from '../lib/api/reviewComments';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useAuthGuard } from '../contexts/AuthGuardContext';
import ReviewCommentItem from './ReviewCommentItem';

interface ReviewCommentsListProps {
  reviewId: string;
  onUserClick?: (userId: string) => void;
}

const ReviewCommentsList: React.FC<ReviewCommentsListProps> = ({
  reviewId,
  onUserClick
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { requireAuth } = useAuthGuard();
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (showComments && comments.length === 0) {
      loadComments();
    }
  }, [showComments]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const data = await getReviewComments(reviewId);
      setComments(data);

      const totalCount = data.reduce((sum, comment) => {
        return sum + 1 + (comment.replies_count || 0);
      }, 0);
      setCommentsCount(totalCount);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    if (!user) {
      requireAuth();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createReviewComment({
        review_id: reviewId,
        content: newComment.trim()
      });

      if (result.success) {
        setNewComment('');
        loadComments();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments && !user) {
      requireAuth();
      return;
    }
    setShowComments(!showComments);
  };

  return (
    <div className="space-y-4">
      <button
        onClick={handleToggleComments}
        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
      >
        <MessageCircle className="w-5 h-5" />
        <span>
          {commentsCount} {commentsCount === 1 ? t('feed.comment') : t('feed.comments')}
        </span>
      </button>

      {showComments && (
        <div className="space-y-4">
          <div className="space-y-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={t('feed.writeComment')}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              rows={3}
            />
            <div className="flex justify-end">
              <button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t('common.sending') : t('common.send')}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center text-gray-500 py-4">
              {t('common.loading')}
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <ReviewCommentItem
                  key={comment.id}
                  comment={comment}
                  onCommentDeleted={loadComments}
                  onReplyCreated={loadComments}
                  onUserClick={onUserClick}
                />
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              {t('feed.noComments')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewCommentsList;
