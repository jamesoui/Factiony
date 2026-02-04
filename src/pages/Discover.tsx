import { useEffect, useState } from "react";
import { getTopRated, getMostAnticipated, type Game } from "../apiClient";
import { SimpleGameCard } from "../components/SimpleGameCard";
import { getTrendingGames, getTopRatedGamesHybrid } from "../lib/api/ratings";
import { fetchGamesByIds, searchPopularGames } from "../lib/api/games";
import FriendsActivitySection from "../components/FriendsActivitySection";

export default function Discover() {
  const [topRated, setTopRated] = useState<Game[] | null>(null);
  const [anticipated, setAnticipated] = useState<Game[] | null>(null);
  const [trending, setTrending] = useState<Game[] | null>(null);

  useEffect(() => {
    console.log('[DISCOVER] Loading top rated games via Edge Function...');

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    fetch(`${supabaseUrl}/functions/v1/get-discovery-catalog?limit=15`, {
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('[DISCOVER] Edge Function response:', data);
        console.log('[DISCOVER] DISCOVERY_TOP_RATED_COUNT:', data.topRated?.length || 0);

        if (data.ok && data.topRated && data.topRated.length > 0) {
          console.log('[DISCOVER] Stats:', data.stats);
          setTopRated(data.topRated as any);
        } else {
          console.warn('[DISCOVER] No games from Edge Function, using legacy fallback...');
          fetch(`${import.meta.env.VITE_API_URL ?? "https://europe-west1-factiony-1fc0f.cloudfunctions.net/apiFunction"}/games?ordering=-metacritic&metacritic=80,100&page_size=15`, {
            headers: { "x-factiony-key": import.meta.env.VITE_FACTIONY_KEY ?? "FACTIONY_KEY_35d39805f838ac70aa9dca01e4e3ff0764e638dd341728f4" },
          })
            .then((r) => r.json())
            .then((r) => {
              console.log('[DISCOVER] Legacy fallback returned:', r.results?.length || 0, 'games');
              const formattedGames = r.results?.map((game: any) => ({
                ...game,
                images: { cover_url: game.background_image }
              })) ?? [];
              setTopRated(formattedGames);
            })
            .catch((err) => {
              console.error('[DISCOVER] Legacy fallback error:', err);
              setTopRated([]);
            });
        }
      })
      .catch((error) => {
        console.error('[DISCOVER] Edge Function error:', error);
        console.log('[DISCOVER] Using legacy fallback due to Edge Function error...');
        fetch(`${import.meta.env.VITE_API_URL ?? "https://europe-west1-factiony-1fc0f.cloudfunctions.net/apiFunction"}/games?ordering=-metacritic&metacritic=80,100&page_size=15`, {
          headers: { "x-factiony-key": import.meta.env.VITE_FACTIONY_KEY ?? "FACTIONY_KEY_35d39805f838ac70aa9dca01e4e3ff0764e638dd341728f4" },
        })
          .then((r) => r.json())
          .then((r) => {
            console.log('[DISCOVER] Legacy fallback returned:', r.results?.length || 0, 'games');
            const formattedGames = r.results?.map((game: any) => ({
              ...game,
              images: { cover_url: game.background_image }
            })) ?? [];
            setTopRated(formattedGames);
          })
          .catch((err) => {
            console.error('[DISCOVER] Legacy fallback error:', err);
            setTopRated([]);
          });
      });

    getMostAnticipated(10)
      .then((res) => {
        if (res.results?.length) {
          setAnticipated(res.results);
        } else {
          const randomPage = Math.floor(Math.random() * 50);
          fetch(`${import.meta.env.VITE_API_URL ?? "https://europe-west1-factiony-1fc0f.cloudfunctions.net/apiFunction"}/games?page_size=10&page=${randomPage}`, {
            headers: { "x-factiony-key": import.meta.env.VITE_FACTIONY_KEY ?? "FACTIONY_KEY_35d39805f838ac70aa9dca01e4e3ff0764e638dd341728f4" },
          })
            .then((r) => r.json())
            .then((r) => setAnticipated(r.results ?? []))
            .catch(console.error);
        }
      })
      .catch(console.error);

    getTrendingGames(10)
      .then(async (stats) => {
        if (stats.length > 0) {
          const gameIds = stats.map(stat => stat.game_id);
          const games = await fetchGamesByIds(gameIds);
          const gamesAsApiFormat = games.map(g => ({
            id: g.id,
            name: g.name,
            rating: g.rating,
            metacritic: g.metacritic,
            factiony_rating: (g as any).factiony_rating || null,
            genres: g.genres?.map(genre => genre.name),
            images: { cover_url: g.background_image || g.cover_url || null },
            released: g.released
          }));
          setTrending(gamesAsApiFormat);
        } else {
          const popularGames = await searchPopularGames(10);
          const gamesAsApiFormat = popularGames.map(g => ({
            id: g.id,
            name: g.name,
            rating: g.rating,
            metacritic: g.metacritic,
            factiony_rating: (g as any).factiony_rating || null,
            genres: g.genres?.map(genre => genre.name),
            images: { cover_url: g.background_image || g.cover_url || null },
            released: g.released
          }));
          setTrending(gamesAsApiFormat);
        }
      })
      .catch(async (error) => {
        console.error("Erreur lors du chargement des jeux en tendance:", error);
        const popularGames = await searchPopularGames(10);
        const gamesAsApiFormat = popularGames.map(g => ({
          id: g.id,
          name: g.name,
          rating: g.rating,
          metacritic: g.metacritic,
          factiony_rating: (g as any).factiony_rating || null,
          genres: g.genres?.map(genre => genre.name),
          images: { cover_url: g.background_image || g.cover_url || null },
          released: g.released
        }));
        setTrending(gamesAsApiFormat);
      });
  }, []);

  console.log("[TOP_RATED] count", topRated?.length ?? 0);

  return (
    <div className="p-6 bg-gray-900 min-h-screen space-y-10">
      <section>
        <h1 className="text-xl font-bold mb-4 text-white">📈 Les jeux en tendance</h1>
        {trending === null ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-gray-700 h-48 animate-pulse"></div>
            ))}
          </div>
        ) : trending.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="mb-4">Aucun jeu en tendance pour le moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {trending.map((game) => (
              <SimpleGameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h1 className="text-xl font-bold mb-4 text-white">🎮 Les jeux les mieux notés</h1>
        <p className="text-sm text-gray-400 mb-4">Classement basé sur les notes de la communauté Factiony et Metacritic</p>
        {topRated === null ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-gray-700 h-48 animate-pulse"></div>
            ))}
          </div>
        ) : topRated.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <p className="text-lg text-gray-300 mb-2">Pas encore assez de données</p>
            <p className="text-sm text-gray-400 mb-6">Explore des jeux pour alimenter le catalogue</p>
            <a
              href="/search"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Rechercher des jeux
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {topRated.map((game) => (
              <SimpleGameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>

      <FriendsActivitySection />

      <section>
        <h1 className="text-xl font-bold mb-4 text-white">🔥 Les jeux les plus attendus</h1>
        {anticipated === null ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-gray-700 h-48 animate-pulse"></div>
            ))}
          </div>
        ) : anticipated.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="mb-4">Aucun jeu à venir pour le moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {anticipated.map((game) => (
              <SimpleGameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
