import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import AccessibilityView from '../components/views/AccessibilityView';

const AccessibilityPage: React.FC = () => {
  const navigate = useNavigate();

  const handleViewChange = (view: string) => {
    if (view === 'home') navigate('/');
  };

  return (
    <>
      <Helmet>
        <title>Accessibilité - Factiony</title>
        <meta name="description" content="Consulte les informations d'accessibilité de Factiony." />
      </Helmet>
      <AccessibilityView onViewChange={handleViewChange} />
    </>
  );
};

export default AccessibilityPage;
