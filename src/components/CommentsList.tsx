import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { ActivityComment, getActivityComments } from '../lib/api/comments';
import { useLanguage } from '../contexts/LanguageContext';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';

interface CommentsListProps {
  activityId: string;
  initialCommentsCount?: number;
}

export const CommentsList: React.FC<CommentsListProps> = ({
  activityId,
  initialCommentsCount = 0
}) => {
  const { t } = useLanguage();
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);

  useEffect(() => {
    if (showComments && comments.length === 0) {
      loadComments();
    }
  }, [showComments]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const data = await getActivityComments(activityId);
      setComments(data);
      setCommentsCount(data.length);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommentCreated = () => {
    loadComments();
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowComments(!showComments)}
        className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
      >
        <MessageCircle className="w-5 h-5" />
        <span>
          {commentsCount} {commentsCount === 1 ? t('feed.comment') : t('feed.comments')}
        </span>
      </button>

      {showComments && (
        <div className="space-y-4">
          <CommentForm
            activityId={activityId}
            onCommentCreated={handleCommentCreated}
            placeholder={t('feed.writeComment')}
          />

          {isLoading ? (
            <div className="text-center text-gray-500 py-4">
              {t('common.loading')}
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onCommentDeleted={loadComments}
                  onReplyCreated={loadComments}
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

export default CommentsList;
