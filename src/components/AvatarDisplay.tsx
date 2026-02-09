import React from 'react';
import { User } from 'lucide-react';

interface AvatarDisplayProps {
  avatarUrl?: string | null;
  username: string;
  size?: 'small' | 'medium' | 'large' | 'xl';
  className?: string;
  showPremiumBadge?: boolean;
}

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({
  avatarUrl,
  username,
  size = 'medium',
  className = '',
  showPremiumBadge = false
}) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-10 h-10',
    large: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const iconSizes = {
    small: 'h-3 w-3',
    medium: 'h-5 w-5',
    large: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];

  if (avatarUrl) {
    return (
      <div className={`relative ${className}`}>
        <img
          src={avatarUrl}
          alt={username}
          className={`${sizeClass} rounded-full object-cover`}
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className={`${sizeClass} rounded-full bg-gray-700 flex items-center justify-center`}>
        <User className={`${iconSize} text-gray-400`} />
      </div>
    </div>
  );
};

export default AvatarDisplay;
