import React, { useState } from 'react';
import { Send, AlertTriangle } from 'lucide-react';
import { createComment } from '../lib/api/comments';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface CommentFormProps {
  activityId: string;
  parentId?: string;
  onCommentCreated?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const CommentForm: React.FC<CommentFormProps> = ({
  activityId,
  parentId,
  onCommentCreated,
  onCancel,
  placeholder,
  autoFocus = false
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [content, setContent] = useState('');
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !content.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const result = await createComment(activityId, content.trim(), parentId, containsSpoilers);

      if (result.success) {
        setContent('');
        setContainsSpoilers(false);
        onCommentCreated?.();
      } else {
        console.error('Failed to create comment:', result.error);
      }
    } catch (error) {
      console.error('Error creating comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username || 'User'}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-400">
                {(user.username || 'U')[0].toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder || t('feed.reply')}
            autoFocus={autoFocus}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={parentId ? 2 : 3}
          />

          {!parentId && (
            <label className="flex items-center space-x-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={containsSpoilers}
                onChange={(e) => setContainsSpoilers(e.target.checked)}
                className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-600 bg-gray-700 rounded"
              />
              <AlertTriangle className="h-4 w-4 text-orange-400" />
              <span className="text-gray-300">
                {t('language') === 'fr' ? 'Contient des spoilers' : 'Contains spoilers'}
              </span>
            </label>
          )}

          <div className="flex items-center justify-end space-x-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
            )}
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? t('common.sending') : (parentId ? t('feed.reply') : t('common.post'))}</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default CommentForm;
