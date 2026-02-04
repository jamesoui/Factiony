import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Users, Search, BookOpen, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const BottomNavigation: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const currentPath = location.pathname;

  const publicNavItems = [
    { key: 'feed', path: '/feed', label: t('nav.feed') || 'Fil', icon: Users },
    { key: 'search', path: '/search', label: t('nav.search') || 'Recherche', icon: Search }
  ];

  const privateNavItems = [
    { key: 'profile', path: '/profile', label: t('nav.profile') || 'Profil', icon: User },
    { key: 'journal', path: '/journal', label: t('nav.journal') || 'Journal', icon: BookOpen }
  ];

  const navItems = user
    ? [...publicNavItems, ...privateNavItems]
    : publicNavItems;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 px-2 py-1 z-50 sm:hidden">
      <div className="flex justify-around items-center">
        {navItems.map(({ key, path, label, icon: Icon }) => (
          <Link
            key={key}
            to={path}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              currentPath === path
                ? 'text-orange-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Icon className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BottomNavigation;
