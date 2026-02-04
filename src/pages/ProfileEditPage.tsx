import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import ProfileEditView from '../components/views/ProfileEditView';

const ProfileEditPage: React.FC = () => {
  const navigate = useNavigate();

  const handleViewChange = (view: string) => {
    if (view === 'profile') navigate('/profile');
  };

  return (
    <>
      <Helmet>
        <title>Modifier mon Profil - Factiony</title>
        <meta name="description" content="Modifie les informations de ton profil Factiony." />
      </Helmet>
      <ProfileEditView onViewChange={handleViewChange} />
    </>
  );
};

export default ProfileEditPage;
