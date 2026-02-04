import { useEffect, useState } from "react";
import { getMostAnticipated, type Game } from "../../apiClient";
import { SimpleGameCard } from "../SimpleGameCard";

export default function MostAnticipated() {
  const [games, setGames] = useState<Game[] | null>(null);

  useEffect(() => {
    getMostAnticipated(15)
      .then((res) => {
        const unreleased = (res.results ?? []).filter((g) => {
          if (!g.released) return true;
          const releaseDate = new Date(g.released);
          const today = new Date();
          return g.tba === true || releaseDate.getTime() > today.getTime();
        });
        setGames(
          unreleased
            .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
            .slice(0, 10)
        );
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h1 className="text-xl font-bold mb-4 text-white">🔥 Most Anticipated</h1>
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
