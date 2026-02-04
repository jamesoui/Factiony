import React, { useState } from 'react';
import { List, Plus, Heart, Clock, CheckCircle, Star } from 'lucide-react';
import { mockUserGames, mockGames } from '../../data/mockData';
import GameCard from '../GameCard';

const ListsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState('favorites');

  const getGameById = (id: string) => mockGames.find(game => game.id === id);
  
  const favoriteGames = mockUserGames
    .filter(userGame => userGame.rating && userGame.rating >= 4.5)
    .map(userGame => getGameById(userGame.gameId))
    .filter(Boolean);

  const wishlistGames = mockUserGames
    .filter(userGame => userGame.status === 'wishlist')
    .map(userGame => getGameById(userGame.gameId))
    .filter(Boolean);

  const completedGames = mockUserGames
    .filter(userGame => userGame.status === 'completed')
    .map(userGame => getGameById(userGame.gameId))
    .filter(Boolean);

  const currentlyPlayingGames = mockUserGames
    .filter(userGame => userGame.status === 'playing')
    .map(userGame => getGameById(userGame.gameId))
    .filter(Boolean);

  const tabs = [
    {
      id: 'favorites',
      label: 'Favoris',
      icon: Heart,
      count: favoriteGames.length,
      games: favoriteGames,
      color: 'text-red-600'
    },
    {
      id: 'wishlist',
      label: 'Wishlist',
      icon: Star,
      count: wishlistGames.length,
      games: wishlistGames,
      color: 'text-yellow-600'
    },
    {
      id: 'playing',
      label: 'En cours',
      icon: Clock,
      count: currentlyPlayingGames.length,
      games: currentlyPlayingGames,
      color: 'text-blue-600'
    },
    {
      id: 'completed',
      label: 'Terminés',
      icon: CheckCircle,
      count: completedGames.length,
      games: completedGames,
      color: 'text-green-600'
    }
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-teal-600 to-blue-600 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-4">
              <List className="h-8 w-8 mr-3" />
              <h1 className="text-3xl font-bold">Mes Listes</h1>
            </div>
            <p className="text-green-100 text-lg">
              Organisez vos jeux par collections personnalisées.
            </p>
          </div>
          <button className="bg-white/20 hover:bg-white/30 rounded-lg px-4 py-2 flex items-center space-x-2 transition-colors">
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Nouvelle liste</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 mb-8">
        <div className="border-b border-gray-700">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-400 bg-orange-900/20'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${activeTab === tab.id ? tab.color : 'text-gray-500'}`} />
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id 
                      ? 'bg-orange-900 text-orange-300' 
                      : 'bg-gray-700 text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTabData && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <activeTabData.icon className={`h-6 w-6 ${activeTabData.color}`} />
                  <h2 className="text-xl font-bold text-white">{activeTabData.label}</h2>
                  <span className="text-gray-500">({activeTabData.count})</span>
                </div>
              </div>

              {activeTabData.games.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {activeTabData.games.map(game => (
                    <GameCard key={game!.id} game={game!} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <activeTabData.icon className={`h-16 w-16 mx-auto mb-4 ${activeTabData.color} opacity-50`} />
                  <h3 className="text-lg font-medium text-white mb-2">
                    Aucun jeu dans cette liste
                  </h3>
                  <p className="text-gray-500">
                    Commencez à ajouter des jeux à votre collection !
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListsView;