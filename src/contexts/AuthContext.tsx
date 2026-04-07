import { logger } from '../lib/logger';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { loadUserData } from '../lib/utils/userLoader';

interface AuthContextType {
  user: User | null;
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode | ((props: { isAuthenticated: boolean }) => ReactNode)
}

// Helper: force l’email à venir de Supabase Auth (fiable) plutôt que du profile DB (polluable)
const applyAuthEmail = (userData: User, authEmail?: string | null): User => {
  const email = (authEmail || '').trim();
  return email ? { ...userData, email } : userData;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (email: string, password: string) => {
    logger.log('🔐 Tentative de connexion:', email);
    try {
      const { db } = await import('../lib/database');
      const signInResult = await db.sql.signIn(email, password);

      if (signInResult.error) {
        console.error('❌ Erreur connexion:', signInResult.error);
        throw new Error(signInResult.error.message || 'Email ou mot de passe incorrect');
      }

      if (!signInResult.user) {
        throw new Error('Aucun utilisateur retourné');
      }

      logger.log('✅ Connexion réussie, chargement du profil...');
      const userData = await loadUserData(signInResult.user.id);

      if (userData) {
        logger.log('✅ Profil chargé:', userData.username);
        // ✅ email = celui tapé (source de vérité)
        setUser(applyAuthEmail(userData, email));
        setShowOnboarding(false);
      } else {
        throw new Error('Impossible de charger le profil utilisateur');
      }
    } catch (error) {
      console.error('❌ Erreur connexion:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, username: string) => {
    logger.log('🔐 Tentative inscription:', email, username);
    try {
      const { db } = await import('../lib/database');
      const signUpResult = await db.sql.signUp(email, password, username);

      if (signUpResult.error) {
        console.error('❌ Erreur inscription:', signUpResult.error);
        throw new Error(signUpResult.error.message || 'Erreur lors de l\'inscription');
      }

      if (!signUpResult.user) {
        throw new Error('Aucun utilisateur retourné');
      }

      logger.log('✅ Inscription réussie, attente du profil...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      const userData = await loadUserData(signUpResult.user.id);
      if (userData) {
        logger.log('✅ Profil créé:', userData.username);
        // ✅ email = celui tapé (source de vérité)
        setUser(applyAuthEmail(userData, email));
        setShowOnboarding(true);
      } else {
        console.error('❌ Profil non trouvé après inscription');
        throw new Error('Erreur lors de la création du profil');
      }
    } catch (error) {
      console.error('❌ Erreur inscription:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { db } = await import('../lib/database');
      await db.sql.signOut();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setUser(null);
      setShowOnboarding(false);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  useEffect(() => {
    let subscription: any = null;

    const initAuth = async () => {
      try {
        const { db } = await import('../lib/database');
        const { supabase } = await import('../lib/supabaseClient');

        // ✅ Récupère l’email auth directement (fiable)
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionEmail = sessionData?.session?.user?.email || null;

        const currentUser = await db.sql.getCurrentUser();

        if (currentUser) {
          const userData = await loadUserData(currentUser.id);
          if (userData) {
            setUser(applyAuthEmail(userData, sessionEmail));
          }
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            logger.log('🔐 Auth event:', event, session?.user?.email);

            if (event === 'SIGNED_IN' && session?.user) {
              const userData = await loadUserData(session.user.id);
              if (userData) {
                // ✅ email = Supabase Auth
                setUser(applyAuthEmail(userData, session.user.email));
              }
            } else if (event === 'SIGNED_OUT') {
              setUser(null);
              setShowOnboarding(false);
            }
          }
        );

        subscription = authListener.subscription;
      } catch (error) {
        console.error('Erreur initialisation auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const value: AuthContextType = {
    user,
    showOnboarding,
    setShowOnboarding,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {typeof children === 'function' ? children({ isAuthenticated: !!user }) : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
