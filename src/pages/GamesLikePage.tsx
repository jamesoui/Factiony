import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Loader } from 'lucide-react';
import { slugToGameId } from '../utils/slugify';
import { getGame, GameData } from '../lib/api/games';
import { getSimilarGames } from '../lib/api/similarGames';
import { Game } from '../types';
import { SimpleGameCard } from '../components/SimpleGameCard';
import GameDetailModal from '../components/GameDetailModal';

const GamesLikePage: React.FC = () => {
  const { gameSlug } = useParams<{ gameSlug: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentGame, setCurrentGame] = useState<GameData | null>(null);
  const [similarGames, setSimilarGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showGameDetail, setShowGameDetail] = useState(false);

  useEffect(() => {
    if (gameSlug) {
      loadGameAndSimilar();
    }
  }, [gameSlug]);

  const loadGameAndSimilar = async () => {
    if (!gameSlug) return;

    setLoading(true);
    setError(null);

    try {
      const gameId = slugToGameId(gameSlug);

      if (!gameId) {
        throw new Error('ID de jeu invalide');
      }

      const game = await getGame(String(gameId));
      setCurrentGame(game);

      const genres = game.genres?.map(g => g.slug || g.name) || [];
      const tags = game.tags?.map(t => t.slug || t.name) || [];

      const { games } = await getSimilarGames(game.id, genres, tags, 12);
      setSimilarGames(games);
    } catch (err: any) {
      console.error('Erreur chargement:', err);
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleGameClick = (game: Game) => {
    setSelectedGame(game);
    setShowGameDetail(true);
  };

  const handleCloseModal = () => {
    setShowGameDetail(false);
    setSelectedGame(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Chargement des jeux similaires...</p>
        </div>
      </div>
    );
  }

  if (error || !currentGame) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Jeu introuvable</h1>
          <p className="text-gray-400 mb-6">{error || 'Le jeu demandé n\'existe pas'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const pageTitle = `Jeux similaires à ${currentGame.name} | Recommandations joueurs`;
  const pageDescription = `Découvrez les jeux similaires à ${currentGame.name} selon les notes et critiques des joueurs. Trouvez votre prochain jeu basé sur vos goûts.`;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        {currentGame.background_image && (
          <meta property="og:image" content={currentGame.background_image} />
        )}
        <link rel="canonical" href={`${window.location.origin}/games-like/${gameSlug}`} />
      </Helmet>

      <div className="min-h-screen bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Retour</span>
          </button>

          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Jeux similaires à <span className="text-blue-400">{currentGame.name}</span>
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed">
              Vous aimez <strong>{currentGame.name}</strong> ? Voici les jeux les plus proches en termes de gameplay,
              univers et expérience, sélectionnés selon les préférences des joueurs.
            </p>

            {currentGame.genres && currentGame.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {currentGame.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {similarGames.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {similarGames.map((game) => (
                <SimpleGameCard
                  key={game.id}
                  game={game}
                  onClick={() => handleGameClick(game)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">
                Aucun jeu similaire trouvé pour le moment.
              </p>
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-gray-800">
            <h2 className="text-xl font-semibold text-white mb-4">
              Pourquoi ces recommandations ?
            </h2>
            <div className="text-gray-300 space-y-3">
              <p>
                Notre algorithme analyse les genres, tags et caractéristiques de <strong>{currentGame.name}</strong>
                pour vous proposer des jeux avec une expérience similaire.
              </p>
              <p>
                Les recommandations sont basées sur :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Les genres et sous-genres du jeu</li>
                <li>Les mécaniques de gameplay</li>
                <li>L'univers et l'ambiance</li>
                <li>Les notes et avis des joueurs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showGameDetail && selectedGame && (
        <GameDetailModal
          game={selectedGame}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default GamesLikePage;
