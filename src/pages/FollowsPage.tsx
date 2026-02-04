import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import FollowsListView from '../components/views/FollowsListView';

const FollowsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleUserClick = (userId: string) => {
    navigate(`/u/${userId}`);
  };

  return (
    <>
      <Helmet>
        <title>Mes Abonnements - Factiony</title>
        <meta name="description" content="Consulte la liste de tes abonnements sur Factiony." />
      </Helmet>
      <FollowsListView onUserClick={handleUserClick} />
    </>
  );
};

export default FollowsPage;
