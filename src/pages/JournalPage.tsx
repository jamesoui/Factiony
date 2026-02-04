import React from 'react';
import { Helmet } from 'react-helmet-async';
import JournalView from '../components/views/JournalView';

const JournalPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Mon Journal - Factiony</title>
        <meta name="description" content="Gère ta collection de jeux vidéo et suis tes parties en cours." />
      </Helmet>
      <JournalView />
    </>
  );
};

export default JournalPage;
