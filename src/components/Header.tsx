import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, Bell, LogOut, Settings, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthGuard } from '../contexts/AuthGuardContext';
import { useLanguage } from '../contexts/LanguageContext';
import NotificationDropdown from './NotificationDropdown';
import LanguageSelector from './LanguageSelector';
import UserLink from './UserLink';
import { getUnreadNotificationsCount } from '../lib/api/notifications';
import AvatarDisplay from './AvatarDisplay';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { setShowAuthModal } = useAuthGuard();
  const { t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const currentPath = location.pathname;

  useEffect(() => {
    if (user) {
      loadUnreadCount();
    }
  }, [user]);

  const loadUnreadCount = async () => {
    const count = await getUnreadNotificationsCount();
    setUnreadCount(count);
  };

  const handleNotificationToggle = () => {
    setShowUserMenu(false);
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setTimeout(loadUnreadCount, 1000);
    }
  };

  const handleUserMenuToggle = () => {
    setShowNotifications(false);
    setShowUserMenu(!showUserMenu);
  };

  const isActivePath = (path: string) => currentPath === path;

  return (
    <nav className="w-full flex items-center justify-between px-6 py-3 bg-[#0d1117] border-b border-gray-700 sticky top-0 z-50">
      {/* Zone gauche: Logo */}
      <div className="flex items-center">
        <Link to="/" className="flex items-center">
          <img
            src="/logo-factiony.png"
            alt="Factiony"
            className="h-24 md:h-28 w-auto object-contain"
            loading="eager"
          />
        </Link>
      </div>

      {/* Zone centrale: Navigation Desktop */}
      <div className="hidden md:flex items-center gap-8">
        <Link
          to="/feed"
          className={`transition-colors ${
            isActivePath('/feed')
              ? 'bg-orange-600 text-white py-2 px-4 rounded-lg'
              : 'text-gray-200 hover:text-white'
          }`}
        >
          {t('nav.feed')}
        </Link>

        <Link
          to="/search"
          className={`transition-colors ${
            isActivePath('/search')
              ? 'bg-orange-600 text-white py-2 px-4 rounded-lg'
              : 'text-gray-200 hover:text-white'
          }`}
        >
          {t('nav.search')}
        </Link>

        {user && (
          <>
            <Link
              to="/profile"
              className={`transition-colors ${
                isActivePath('/profile')
                  ? 'bg-orange-600 text-white py-2 px-4 rounded-lg'
                  : 'text-gray-200 hover:text-white'
              }`}
            >
              {t('nav.profile')}
            </Link>

            <Link
              to="/journal"
              className={`transition-colors ${
                isActivePath('/journal')
                  ? 'bg-orange-600 text-white py-2 px-4 rounded-lg'
                  : 'text-gray-200 hover:text-white'
              }`}
            >
              {t('nav.journal')}
            </Link>
          </>
        )}

        {user?.isPremium && (
          <Link
            to="/forum-premium"
            className={`transition-colors ${
              isActivePath('/forum-premium')
                ? 'bg-orange-600 text-white py-2 px-4 rounded-lg'
                : 'text-yellow-400 hover:text-yellow-300'
            }`}
          >
            Forum Premium
          </Link>
        )}
      </div>

      {/* Zone droite: Icônes + Avatar */}
      <div className="flex items-center gap-4">
        <LanguageSelector />

        {user ? (
          <>
            <div className="relative">
              <button
                onClick={handleNotificationToggle}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full transition-all relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></div>
                )}
              </button>

              <NotificationDropdown
                isOpen={showNotifications}
                onClose={() => {
                  setShowNotifications(false);
                  loadUnreadCount();
                }}
                onViewNotifications={() => {
                  navigate('/notifications');
                  setShowNotifications(false);
                  loadUnreadCount();
                }}
                onViewSettings={() => {
                  navigate('/settings/notifications');
                  setShowNotifications(false);
                }}
              />
            </div>

            <div className="relative">
              <button
                onClick={handleUserMenuToggle}
                className="flex items-center gap-1 p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
              >
                <AvatarDisplay
  avatarUrl={user?.avatar}
  username={user?.username || ''}
  size="small"
/>
                {user?.isPremium && <Crown className="h-4 w-4 text-yellow-500" />}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-700">
                    <UserLink
                      userId={user?.id || ''}
                      username={user?.username || ''}
                      className="text-sm font-medium text-white"
                    />
                    <p className="text-xs text-gray-400">{user?.email}</p>
                  </div>

                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span>{t('nav.settings')}</span>
                  </Link>

                  <Link
                    to="/premium"
                    onClick={() => setShowUserMenu(false)}
                    className="w-full text-left px-4 py-2 text-sm text-yellow-400 hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Crown className="h-4 w-4" />
                    <span>Devenir Premium</span>
                  </Link>

                  <div className="border-t border-gray-700 mt-1">
                    <button
                      onClick={async () => {
                        setShowUserMenu(false);
                        await logout();
                        navigate('/');
                        window.location.reload();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{t('nav.logout')}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium text-sm"
          >
            {t('auth.login') || 'Se connecter'}
          </button>
        )}
      </div>
    </nav>
  );
};

export default Header;
