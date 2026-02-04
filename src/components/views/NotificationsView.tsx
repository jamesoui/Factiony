import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Heart, Users, MessageCircle, Star, Check, Loader } from 'lucide-react';
import UserLink from '../UserLink';
import { getUserNotifications, markNotificationAsRead, UserNotification } from '../../lib/api/notifications';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useLanguage } from '../../contexts/LanguageContext';

interface NotificationsViewProps {
  onUserClick?: (userId: string) => void;
  onViewChange?: (view: string) => void;
}

const NotificationsView: React.FC<NotificationsViewProps> = ({ onUserClick, onViewChange }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await getUserNotifications(50);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: UserNotification['notification_type']) => {
    switch (type) {
      case 'comment_like':
      case 'activity_like':
        return Heart;
      case 'comment_reply':
      case 'activity_comment':
        return MessageCircle;
      case 'new_follower':
        return Users;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: UserNotification['notification_type']) => {
    switch (type) {
      case 'comment_like':
      case 'activity_like':
        return 'text-red-500';
      case 'comment_reply':
      case 'activity_comment':
        return 'text-green-500';
      case 'new_follower':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const getFilterType = (notificationType: UserNotification['notification_type']) => {
    switch (notificationType) {
      case 'comment_like':
      case 'activity_like':
        return 'like';
      case 'comment_reply':
      case 'activity_comment':
        return 'comment';
      case 'new_follower':
        return 'follow';
      default:
        return 'all';
    }
  };

  const handleNotificationClick = async (notification: UserNotification) => {
    if (!notification.read) {
      await markNotificationAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
    }

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

  const formatNotificationTime = (createdAt: string) => {
    const locale = language === 'fr' ? fr : enUS;
    return formatDistanceToNow(new Date(createdAt), {
      addSuffix: true,
      locale
    });
  };

  const filteredNotifications = notifications.filter(notif =>
    filter === 'all' || getFilterType(notif.notification_type) === filter
  );

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen flex items-center justify-center">
        <Loader className="h-8 w-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen">
      <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
        <div className="flex items-center space-x-3 mb-6">
          <Bell className="h-6 w-6 text-orange-500" />
          <h1 className="text-2xl font-bold text-white">Mes Notifications</h1>
        </div>

        <div className="flex space-x-2 mb-6">
          {[
            { key: 'all', label: 'Toutes' },
            { key: 'like', label: 'Likes' },
            { key: 'follow', label: 'Abonnés' },
            { key: 'comment', label: 'Commentaires' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === key
                  ? 'bg-orange-900 text-orange-300'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-center">
            <Bell className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Aucune notification pour le moment</p>
          </div>
        ) : (
          filteredNotifications.map(notification => {
            const Icon = getNotificationIcon(notification.notification_type);
            const color = getNotificationColor(notification.notification_type);
            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`bg-gray-800 rounded-lg p-4 border border-gray-700 cursor-pointer hover:bg-gray-750 transition-colors ${
                  !notification.read ? 'border-l-4 border-l-orange-500' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Icon className={`h-5 w-5 ${color} mt-1 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300">
                      {notification.actor ? (
                        <>
                          <UserLink
                            userId={notification.actor_id}
                            username={notification.actor.username}
                            onUserClick={onUserClick}
                            className="font-medium"
                          />
                          {' '}{notification.message}
                        </>
                      ) : (
                        notification.message
                      )}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{formatNotificationTime(notification.created_at)}</p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsView;