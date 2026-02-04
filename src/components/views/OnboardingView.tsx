import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Star, Users, Check, Crown, Heart } from 'lucide-react';
import { mockGames } from '../../data/mockData';
import StarRating from '../StarRating';
import { useLanguage } from '../../contexts/LanguageContext';

interface OnboardingViewProps {
  onComplete?: () => void;
}

const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);
  const [gameRatings, setGameRatings] = useState<Record<string, number>>({});
  const [followedUsers, setFollowedUsers] = useState<string[]>([]);

  // Sélection des jeux les plus populaires pour la notation
  const popularGames = mockGames.slice(0, 12);

  const influencers = [
    {
      id: '1',
      username: 'GameMaster2024',
      avatar: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=150',
      followers: 125000,
      bio: 'Critique gaming professionnel • 15 ans d\'expérience',
      specialties: ['RPG', 'Action', 'Indie'],
      isPremium: true,
      verified: true
    },
    {
      id: '2',
      username: 'PixelHunter',
      avatar: 'https://images.pexels.com/photos/1337247/pexels-photo-1337247.jpeg?auto=compress&cs=tinysrgb&w=150',
      followers: 89000,
      bio: 'Streamer et expert en jeux indépendants',
      specialties: ['Indie', 'Platformer', 'Puzzle'],
      isPremium: true,
      verified: true
    },
    {
      id: '3',
      username: 'RPGLegend',
      avatar: 'https://images.pexels.com/photos/1298601/pexels-photo-1298601.jpeg?auto=compress&cs=tinysrgb&w=150',
      followers: 210000,
      bio: 'Spécialiste RPG • Créateur de contenu',
      specialties: ['RPG', 'JRPG', 'MMO'],
      isPremium: true,
      verified: true
    },
    {
      id: '4',
      username: 'CompetitiveGamer',
      avatar: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=150',
      followers: 156000,
      bio: 'Pro player • Analyses stratégiques',
      specialties: ['FPS', 'MOBA', 'Battle Royale'],
      isPremium: true,
      verified: false
    },
    {
      id: '5',
      username: 'RetroGaming',
      avatar: 'https://images.pexels.com/photos/1174746/pexels-photo-1174746.jpeg?auto=compress&cs=tinysrgb&w=150',
      followers: 67000,
      bio: 'Passionné de jeux rétro et classiques',
      specialties: ['Retro', 'Platformer', 'Arcade'],
      isPremium: false,
      verified: true
    },
    {
      id: '6',
      username: 'MobileGamePro',
      avatar: 'https://images.pexels.com/photos/1670977/pexels-photo-1670977.jpeg?auto=compress&cs=tinysrgb&w=150',
      followers: 43000,
      bio: 'Expert en gaming mobile et casual',
      specialties: ['Mobile', 'Casual', 'Puzzle'],
      isPremium: false,
      verified: false
    }
  ];

  const handleGameRating = (gameId: string, rating: number) => {
    setGameRatings(prev => ({
      ...prev,
      [gameId]: rating
    }));
  };

  const handleUserFollow = (userId: string) => {
    setFollowedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(u => u !== userId)
        : [...prev, userId]
    );
  };

  const nextStep = () => {
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      // Finaliser l'onboarding
      console.log('Onboarding completed:', {
        gameRatings,
        followedUsers
      });
      onComplete?.();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return Object.keys(gameRatings).length >= 3;
      case 2:
        return followedUsers.length >= 2;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Star className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Notez quelques jeux populaires
              </h2>
              <p className="text-gray-400">
                Aidez-nous à mieux comprendre vos goûts en notant au moins 3 jeux
              </p>
              <p className="text-sm text-orange-400 mt-2">
                {Object.keys(gameRatings).length}/3 {t('common.minimum')}
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
              {popularGames.map((game) => (
                <div key={game.id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors">
                  <div className="relative">
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      className="w-full h-32 object-cover"
                    />
                    {/* Note moyenne en overlay */}
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 rounded-lg px-2 py-1">
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-white font-semibold text-xs">{game.rating}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3">
                    <h3 className="font-semibold text-white text-sm mb-1 truncate">{game.title}</h3>
                    <p className="text-xs text-gray-400 mb-3">{game.developer}</p>
                    
                    <div className="space-y-2">
                      <p className="text-xs text-gray-300">Votre note :</p>
                      <StarRating
                        rating={gameRatings[game.id] || 0}
                        onRatingChange={(rating) => handleGameRating(game.id, rating)}
                        size="sm"
                      />
                      {gameRatings[game.id] && (
                        <p className="text-xs text-gray-400">
                          {gameRatings[game.id]}/5 étoiles
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Users className="h-16 w-16 text-purple-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Suivez des influenceurs gaming
              </h2>
              <p className="text-gray-400">
                Découvrez du contenu de qualité en suivant au moins 2 créateurs reconnus
              </p>
              <p className="text-sm text-orange-400 mt-2">
                {followedUsers.length}/2 {t('common.minimum')}
              </p>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {influencers.map((influencer) => (
                <div key={influencer.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <img
                          src={influencer.avatar}
                          alt={influencer.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        {influencer.isPremium && (
                          <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full p-1">
                            <Crown className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-white">{influencer.username}</h3>
                          {influencer.verified && (
                            <div className="bg-blue-500 rounded-full p-1">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                          {influencer.isPremium && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          {influencer.followers.toLocaleString()} abonnés
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{influencer.bio}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {influencer.specialties.map(specialty => (
                            <span key={specialty} className="px-2 py-1 bg-purple-900 text-purple-300 rounded text-xs">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleUserFollow(influencer.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
                        followedUsers.includes(influencer.id)
                          ? 'bg-gray-600 text-white'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {followedUsers.includes(influencer.id) ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Suivi</span>
                        </>
                      ) : (
                        <>
                          <Heart className="h-4 w-4" />
                          <span>Suivre</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        {/* Indicateur de progression */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            {[1, 2].map((step) => (
              <div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 2) * 100}%` }}
            />
          </div>
          <div className="text-center mt-2">
            <span className="text-sm text-gray-400">
              Étape {currentStep} sur 2
            </span>
          </div>
        </div>

        {/* Contenu de l'étape */}
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          {renderStep()}
          
          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                currentStep === 1
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Précédent</span>
            </button>
            
            <button
              onClick={nextStep}
              className="text-gray-400 hover:text-gray-300 px-4 py-2 rounded-lg transition-colors"
            >
              {t('common.skip')}
            </button>
            
            <button
              onClick={nextStep}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <span>{currentStep === 2 ? t('common.finish') : t('common.continue')}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingView;