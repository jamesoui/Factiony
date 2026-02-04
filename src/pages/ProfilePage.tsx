import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import ProfileView from '../components/views/ProfileView';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();

  const handleViewChange = (view: string) => {
    const viewToRouteMap: Record<string, string> = {
      'profile-edit': '/settings/profile',
      'account-settings': '/settings/account',
      'notification-settings': '/settings/notifications',
      'follows': '/settings/follows',
      'followers': '/settings/followers',
      'add-friends': '/search',
    };

    if (viewToRouteMap[view]) {
      navigate(viewToRouteMap[view]);
    }
  };

  return (
    <>
      <Helmet>
        <title>Mon Profil - Factiony</title>
        <meta name="description" content="Consulte et modifie ton profil Factiony." />
      </Helmet>
      <ProfileView onViewChange={handleViewChange} />
    </>
  );
};

export default ProfilePage;
