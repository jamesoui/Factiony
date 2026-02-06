import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import GameDetailModal from './GameDetailModal';
import { slugToGameId } from '../utils/slugify';
import { Helmet } from "react-helmet-async";

interface GameModalRouteProps {
  children: React.ReactNode;
}

export const GameModalRoute: React.FC<GameModalRouteProps> = ({ children }) => {
  const params = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedGame, setSelectedGame] = useState<any>(null);

  useEffect(() => {
    if (params.slug && location.pathname.startsWith('/game/')) {
      const gameId = slugToGameId(params.slug);
      if (gameId) {
        console.log('route-based modal active', params.slug);
        setSelectedGame({ id: gameId, title: 'Loading...', name: 'Loading...' });
      }
    } else {
      setSelectedGame(null);
    }
  }, [params.slug, location.pathname]);

  const handleClose = () => {
    setSelectedGame(null);
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <>
      {children}

      {/* 🔥 SEO TITLE DYNAMIQUE POUR LES PAGES JEU */}
      {selectedGame && (
        <Helmet>
          <title>
            {(selectedGame?.name || selectedGame?.title)} : Avis, Notes, Forum & Jeux Similaires | Factiony
          </title>
        </Helmet>
      )}

      {selectedGame && (
        <GameDetailModal
          isOpen={true}
          onClose={handleClose}
          game={selectedGame}
        />
      )}
    </>
  );
};
