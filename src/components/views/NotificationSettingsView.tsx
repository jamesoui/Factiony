import React, { useState } from 'react';
import { Settings, Bell, Users, Heart, MessageCircle, Star } from 'lucide-react';

const NotificationSettingsView: React.FC = () => {
  const [settings, setSettings] = useState({
    newFollowers: true,
    gameReleases: true,
    friendActivity: true,
    promotions: false,
    likes: true,
    comments: true,
    mentions: true,
    newsletter: false
  });

  const handleToggle = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  };

  const notificationTypes = [
    {
      key: 'newFollowers',
      icon: Users,
      title: 'Nouveaux abonnés',
      description: 'Quand quelqu\'un vous suit'
    },
    {
      key: 'likes',
      icon: Heart,
      title: 'Likes sur vos critiques',
      description: 'Quand quelqu\'un aime vos critiques'
    },
    {
      key: 'comments',
      icon: MessageCircle,
      title: 'Commentaires',
      description: 'Quand quelqu\'un commente vos critiques'
    },
    {
      key: 'friendActivity',
      icon: Star,
      title: 'Activité des amis',
      description: 'Nouvelles critiques de vos abonnements'
    },
    {
      key: 'gameReleases',
      icon: Bell,
      title: 'Sorties de jeux',
      description: 'Nouveaux jeux et mises à jour'
    },
    {
      key: 'promotions',
      icon: Star,
      title: 'Promotions',
      description: 'Offres spéciales et réductions'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen">
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <Settings className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-white">Paramètres de Notification</h1>
        </div>
        
        <div className="space-y-6">
          {notificationTypes.map(({ key, icon: Icon, title, description }) => (
            <div key={key} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <Icon className="h-5 w-5 text-orange-500" />
                <div>
                  <h3 className="font-medium text-white">{title}</h3>
                  <p className="text-sm text-gray-400">{description}</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings[key as keyof typeof settings]}
                  onChange={() => handleToggle(key)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-gray-700 rounded-lg">
          <h3 className="font-medium text-white mb-2">Méthode de notification</h3>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input type="radio" name="method" className="text-orange-600" defaultChecked />
              <span className="text-gray-300">Notifications push</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="radio" name="method" className="text-orange-600" />
              <span className="text-gray-300">Email uniquement</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="radio" name="method" className="text-orange-600" />
              <span className="text-gray-300">Aucune notification</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsView;