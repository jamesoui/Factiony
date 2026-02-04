import React from 'react';
import { Star, Calendar, Monitor, Plus, Play, Check, Heart } from 'lucide-react';
import { Game } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { calculateDisplayRating } from '../lib/utils/ratingCalculator';

interface GameCardProps {
  game: Game;
  onClick?: () => void;
  showRating?: boolean;
  compact?: boolean;
  userStatus?: 'playing' | 'completed' | 'wishlist' | 'abandoned' | 'on-hold' | null;
  onStatusChange?: (status: string) => void;
  onAddToWishlist?: () => void;
}

const GameCard: React.FC<GameCardProps> = ({ 
  game, 
  onClick, 
  showRating = true,
  compact = false,
  userStatus = null,
  onStatusChange,
  onAddToWishlist
}) => {
  const { t } = useLanguage();
  const isGameReleased = new Date(game.releaseDate) <= new Date();

  // game.rating contient la note moyenne Factiony, game.metacritic contient le score Metacritic
  const displayRating = calculateDisplayRating(
    game.rating, // Note Factiony moyenne
    game.metacritic || game.metacriticScore // Score Metacritic
  );

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'playing':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'completed':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'wishlist':
        return <Heart className="h-4 w-4 text-red-600" />;
      default:
        return <Plus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'playing':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'wishlist':
        return 'bg-red-100 text-red-700';
      case 'abandoned':
        return 'bg-gray-100 text-gray-700';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const coverImage = game.coverUrl || game.coverImage || '/placeholder.jpg';

  return (
    <div
      className="group rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 bg-white/5 cursor-pointer hover:scale-105 hover:z-10 relative"
      onClick={onClick}
    >
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "2 / 3" }}>
        <img
          src={coverImage}
          alt={game.title}
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-110"
          loading="lazy"
        />

        {/* Statut utilisateur en haut à gauche */}
        {userStatus && (
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(userStatus)} z-20`}>
            {getStatusIcon(userStatus)}
          </div>
        )}

        {/* Badge "À venir" en haut à droite */}
        {!isGameReleased && (
          <div className="absolute top-2 right-2 bg-blue-600 bg-opacity-90 rounded-lg px-2 py-1 z-20">
            <span className="text-white font-semibold text-xs">{t('game.coming')}</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent p-2 flex flex-col justify-end z-10">
          <div className="font-semibold text-sm text-white truncate leading-tight">
            {game.title}
          </div>
        </div>

        {/* Badge de note en position absolute en haut à droite */}
        {showRating && displayRating && isGameReleased && (
          <div className="absolute top-2 right-2 z-30 bg-gray-900/80 backdrop-blur-sm rounded-lg px-2 py-1">
            <div className="text-xs text-yellow-400 font-semibold whitespace-nowrap">
              ⭐ {displayRating.toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div
        className="group rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 bg-white/5 cursor-pointer flex items-center p-3 hover:scale-[1.02] hover:z-10 relative"
        onClick={onClick}
      >
        <div
          className="relative flex-shrink-0 rounded-lg overflow-hidden"
          style={{
            width: "60px",
            height: "90px",
          }}
        >
          <img
            src={coverImage}
            alt={game.title}
            className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-110"
            loading="lazy"
          />
        </div>
        <div className="ml-3 flex-1 min-w-0">
          <h3 className="text-sm font-medium text-white truncate">{game.title}</h3>
          {game.developer && (
            <p className="text-xs text-gray-400 mt-1">{game.developer}</p>
          )}
          {showRating && displayRating && isGameReleased ? (
            <div className="text-xs text-yellow-400 mt-1">
              ⭐ {displayRating.toFixed(2)}
            </div>
          ) : null}
        </div>

        {onStatusChange && (
          <div className="ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(userStatus === 'wishlist' ? 'playing' : 'wishlist');
              }}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              {getStatusIcon(userStatus)}
            </button>
          </div>
        )}
      </div>
    );
  }
};

export default GameCard;