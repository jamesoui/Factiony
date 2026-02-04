import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import UserProfileView from '../components/views/UserProfileView';

const UserPage: React.FC = () => {
  const { username } = useParams<{ username: string }>();

  return (
    <>
      <Helmet>
        <title>{username ? `@${username} - Factiony` : 'Profil - Factiony'}</title>
        <meta name="description" content={`Découvre le profil de ${username} sur Factiony.`} />
      </Helmet>
      <UserProfileView userId={username || ''} isOpen={true} onClose={() => {}} />
    </>
  );
};

export default UserPage;
