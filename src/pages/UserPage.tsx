import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import UserProfileView from '../components/views/UserProfileView';

const UserPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const handleClose = () => {
    // Revenir à la page précédente
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/'); // fallback si accès direct à /u/xxx
    }
  };

  return (
    <>
      <Helmet>
        <title>{username ? `@${username} - Factiony` : 'Profil - Factiony'}</title>
        <meta name="description" content={`Découvre le profil de ${username} sur Factiony.`} />
      </Helmet>

      <UserProfileView
        userId={username || ''}
        isOpen={true}
        onClose={handleClose}
      />
    </>
  );
};

export default UserPage;
