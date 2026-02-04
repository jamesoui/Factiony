import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import FollowersListView from '../components/views/FollowersListView';

const FollowersPage: React.FC = () => {
  const navigate = useNavigate();

  const handleUserClick = (userId: string) => {
    navigate(`/u/${userId}`);
  };

  return (
    <>
      <Helmet>
        <title>Mes Abonnés - Factiony</title>
        <meta name="description" content="Consulte la liste de tes abonnés sur Factiony." />
      </Helmet>
      <FollowersListView onUserClick={handleUserClick} />
    </>
  );
};

export default FollowersPage;
