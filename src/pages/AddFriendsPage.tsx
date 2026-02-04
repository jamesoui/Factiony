import React from 'react';
import { Helmet } from 'react-helmet-async';
import AddFriendsView from '../components/views/AddFriendsView';

const AddFriendsPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Ajouter des Amis - Factiony</title>
        <meta name="description" content="Trouve et ajoute des amis sur Factiony." />
      </Helmet>
      <AddFriendsView />
    </>
  );
};

export default AddFriendsPage;
