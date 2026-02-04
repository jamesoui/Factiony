import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import PrivacyPolicyView from '../components/views/PrivacyPolicyView';

const PrivacyPage: React.FC = () => {
  const navigate = useNavigate();

  const handleViewChange = (view: string) => {
    if (view === 'home') navigate('/');
  };

  return (
    <>
      <Helmet>
        <title>Politique de Confidentialité - Factiony</title>
        <meta name="description" content="Consulte la politique de confidentialité de Factiony." />
      </Helmet>
      <PrivacyPolicyView onViewChange={handleViewChange} />
    </>
  );
};

export default PrivacyPage;
