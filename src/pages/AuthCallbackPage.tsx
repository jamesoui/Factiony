import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import AuthCallback from '../components/views/AuthCallback';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate('/feed', { replace: true });
    window.location.reload();
  };

  return (
    <>
      <Helmet>
        <title>Authentification - Factiony</title>
      </Helmet>
      <div className="min-h-screen bg-gray-900">
        <AuthCallback onRedirect={handleRedirect} />
      </div>
    </>
  );
};

export default AuthCallbackPage;
