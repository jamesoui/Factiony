import React from 'react';
import { Helmet } from 'react-helmet-async';
import FeedView from '../components/views/FeedView';

const FeedPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Fil d'actualité - Factiony</title>
        <meta name="description" content="Découvre les activités de tes amis et les dernières critiques sur Factiony." />
      </Helmet>
      <FeedView />
    </>
  );
};

export default FeedPage;
