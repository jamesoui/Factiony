import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import AccountSettingsView from '../components/views/AccountSettingsView';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Paramètres - Factiony</title>
        <meta name="description" content="Gère tes paramètres de compte Factiony." />
      </Helmet>
      <AccountSettingsView />
    </>
  );
};

export default SettingsPage;
