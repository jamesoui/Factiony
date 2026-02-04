import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import CookiePolicyView from '../components/views/CookiePolicyView';

const CookiesPage: React.FC = () => {
  const navigate = useNavigate();

  const handleViewChange = (view: string) => {
    if (view === 'home') navigate('/');
  };

  return (
    <>
      <Helmet>
        <title>Politique des Cookies - Factiony</title>
        <meta name="description" content="Consulte la politique des cookies de Factiony." />
      </Helmet>
      <CookiePolicyView onViewChange={handleViewChange} />
    </>
  );
};

export default CookiesPage;
