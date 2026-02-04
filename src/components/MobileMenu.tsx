import React from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onViewChange: (view: string) => void;
}

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  currentView,
  onViewChange
}) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleViewChange = (view: string) => {
    onViewChange(view);
    onClose();
  };

  const publicNavItems = [
    { key: 'feed', label: t('nav.feed') },
    { key: 'search', label: t('nav.search') }
  ];

  const privateNavItems = [
    { key: 'profile', label: t('nav.profile') },
    { key: 'journal', label: t('nav.journal') }
  ];

  const navItems = user
    ? [...publicNavItems, ...privateNavItems]
    : publicNavItems;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 shadow-xl transform transition-transform">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Navigation</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-300 hover:text-white rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4">
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleViewChange(key)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors mb-2 ${
                currentView === key
                  ? 'bg-orange-900 text-orange-300'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default MobileMenu;