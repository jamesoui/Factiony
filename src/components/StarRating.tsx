import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  onRatingChange, 
  readonly = false,
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const handleStarClick = (event: React.MouseEvent, starIndex: number) => {
    if (!readonly && onRatingChange) {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const starWidth = rect.width;
      const isLeftHalf = clickX < starWidth / 2;
      
      const newRating = isLeftHalf ? starIndex - 0.5 : starIndex;
      onRatingChange(Math.max(0.5, newRating)); // Minimum 0.5
    }
  };

  const renderStars = () => {
    const stars = [];
    
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= rating;
      const isHalfFilled = rating >= i - 0.5 && rating < i;
      
      stars.push(
        <button
          key={i}
          type="button"
          onClick={(e) => handleStarClick(e, i)}
          disabled={readonly}
          className={`${
            readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
          } transition-transform duration-150 ${!readonly ? 'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded' : ''}`}
        >
          <Star
            className={`${sizeClasses[size]} ${
              isFilled
                ? 'fill-yellow-400 text-yellow-400'
                : isHalfFilled
                ? 'text-yellow-400'
                : 'text-gray-300 hover:text-yellow-200'
            } transition-colors duration-150`}
            style={isHalfFilled ? {
              background: 'linear-gradient(90deg, #fbbf24 50%, transparent 50%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            } : {}}
          />
        </button>
      );
    }
    
    return stars;
  };

  return (
    <div className="flex items-center space-x-1">
      {renderStars()}
    </div>
  );
};

export default StarRating;