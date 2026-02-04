import React from 'react';
import { Loader } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <Loader
      className={`text-orange-500 animate-spin ${sizeClasses[size]} ${className}`}
    />
  );
};

export default Spinner;
