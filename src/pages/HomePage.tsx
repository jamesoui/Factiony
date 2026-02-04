import React from 'react';
import { Helmet } from 'react-helmet-async';
import DiscoverView from '../components/views/DiscoverView';

const HomePage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Factiony - Découvre, note et partage tes jeux vidéo</title>
        <meta name="description" content="Factiony est la plateforme pour les passionnés de jeux vidéo. Découvre, note et partage tes expériences." />
      </Helmet>
      <DiscoverView />
    </>
  );
};

export default HomePage;
