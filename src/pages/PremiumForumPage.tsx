import React from 'react';
import { Helmet } from 'react-helmet-async';
import PremiumForumView from '../components/views/PremiumForumView';

const PremiumForumPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Forum Premium - Factiony</title>
        <meta name="description" content="Accède au forum exclusif des membres Premium de Factiony." />
      </Helmet>
      <PremiumForumView />
    </>
  );
};

export default PremiumForumPage;
