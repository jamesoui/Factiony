import React, { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { getTopGamesCached, TopGameWithCover, preloadTopCovers } from '../lib/api/topGamesCovers';
import { SimpleGameCard } from './SimpleGameCard';

interface TopGamesSectionProps {
  onGameClick: (slug: string) => void;
}

const TopGamesSection: React.FC<TopGamesSectionProps> = ({ onGameClick }) => {
  const [games, setGames] = useState<TopGameWithCover[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTopGames = async () => {
      const timeoutId = setTimeout(() => {
        if (loading) {
          console.warn('Loading top games covers timeout - showing with placeholders');
          setLoading(false);
        }
      }, 3000);

      try {
        const cachedGames = await getTopGamesCached(75);
        setGames(cachedGames);

        const slugsToPreload = cachedGames.slice(0, 8).map(g => g.slug);
        preloadTopCovers(slugsToPreload).catch(err => {
          console.warn('Error preloading covers:', err);
        });
      } catch (err) {
        console.error('Error loading top games covers:', err);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    loadTopGames();
  }, []);

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Flame className="h-6 w-6 text-orange-500" />
          <h2 className="text-2xl font-bold text-white">Les jeux les plus joués</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-gray-700 h-64 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center space-x-2 mb-4">
        <Flame className="h-6 w-6 text-orange-500" />
        <h2 className="text-2xl font-bold text-white">Les jeux les plus joués</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {games.map((game, index) => (
          <SimpleGameCard
            key={game.slug}
            game={{
              id: game.slug,
              name: game.name,
              slug: game.slug,
              rating: null,
              metacritic: null,
              released: null,
              images: {
                cover_url: game.coverUrl,
              },
              factiony_rating: null,
            }}
            onClick={() => onGameClick(game.slug)}
            loading={index < 8 ? 'eager' : 'lazy'}
          />
        ))}
      </div>
    </div>
  );
};

export default TopGamesSection;
