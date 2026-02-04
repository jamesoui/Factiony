import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Game } from '../types';
import GameCard from './GameCard';

interface HorizontalGameSectionProps {
  title: string;
  games: Game[];
  onTitleClick?: () => void;
  onGameClick?: (game: Game) => void;
  showRecommendationFeedback?: boolean;
  onRecommendationFeedback?: (gameId: string, isGood: boolean) => void;
}

const HorizontalGameSection: React.FC<HorizontalGameSectionProps> = ({
  title,
  games,
  onTitleClick,
  onGameClick,
  showRecommendationFeedback = false,
  onRecommendationFeedback
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          {title}
        </h2>

        <div className="hidden md:flex space-x-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide"
      >
        <div className="flex gap-4 pb-4" style={{ width: 'max-content' }}>
          {games.map(game => (
            <div key={game.id} className="w-48 flex-shrink-0 relative">
              <div
                onClick={() => onGameClick?.(game)}
                className="cursor-pointer"
              >
                <GameCard game={game} />
              </div>

              {showRecommendationFeedback && onRecommendationFeedback && (
                <div className="absolute top-2 left-2 flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRecommendationFeedback(game.id, true);
                    }}
                    className="p-1 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
                    title="Bonne recommandation"
                  >
                    <ThumbsUp className="h-3 w-3 text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRecommendationFeedback(game.id, false);
                    }}
                    className="p-1 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
                    title="Mauvaise recommandation"
                  >
                    <ThumbsDown className="h-3 w-3 text-white" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HorizontalGameSection;