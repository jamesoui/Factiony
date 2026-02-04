import React, { useState } from 'react';
import { Search, UserPlus, Users, Check } from 'lucide-react';
import { mockUsers } from '../../data/mockData';
import { useAuth } from '../../contexts/AuthContext';
import UserProfileView from './UserProfileView';

interface AddFriendsViewProps {
  onUserClick?: (userId: string) => void;
}

const AddFriendsView: React.FC<AddFriendsViewProps> = ({ onUserClick }) => {
  const { user: currentUser, updateUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  // Filtrer les utilisateurs (exclure l'utilisateur actuel)
  const suggestedFriends = mockUsers
    .filter(user => user.id !== currentUser?.id)
    .filter(user => 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.bio.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleFollow = (userId: string) => {
    if (!currentUser) return;
    
    const isCurrentlyFollowing = currentUser.following?.includes(userId) || false;
    const newFollowing = isCurrentlyFollowing 
      ? (currentUser.following || []).filter(id => id !== userId)
      : [...(currentUser.following || []), userId];
    
    updateUser({ following: newFollowing });
  };

  const handleUserClick = (userId: string) => {
    if (onUserClick) {
      onUserClick(userId);
    } else {
      setSelectedUserId(userId);
      setShowUserProfile(true);
    }
  };

  const isFollowing = (userId: string) => {
    return currentUser?.following?.includes(userId) || false;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Ajouter des amis</h1>
        <p className="text-gray-400">Découvrez et connectez-vous avec d'autres joueurs</p>
      </div>

      {/* Barre de recherche */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Rechercher des joueurs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Suggestions d'amis */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Suggestions d'amis
        </h2>
        
        <div className="grid gap-4">
          {suggestedFriends.map((friend) => (
            <div key={friend.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img
                    src={friend.avatar}
                    alt={friend.username}
                    className="w-12 h-12 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                    onClick={() => handleUserClick(friend.id)}
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 
                        className="font-semibold text-white cursor-pointer hover:text-blue-400 transition-colors"
                        onClick={() => handleUserClick(friend.id)}
                      >
                        {friend.username}
                      </h3>
                      {friend.isPremium && (
                        <span className="bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded-full text-xs font-bold">
                          PREMIUM
                        </span>
                      )}
                      {friend.isVerified && (
                        <div className="bg-blue-500 rounded-full p-1">
                          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      {friend.followers.length} abonnés • {friend.stats.gamesPlayed} jeux joués
                    </p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                      {friend.bio}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => handleFollow(friend.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isFollowing(friend.id)
                      ? 'bg-green-600 text-white cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isFollowing(friend.id) ? (
                    <div className="flex items-center">
                      <Check className="h-4 w-4 mr-1" />
                      Suivi
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <UserPlus className="h-4 w-4 mr-1" />
                      Suivre
                    </div>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {suggestedFriends.length === 0 && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">Aucun joueur trouvé</p>
          </div>
        )}
      </div>

      {/* Modal de profil utilisateur */}
      {selectedUserId && (
        <UserProfileView
          userId={selectedUserId}
          isOpen={showUserProfile}
          onClose={() => setShowUserProfile(false)}
        />
      )}
    </div>
  );
};

export default AddFriendsView;