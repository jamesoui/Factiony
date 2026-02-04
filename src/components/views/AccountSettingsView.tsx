import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Bell, Shield, Eye, EyeOff, Crown, Download, AlertTriangle, ExternalLink, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { getUserSettings, updatePrivacySettings, updateNotificationSettings, requestAccountDeletion, UserSettings } from '../../lib/api/userSettings';

interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Toggle: React.FC<ToggleProps> = ({ label, description, checked, onChange, disabled = false }) => {
  return (
    <div className="flex items-start justify-between py-4">
      <div className="flex-1">
        <h3 className="text-white font-medium mb-1">{label}</h3>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        } ${checked ? 'bg-orange-500' : 'bg-gray-600'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen) return null;

  const isValid = confirmText === 'SUPPRIMER';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-md my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-2xl border border-gray-700">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Supprimer mon compte</h3>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-gray-300">
                Cette action est irréversible. En supprimant votre compte :
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm">
                <li>Toutes vos données seront supprimées définitivement</li>
                <li>Vos critiques et commentaires seront supprimés</li>
                <li>Votre profil ne sera plus accessible</li>
                <li>Vous perdrez votre abonnement Premium (si actif)</li>
              </ul>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <p className="text-orange-400 text-sm">
                  Une demande de suppression sera enregistrée. Notre équipe procédera à la suppression sous 48h.
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Pour confirmer, tapez <span className="font-bold text-white">SUPPRIMER</span>
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={onConfirm}
                disabled={!isValid || isLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Traitement...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AccountSettingsView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const settings = await getUserSettings(user.id);
      if (settings) {
        setUserSettings(settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showToast('Erreur lors du chargement des paramètres', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyChange = async (field: 'show_activity' | 'show_game_journal', value: boolean) => {
    if (!user?.id || !userSettings) return;

    setSavingPrivacy(true);
    const success = await updatePrivacySettings(user.id, { [field]: value });

    if (success) {
      setUserSettings({ ...userSettings, [field]: value });
      showToast('Paramètres enregistrés', 'success');
    } else {
      showToast('Erreur lors de la sauvegarde', 'error');
    }
    setSavingPrivacy(false);
  };

  const handleNotificationChange = async (field: keyof UserSettings['notifications'], value: boolean) => {
    if (!user?.id || !userSettings) return;

    setSavingNotifications(true);
    const success = await updateNotificationSettings(user.id, { [field]: value });

    if (success) {
      setUserSettings({
        ...userSettings,
        notifications: {
          ...userSettings.notifications,
          [field]: value
        }
      });
      showToast('Paramètres enregistrés', 'success');
    } else {
      showToast('Erreur lors de la sauvegarde', 'error');
    }
    setSavingNotifications(false);
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      showToast('Email non trouvé', 'error');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      showToast('Email de réinitialisation envoyé !', 'success');
    } catch (error) {
      console.error('Error sending reset email:', error);
      showToast('Erreur lors de l\'envoi de l\'email', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      showToast('Erreur lors de la déconnexion', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    setIsDeleting(true);
    const success = await requestAccountDeletion(user.id);

    if (success) {
      showToast('Demande de suppression enregistrée', 'success');
      setShowDeleteModal(false);
      setTimeout(() => {
        handleSignOut();
      }, 2000);
    } else {
      showToast('Erreur lors de la demande de suppression', 'error');
    }
    setIsDeleting(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Paramètres du compte</h1>
        <p className="text-gray-400">Gérez vos préférences de sécurité, confidentialité et notifications</p>
      </div>

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.type === 'success' && <Check className="h-5 w-5 text-white" />}
          <span className="text-white font-medium">{toast.message}</span>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <User className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-white font-medium mb-1">Modifier votre profil</h3>
              <p className="text-gray-400 text-sm mb-3">
                Les informations publiques (pseudo, bio, avatar...) se modifient dans la page Modifier le profil.
              </p>
              <button
                onClick={() => navigate('/profile/edit')}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Aller à Modifier le profil</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-6">
            <Lock className="h-6 w-6 text-orange-500" />
            <h2 className="text-xl font-bold text-white">Sécurité</h2>
          </div>

          <div className="space-y-4">
            <div className="pb-4 border-b border-gray-700">
              <p className="text-gray-400 text-sm mb-1">Connecté en tant que</p>
              <p className="text-white font-medium">{user?.email}</p>
            </div>

            <button
              onClick={handlePasswordReset}
              className="flex items-center space-x-2 text-orange-400 hover:text-orange-300 transition-colors"
            >
              <Mail className="h-4 w-4" />
              <span>Envoyer un email de réinitialisation du mot de passe</span>
            </button>

            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 text-gray-400 hover:text-gray-300 transition-colors"
            >
              <Lock className="h-4 w-4" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="h-6 w-6 text-orange-500" />
            <h2 className="text-xl font-bold text-white">Confidentialité</h2>
          </div>

          {userSettings && (
            <div className="divide-y divide-gray-700">
              <Toggle
                label="Compte privé"
                description="Si activé, seuls vos abonnés peuvent voir votre profil et votre activité"
                checked={user?.is_private || false}
                onChange={async (value) => {
                  try {
                    const { error } = await supabase
                      .from('users')
                      .update({ is_private: value })
                      .eq('id', user?.id);

                    if (error) throw error;
                    showToast('Paramètres enregistrés', 'success');
                  } catch (error) {
                    console.error('Error updating privacy:', error);
                    showToast('Erreur lors de la sauvegarde', 'error');
                  }
                }}
                disabled={savingPrivacy}
              />
              <Toggle
                label="Afficher mon activité dans le fil"
                description="Vos amis et abonnés verront vos critiques et notes dans leur fil d'actualité"
                checked={userSettings.show_activity}
                onChange={(value) => handlePrivacyChange('show_activity', value)}
                disabled={savingPrivacy}
              />
              <Toggle
                label="Afficher mon journal de jeu publiquement"
                description="Votre liste de jeux et statistiques seront visibles sur votre profil public"
                checked={userSettings.show_game_journal}
                onChange={(value) => handlePrivacyChange('show_game_journal', value)}
                disabled={savingPrivacy}
              />
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-6">
            <Bell className="h-6 w-6 text-orange-500" />
            <h2 className="text-xl font-bold text-white">Notifications</h2>
          </div>

          {userSettings && (
            <div className="divide-y divide-gray-700">
              <Toggle
                label="Notifications in-app"
                description="Recevoir des notifications dans l'application"
                checked={userSettings.notifications.in_app}
                onChange={(value) => handleNotificationChange('in_app', value)}
                disabled={savingNotifications}
              />
              <Toggle
                label="Notifications par email"
                description="Recevoir des notifications importantes par email"
                checked={userSettings.notifications.email}
                onChange={(value) => handleNotificationChange('email', value)}
                disabled={savingNotifications}
              />
              <Toggle
                label="Nouveaux followers"
                description="Être notifié quand quelqu'un vous suit"
                checked={userSettings.notifications.new_followers}
                onChange={(value) => handleNotificationChange('new_followers', value)}
                disabled={savingNotifications}
              />
              <Toggle
                label="Réponses et commentaires"
                description="Être notifié des réponses à vos critiques et commentaires"
                checked={userSettings.notifications.replies}
                onChange={(value) => handleNotificationChange('replies', value)}
                disabled={savingNotifications}
              />
              <Toggle
                label="Likes"
                description="Être notifié quand quelqu'un aime vos critiques"
                checked={userSettings.notifications.likes}
                onChange={(value) => handleNotificationChange('likes', value)}
                disabled={savingNotifications}
              />
              <Toggle
                label="Mises à jour des jeux suivis"
                description="Recevoir des notifications sur les jeux que vous suivez"
                checked={userSettings.notifications.game_updates}
                onChange={(value) => handleNotificationChange('game_updates', value)}
                disabled={savingNotifications}
              />
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-6">
            <Crown className="h-6 w-6 text-yellow-500" />
            <h2 className="text-xl font-bold text-white">Premium</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-700">
              <div>
                <p className="text-gray-400 text-sm mb-1">Statut</p>
                <p className={`font-semibold ${user?.is_premium ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {user?.is_premium ? 'Premium Actif' : 'Inactif'}
                </p>
              </div>
              {user?.is_premium && <Crown className="h-8 w-8 text-yellow-500" />}
            </div>

            <button
              onClick={() => navigate('/premium')}
              className={`w-full px-4 py-3 rounded-lg transition-colors font-medium ${
                user?.is_premium
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white'
              }`}
            >
              {user?.is_premium ? 'Gérer mon abonnement' : 'Passer Premium'}
            </button>

            {!user?.is_premium && (
              <p className="text-gray-400 text-sm text-center">
                Débloquez des fonctionnalités exclusives avec Premium
              </p>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-6">
            <Download className="h-6 w-6 text-orange-500" />
            <h2 className="text-xl font-bold text-white">Compte & données</h2>
          </div>

          <div className="space-y-4">
            <button
              disabled
              className="flex items-center space-x-2 text-gray-500 cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              <span>Exporter mes données</span>
              <span className="text-xs bg-gray-700 px-2 py-1 rounded">Bientôt disponible</span>
            </button>

            <div className="pt-6 border-t border-red-900/20">
              <h3 className="text-red-400 font-semibold mb-2 flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Zone de danger</span>
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                La suppression de votre compte est définitive et irréversible. Toutes vos données seront perdues.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Supprimer mon compte
              </button>
            </div>
          </div>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default AccountSettingsView;
