import React, { useState, useEffect } from 'react';
import { MessageCircle, MoreVertical, Trash2, Edit2, Check } from 'lucide-react';
import { ActivityComment, getCommentReplies, updateComment, deleteComment } from '../lib/api/comments';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import LikeButton from './LikeButton';
import CommentForm from './CommentForm';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface CommentItemProps {
  comment: ActivityComment;
  onCommentDeleted?: () => void;
  onReplyCreated?: () => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onCommentDeleted,
  onReplyCreated
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replies, setReplies] = useState<ActivityComment[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isUpdating, setIsUpdating] = useState(false);

  const isOwner = user?.id === comment.user_id;
  const locale = t('language') === 'fr' ? fr : enUS;

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

    const result = await deleteComment(comment.id);
    if (result.success) {
      onCommentDeleted?.();
    }
  };

  const handleUpdate = async () => {
    if (!editContent.trim() || isUpdating) return;

    setIsUpdating(true);
    try {
      const result = await updateComment(comment.id, editContent.trim());
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

  const handleReplyCreated = () => {
    setShowReplyForm(false);
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
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-400">
                {comment.user?.username[0].toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-white">{comment.user?.username}</span>
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
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleUpdate}
                  disabled={!editContent.trim() || isUpdating}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          ) : comment.contains_spoilers ? (
            <div className="relative group">
              <div className="absolute inset-0 bg-gray-800 backdrop-blur-md rounded-lg flex items-center justify-center z-10 group-hover:opacity-0 transition-opacity cursor-pointer">
                <div className="text-center">
                  <span className="text-orange-400 font-semibold">⚠️ Spoilers</span>
                  <p className="text-xs text-gray-400 mt-1">
                    {t('language') === 'fr' ? 'Survolez pour révéler' : 'Hover to reveal'}
                  </p>
                </div>
              </div>
              <p className="text-gray-300 blur-sm group-hover:blur-none transition-all">{comment.content}</p>
            </div>
          ) : (
            <p className="text-gray-300">{comment.content}</p>
          )}

          <div className="flex items-center space-x-3">
            <LikeButton
              type="comment"
              id={comment.id}
              initialLikeCount={comment.likes_count || 0}
              initialIsLiked={comment.is_liked || false}
            />

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
          <CommentForm
            activityId={comment.activity_id}
            parentId={comment.id}
            onCommentCreated={handleReplyCreated}
            onCancel={() => setShowReplyForm(false)}
            autoFocus
          />
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
              <CommentItem
                key={reply.id}
                comment={reply}
                onCommentDeleted={loadReplies}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
