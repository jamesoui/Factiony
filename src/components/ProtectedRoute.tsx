import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuthGuard } from '../contexts/AuthGuardContext';
import { useLanguage } from '../contexts/LanguageContext';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectMessage?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  redirectMessage
}) => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { setShowAuthModal } = useAuthGuard();
  const { language } = useLanguage();

  useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true);
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate, setShowAuthModal]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">
          {language === 'fr' ? 'Chargement...' : 'Loading...'}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
