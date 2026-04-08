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
  onCommentPosted?: () => void;
  defaultOpen?: boolean;
  initialCount?: number;
}

const ReviewCommentsList: React.FC<ReviewCommentsListProps> = ({
  reviewId,
  onUserClick,
  onCommentPosted,
  defaultOpen = false,
  initialCount = 0
}) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { requireAuth } = useAuthGuard();
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showComments, setShowComments] = useState(defaultOpen);
  const [commentsCount, setCommentsCount] = useState(initialCount);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultOpen) {
      loadComments();
    }
  }, [defaultOpen, reviewId]);

  useEffect(() => {
    if (showComments && !defaultOpen && comments.length === 0) {
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
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    if (!user) { requireAuth(); return; }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createReviewComment({
        review_id: reviewId,
        content: newComment.trim()
      });

      if (result.success) {
        setNewComment('');
        await loadComments();
        onCommentPosted?.();
      } else {
        setError(result.error || 'Erreur lors de l\'envoi');
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
      setError('Erreur lors de l\'envoi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments && !user) { requireAuth(); return; }
    setShowComments(!showComments);
  };

  const labelComments = language === 'fr'
    ? commentsCount === 1 ? '1 commentaire' : `${commentsCount} commentaires`
    : commentsCount === 1 ? '1 comment' : `${commentsCount} comments`;

  if (defaultOpen) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={language === 'fr' ? 'Écrivez un commentaire...' : 'Write a comment...'}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmitComment();
            }}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? (language === 'fr' ? 'Envoi...' : 'Sending...')
                : (language === 'fr' ? 'Envoyer' : 'Send')}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-500 py-4">
            {language === 'fr' ? 'Chargement...' : 'Loading...'}
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
          <div className="text-center text-gray-500 py-2 text-sm">
            {language === 'fr' ? 'Aucun commentaire pour le moment' : 'No comments yet'}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleToggleComments}
        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
      >
        <MessageCircle className="w-5 h-5" />
        <span>{labelComments}</span>
      </button>

      {showComments && (
        <div className="space-y-4">
          <div className="space-y-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={language === 'fr' ? 'Écrivez un commentaire...' : 'Write a comment...'}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              rows={3}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex justify-end">
              <button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? (language === 'fr' ? 'Envoi...' : 'Sending...')
                  : (language === 'fr' ? 'Envoyer' : 'Send')}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center text-gray-500 py-4">
              {language === 'fr' ? 'Chargement...' : 'Loading...'}
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
              {language === 'fr' ? 'Aucun commentaire pour le moment' : 'No comments yet'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReviewCommentsList;