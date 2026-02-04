import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { likeActivity, unlikeActivity, likeComment, unlikeComment, likeReview, unlikeReview } from '../lib/api/likes';
import { useAuth } from '../contexts/AuthContext';

interface LikeButtonProps {
  type: 'activity' | 'comment' | 'review';
  id: string;
  initialLikeCount: number;
  initialIsLiked: boolean;
  onLikeChange?: (liked: boolean, newCount: number) => void;
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  type,
  id,
  initialLikeCount,
  initialIsLiked,
  onLikeChange
}) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLiked(initialIsLiked);
    setLikeCount(initialLikeCount);
  }, [initialIsLiked, initialLikeCount]);

  const handleLike = async () => {
    if (!user || isLoading) return;

    setIsLoading(true);

    try {
      if (isLiked) {
        let result;
        if (type === 'activity') {
          result = await unlikeActivity(id);
        } else if (type === 'comment') {
          result = await unlikeComment(id);
        } else {
          result = await unlikeReview(id);
        }

        if (result.success) {
          const newCount = Math.max(0, likeCount - 1);
          setIsLiked(false);
          setLikeCount(newCount);
          onLikeChange?.(false, newCount);
        }
      } else {
        let result;
        if (type === 'activity') {
          result = await likeActivity(id);
        } else if (type === 'comment') {
          result = await likeComment(id);
        } else {
          result = await likeReview(id);
        }

        if (result.success) {
          const newCount = likeCount + 1;
          setIsLiked(true);
          setLikeCount(newCount);
          onLikeChange?.(true, newCount);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={!user || isLoading}
      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all ${
        isLiked
          ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
          : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-red-400'
      } ${!user ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <Heart
        className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`}
      />
      <span className="text-sm font-medium">{likeCount}</span>
    </button>
  );
};

export default LikeButton;
