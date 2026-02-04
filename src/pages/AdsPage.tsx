import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import AdsPolicyView from '../components/views/AdsPolicyView';

const AdsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleViewChange = (view: string) => {
    if (view === 'home') navigate('/');
  };

  return (
    <>
      <Helmet>
        <title>Politique Publicitaire - Factiony</title>
        <meta name="description" content="Consulte la politique publicitaire de Factiony." />
      </Helmet>
      <AdsPolicyView onViewChange={handleViewChange} />
    </>
  );
};

export default AdsPage;
