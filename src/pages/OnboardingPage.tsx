import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OnboardingView from '../components/views/OnboardingView';

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setShowOnboarding } = useAuth();

  const handleComplete = () => {
    setShowOnboarding(false);
    navigate('/');
  };

  return (
    <>
      <Helmet>
        <title>Bienvenue sur Factiony</title>
        <meta name="description" content="Bienvenue sur Factiony, la plateforme pour les passionnés de jeux vidéo." />
      </Helmet>
      <OnboardingView onComplete={handleComplete} />
    </>
  );
};

export default OnboardingPage;
