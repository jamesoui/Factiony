import React from 'react';
import { Link } from 'react-router-dom';

interface UserLinkProps {
  userId: string;
  username: string;
  className?: string;
  children?: React.ReactNode;
}

const UserLink: React.FC<UserLinkProps> = ({
  userId,
  username,
  className = '',
  children
}) => {
  return (
    <Link
      to={`/u/${username}`}
      className={`hover:text-blue-400 transition-colors cursor-pointer ${className}`}
      title={`Voir le profil de ${username}`}
    >
      {children || username}
    </Link>
  );
};

export default UserLink;
