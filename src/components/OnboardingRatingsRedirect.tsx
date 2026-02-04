import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const OnboardingRatingsRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!isAuthenticated || !user) {
        setIsChecking(false);
        return;
      }

      if (location.pathname === '/onboarding/ratings') {
        setIsChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('onboarding_ratings_done')
          .eq('id', user.id)
          .maybeSingle();

        if (!error && data && data.onboarding_ratings_done === false) {
          navigate('/onboarding/ratings', { replace: true });
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboardingStatus();
  }, [isAuthenticated, user, navigate, location.pathname]);

  if (isChecking) {
    return null;
  }

  return <>{children}</>;
};

export default OnboardingRatingsRedirect;
