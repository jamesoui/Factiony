import { useEffect, useState } from "react";
import { getTopRated, type Game } from "../../apiClient";
import { SimpleGameCard } from "../SimpleGameCard";

export default function TopRated() {
  const [games, setGames] = useState<Game[] | null>(null);

  useEffect(() => {
    getTopRated(12)
      .then((res) => setGames(res.results))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h1 className="text-xl font-bold mb-4 text-white">🎮 Top Rated Games</h1>
      {!games ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-gray-700 h-48 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {games.map((game) => (
            <SimpleGameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
