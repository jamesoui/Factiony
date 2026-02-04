import React from 'react';
import { Helmet } from 'react-helmet-async';
import PremiumView from '../components/views/PremiumView';

const PremiumPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Premium - Factiony</title>
        <meta name="description" content="Découvre les avantages de Factiony Premium." />
      </Helmet>
      <PremiumView />
    </>
  );
};

export default PremiumPage;
