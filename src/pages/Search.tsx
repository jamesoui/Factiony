import { useState, useEffect } from "react";
import { searchGames, type Game } from "../apiClient";
import { SimpleGameCard } from "../components/SimpleGameCard";

export default function Search() {
  const [query, setQuery] = useState("");
  const [games, setGames] = useState<Game[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setGames(null);
      return;
    }
    const timeout = setTimeout(() => {
      setLoading(true);
      searchGames(query)
        .then((res) => setGames(res.results))
        .catch((err) => {
          console.error('Search error:', err);
          setGames([]);
        })
        .finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h1 className="text-xl font-bold mb-4 text-white">🔎 Search Games</h1>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Type a game name..."
        className="w-full p-2 mb-4 rounded-lg border border-gray-300 text-gray-900"
      />
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-gray-700 h-48 animate-pulse"></div>
          ))}
        </div>
      )}
      {!loading && games && games.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {games.map((game) => (
            <SimpleGameCard key={game.id} game={game} />
          ))}
        </div>
      )}
      {!loading && query && games && games.length === 0 && (
        <div className="text-gray-400 mt-8 text-center">No results found.</div>
      )}
    </div>
  );
}
