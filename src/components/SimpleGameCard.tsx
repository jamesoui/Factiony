import type { Game } from "../apiClient";
import { calculateDisplayRating } from "../lib/utils/ratingCalculator";

interface SimpleGameCardProps {
  game: Game & { hybridScore?: number; factiony_rating?: number };
  onClick?: () => void;
  loading?: 'lazy' | 'eager';
  showRating?: boolean;
}

export function SimpleGameCard({ game, onClick, loading = 'lazy', showRating = true }: SimpleGameCardProps) {
  const isGameReleased = game.released
    ? new Date(game.released) <= new Date()
    : true;

  const factionyRating = (game as any).factiony_rating || game.rating;
  let metacriticScore: number | null = null;

  if (game.metacritic && typeof game.metacritic === 'string') {
    if (game.metacritic !== 'Inconnue' && game.metacritic !== 'Unknown') {
      const parsed = parseFloat(game.metacritic);
      if (!isNaN(parsed) && parsed > 0) {
        metacriticScore = parsed;
      }
    }
  } else if (typeof game.metacritic === 'number') {
    metacriticScore = game.metacritic;
  }

  const displayRating = calculateDisplayRating(factionyRating, metacriticScore);

  return (
    <div
      className="group rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 bg-white/5 cursor-pointer hover:scale-105 hover:z-10 relative"
      onClick={onClick}
    >
      <div className="relative w-full overflow-hidden" style={{ aspectRatio: "2 / 3" }}>
        {game.images?.cover_url ? (
          <img
            src={game.images.cover_url}
            alt={game.name}
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-110"
            loading={loading}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-300 text-gray-500 text-xs">
            No cover
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent p-2 flex flex-col justify-end z-10">
          <div className="font-semibold text-sm text-white truncate leading-tight">
            {game.name}
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
}
