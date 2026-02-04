import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthGuardProvider, useAuthGuard } from './contexts/AuthGuardContext';
import AuthModal from './components/AuthModal';
import Header from './components/Header';
import BottomNavigation from './components/BottomNavigation';
import AnalyticsTracker from './components/AnalyticsTracker';
import Footer from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { initCookieConsent } from './privacy/tarteaucitron';

import HomePage from './pages/HomePage';
import FeedPage from './pages/FeedPage';
import SearchPage from './pages/SearchPage';
import JournalPage from './pages/JournalPage';
import ProfilePage from './pages/ProfilePage';
import UserPage from './pages/UserPage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import PremiumPage from './pages/PremiumPage';
import FollowsPage from './pages/FollowsPage';
import FollowersPage from './pages/FollowersPage';
import ProfileEditPage from './pages/ProfileEditPage';
import NotificationSettingsPage from './pages/NotificationSettingsPage';
import AddFriendsPage from './pages/AddFriendsPage';
import PremiumForumPage from './pages/PremiumForumPage';
import OnboardingPage from './pages/OnboardingPage';
import OnboardingRatingsPage from './pages/OnboardingRatingsPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentCancelPage from './pages/PaymentCancelPage';
import PublicReview from './pages/PublicReview';
import ShareReview from './pages/ShareReview';
import TermsPage from './pages/TermsPage';
import TopCategoryPage from './pages/TopCategoryPage';
import GamesLikePage from './pages/GamesLikePage';
import { GameModalRoute } from './components/GameModalRoute';
import OnboardingRatingsRedirect from './components/OnboardingRatingsRedirect';
import PrivacyPage from './pages/PrivacyPage';
import CookiesPage from './pages/CookiesPage';
import AccessibilityPage from './pages/AccessibilityPage';
import AdsPage from './pages/AdsPage';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showAuthModal, setShowAuthModal } = useAuthGuard();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header />
      <main className="flex-1 pb-16 sm:pb-0">
        {children}
      </main>
      <Footer />
      <BottomNavigation />
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, showOnboarding } = useAuth();

  if (!isAuthenticated && showOnboarding) {
    return <OnboardingPage />;
  }

  return (
    <>
      <AnalyticsTracker />
      <OnboardingRatingsRedirect>
        <Routes>
        <Route path="/share/review/:id" element={<ShareReview />} />
        <Route path="/review/:id" element={<PublicReview />} />
        <Route path="/game/:slug" element={<MainLayout><GameModalRoute><HomePage /></GameModalRoute></MainLayout>} />

        <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
        <Route path="/top/:tagSlug" element={<MainLayout><TopCategoryPage /></MainLayout>} />
        <Route path="/games-like/:gameSlug" element={<MainLayout><GamesLikePage /></MainLayout>} />
        <Route path="/search" element={<MainLayout><SearchPage /></MainLayout>} />

        <Route path="/onboarding/ratings" element={
          <ProtectedRoute>
            <OnboardingRatingsPage />
          </ProtectedRoute>
        } />

        <Route path="/feed" element={
          <MainLayout>
            <ProtectedRoute>
              <FeedPage />
            </ProtectedRoute>
          </MainLayout>
        } />

        <Route path="/journal" element={
          <MainLayout>
            <ProtectedRoute>
              <JournalPage />
            </ProtectedRoute>
          </MainLayout>
        } />

        <Route path="/profile" element={
          <MainLayout>
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          </MainLayout>
        } />

        <Route path="/u/:username" element={<MainLayout><UserPage /></MainLayout>} />

        <Route path="/settings" element={
          <MainLayout>
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          </MainLayout>
        } />

        <Route path="/settings/profile" element={
          <MainLayout>
            <ProtectedRoute>
              <ProfileEditPage />
            </ProtectedRoute>
          </MainLayout>
        } />

        <Route path="/settings/account" element={
          <MainLayout>
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          </MainLayout>
        } />

        <Route path="/settings/notifications" element={
          <MainLayout>
            <ProtectedRoute>
              <NotificationSettingsPage />
            </ProtectedRoute>
          </MainLayout>
        } />

        <Route path="/settings/follows" element={
          <MainLayout>
            <ProtectedRoute>
              <FollowsPage />
            </ProtectedRoute>
          </MainLayout>
        } />

        <Route path="/settings/followers" element={
          <MainLayout>
            <ProtectedRoute>
              <FollowersPage />
            </ProtectedRoute>
          </MainLayout>
        } />

        <Route path="/notifications" element={
          <MainLayout>
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          </MainLayout>
        } />

        <Route path="/premium" element={
          <MainLayout>
            <ProtectedRoute>
              <PremiumPage />
            </ProtectedRoute>
          </MainLayout>
        } />

        <Route path="/add-friends" element={
          <MainLayout>
            <ProtectedRoute>
              <AddFriendsPage />
            </ProtectedRoute>
          </MainLayout>
        } />

        <Route path="/forum-premium" element={
          <MainLayout>
            <ProtectedRoute>
              <PremiumForumPage />
            </ProtectedRoute>
          </MainLayout>
        } />

        <Route path="/auth/callback" element={<MainLayout><AuthCallbackPage /></MainLayout>} />
        <Route path="/payment/success" element={<MainLayout><PaymentSuccessPage /></MainLayout>} />
        <Route path="/payment/cancel" element={<MainLayout><PaymentCancelPage /></MainLayout>} />

        <Route path="/terms" element={<MainLayout><TermsPage /></MainLayout>} />
        <Route path="/cgu" element={<MainLayout><TermsPage /></MainLayout>} />
        <Route path="/privacy" element={<MainLayout><PrivacyPage /></MainLayout>} />
        <Route path="/politique-de-confidentialite" element={<MainLayout><PrivacyPage /></MainLayout>} />
        <Route path="/cookies" element={<MainLayout><CookiesPage /></MainLayout>} />
        <Route path="/politique-cookies" element={<MainLayout><CookiesPage /></MainLayout>} />
        <Route path="/accessibility" element={<MainLayout><AccessibilityPage /></MainLayout>} />
        <Route path="/accessibilite" element={<MainLayout><AccessibilityPage /></MainLayout>} />
        <Route path="/ads" element={<MainLayout><AdsPage /></MainLayout>} />
        <Route path="/publicites" element={<MainLayout><AdsPage /></MainLayout>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </OnboardingRatingsRedirect>
    </>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    initCookieConsent();
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        {({ isAuthenticated }) => (
          <AuthGuardProvider isAuthenticated={isAuthenticated}>
            <AppContent />
          </AuthGuardProvider>
        )}
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
