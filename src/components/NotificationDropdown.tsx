import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings, List, X } from 'lucide-react';
import { getUserNotifications, markNotificationAsRead, UserNotification } from '../lib/api/notifications';
import { useLanguage } from '../contexts/LanguageContext';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onViewNotifications: () => void;
  onViewSettings: () => void;
}

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  onViewNotifications,
  onViewSettings
}) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const locale = t('language') === 'fr' ? fr : enUS;

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await getUserNotifications(10);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notification: UserNotification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id ? { ...n, read: true } : n
        )
      );
    }

    onClose();

    switch (notification.notification_type) {
      case 'new_follower':
        navigate(`/profile/${notification.actor_id}`);
        break;

      case 'activity_like':
      case 'activity_comment':
        if (notification.game_slug && notification.review_id) {
          navigate(`/game/${notification.game_slug}?review=${notification.review_id}`);
        }
        break;

      case 'comment_reply':
      case 'comment_like':
        if (notification.game_slug && notification.comment_id) {
          navigate(`/game/${notification.game_slug}?comment=${notification.comment_id}`);
        }
        break;

      default:
        console.warn('Unknown notification type', notification);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-2 z-50">
      <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-white">Notifications</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
          <X className="h-4 w-4" />
        </button>
      </div>
      
      <div className="max-h-64 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-gray-500">
            {t('common.loading')}
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            {t('notifications.noNotifications')}
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`px-4 py-3 hover:bg-gray-700 border-b border-gray-700 last:border-b-0 cursor-pointer ${!notif.read ? 'bg-red-900/20 border-l-4 border-l-red-500' : ''}`}
            >
              <div className="flex items-start space-x-3">
                {notif.actor?.avatar_url ? (
                  <img
                    src={notif.actor.avatar_url}
                    alt={notif.actor.username}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-400">
                      {notif.actor?.username[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-300">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale })}
                  </p>
                </div>
                {!notif.read && (
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1"></div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="border-t border-gray-700 px-2 py-2">
        <button
          onClick={onViewNotifications}
          className="w-full text-left px-2 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center space-x-2"
        >
          <List className="h-4 w-4" />
          <span>Voir toutes les notifications</span>
        </button>
        <button
          onClick={onViewSettings}
          className="w-full text-left px-2 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded flex items-center space-x-2"
        >
          <Settings className="h-4 w-4" />
          <span>Paramètres de notification</span>
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;