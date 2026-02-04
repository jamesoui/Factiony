import React from 'react';
import { Star, Calendar, Monitor, Plus, Play, Check, Heart } from 'lucide-react';
import { Game } from '../types';

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

  return (
    <div
      className="relative rounded-xl overflow-hidden cursor-pointer group hover:scale-105 transition-transform duration-300"
      onClick={onClick}
    >
      <img
        src={game.coverImage}
        alt={game.title}
        className="w-full h-64 object-cover"
      />
      
      {/* Note moyenne en bas à droite */}
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 rounded-lg px-2 py-1">
        <div className="flex items-center space-x-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-white font-semibold text-sm">{game.rating}</span>
        </div>
      </div>
      
      {/* Statut utilisateur en haut à gauche */}
      {userStatus && (
        <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(userStatus)}`}>
          {getStatusIcon(userStatus)}
        </div>
      )}
    </div>
  );

  if (compact) {
    return (
      <div
        className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
        onClick={onClick}
      >
        <div className="flex p-4">
          <img
            src={game.coverImage}
            alt={game.title}
            className="w-16 h-20 object-cover rounded flex-shrink-0"
          />
          <div className="ml-4 flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{game.title}</h3>
            <p className="text-xs text-gray-400 mt-1">{game.developer}</p>
            {showRating && (
              <div className="flex items-center mt-2">
                <div className="flex space-x-1">
                  {renderStars(game.rating)}
                </div>
                <span className="ml-2 text-xs text-gray-500">{game.rating}</span>
              </div>
            )}
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
      </div>
    );
  }
  
  return (
    <div
      className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      <img
        src={game.coverImage}
        alt={game.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-2">{game.title}</h3>
        <p className="text-gray-400 text-sm mb-2">{game.developer}</p>
        
        {showRating && (
          <div className="flex items-center mb-3">
            <div className="flex space-x-1">
              {renderStars(game.rating)}
            </div>
            <span className="ml-2 text-sm text-gray-500">{game.rating}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{game.releaseDate}</span>
          </div>
          <div className="flex items-center">
            <Monitor className="h-4 w-4 mr-1" />
            <span>{game.platforms.join(', ')}</span>
          </div>
        </div>
        
        {userStatus && (
          <div className={`mt-3 px-2 py-1 rounded-full text-xs font-medium inline-flex items-center ${getStatusColor(userStatus)}`}>
            {getStatusIcon(userStatus)}
            <span className="ml-1 capitalize">{userStatus.replace('-', ' ')}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameCard;