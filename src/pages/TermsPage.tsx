import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import CGUView from '../components/views/CGUView';

const TermsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleViewChange = (view: string) => {
    if (view === 'home') navigate('/');
  };

  return (
    <>
      <Helmet>
        <title>Conditions Générales d'Utilisation - Factiony</title>
        <meta name="description" content="Consulte les conditions générales d'utilisation de Factiony." />
      </Helmet>
      <CGUView onViewChange={handleViewChange} />
    </>
  );
};

export default TermsPage;
