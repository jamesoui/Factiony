import React from 'react';
import { Helmet } from 'react-helmet-async';
import NotificationSettingsView from '../components/views/NotificationSettingsView';

const NotificationSettingsPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Paramètres de Notifications - Factiony</title>
        <meta name="description" content="Gère tes préférences de notifications sur Factiony." />
      </Helmet>
      <NotificationSettingsView />
    </>
  );
};

export default NotificationSettingsPage;
