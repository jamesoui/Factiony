import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import NotificationsView from '../components/views/NotificationsView';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleViewChange = (view: string) => {
    if (view === 'notification-settings') {
      navigate('/settings/notifications');
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/u/${userId}`);
  };

  return (
    <>
      <Helmet>
        <title>Notifications - Factiony</title>
        <meta name="description" content="Consulte tes notifications sur Factiony." />
      </Helmet>
      <NotificationsView onViewChange={handleViewChange} onUserClick={handleUserClick} />
    </>
  );
};

export default NotificationsPage;
