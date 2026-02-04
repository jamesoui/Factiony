import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, UserPlus, UserMinus, Flag, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthGuard } from '../contexts/AuthGuardContext';
import { supabase } from '../lib/supabaseClient';

interface ContentActionsMenuProps {
  authorUserId: string;
  authorUsername?: string;
  contentType: 'review' | 'forum_post' | 'forum_reply';
  contentId: string;
  contentUrl: string;
  contentExcerpt?: string;
}

type ReportReason = 'spam' | 'harassment' | 'hate' | 'illegal' | 'nsfw' | 'impersonation' | 'other';

const reportCooldowns = new Map<string, number>();

const ContentActionsMenu: React.FC<ContentActionsMenuProps> = ({
  authorUserId,
  authorUsername,
  contentType,
  contentId,
  contentUrl,
  contentExcerpt = '',
}) => {
  const { user } = useAuth();
  const { requireAuth } = useAuthGuard();
  const [isOpen, setIsOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoadingFollow, setIsLoadingFollow] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('spam');
  const [reportMessage, setReportMessage] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canFollowUser = user && user.id !== authorUserId;

  useEffect(() => {
    if (!user || !canFollowUser) return;

    const checkFollowStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('follows')
          .select('id')
          .eq('user_id', user.id)
          .eq('friend_id', authorUserId)
          .maybeSingle();

        if (error) throw error;
        setIsFollowing(!!data);
      } catch (err) {
        console.error('Error checking follow status:', err);
      }
    };

    checkFollowStatus();
  }, [user, authorUserId, canFollowUser]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleFollowToggle = async () => {
    if (!requireAuth()) return;
    if (!canFollowUser) return;

    setIsLoadingFollow(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('user_id', user!.id)
          .eq('friend_id', authorUserId);

        if (error) throw error;
        setIsFollowing(false);
        showToast('Vous ne suivez plus cet utilisateur', 'success');
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            user_id: user!.id,
            friend_id: authorUserId,
          });

        if (error) throw error;
        setIsFollowing(true);
        showToast(`Vous suivez maintenant @${authorUsername || 'cet utilisateur'}`, 'success');
      }
      setIsOpen(false);
    } catch (err: any) {
      console.error('Error toggling follow:', err);
      if (err.message?.includes('private account')) {
        showToast('Ce compte est privé', 'error');
      } else {
        showToast('Erreur lors de l\'opération', 'error');
      }
    } finally {
      setIsLoadingFollow(false);
    }
  };

  const handleReportClick = () => {
    if (!requireAuth()) return;

    const cooldownKey = `${user!.id}-${contentId}`;
    const lastReport = reportCooldowns.get(cooldownKey);

    if (lastReport && Date.now() - lastReport < 30000) {
      const remainingSeconds = Math.ceil((30000 - (Date.now() - lastReport)) / 1000);
      showToast(`Veuillez attendre ${remainingSeconds}s avant de signaler à nouveau`, 'error');
      return;
    }

    setIsOpen(false);
    setShowReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!user) return;

    if (reportMessage.length > 800) {
      showToast('Le message ne peut pas dépasser 800 caractères', 'error');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const excerpt = contentExcerpt.length > 280 ? contentExcerpt.substring(0, 280) + '...' : contentExcerpt;

      const { data, error } = await supabase.functions.invoke('report-content', {
        body: {
          contentType,
          contentId,
          reportedUserId: authorUserId,
          reason: reportReason,
          message: reportMessage || null,
          contentUrl,
          contentExcerpt: excerpt || null,
        },
      });

      if (error) throw error;

      const cooldownKey = `${user.id}-${contentId}`;
      reportCooldowns.set(cooldownKey, Date.now());

      showToast('Signalement envoyé avec succès', 'success');
      setShowReportModal(false);
      setReportReason('spam');
      setReportMessage('');
    } catch (err: any) {
      console.error('Error submitting report:', err);
      showToast(err.message || 'Erreur lors de l\'envoi du signalement', 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white transition-all transform ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  };

  const reasonLabels: Record<ReportReason, string> = {
    spam: 'Spam / Publicité',
    harassment: 'Harcèlement',
    hate: 'Contenu haineux',
    illegal: 'Contenu illégal',
    nsfw: 'Contenu inapproprié (NSFW)',
    impersonation: 'Usurpation d\'identité',
    other: 'Autre',
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
          aria-label="Actions"
        >
          <MoreVertical className="h-5 w-5 text-gray-400" />
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2 z-50">
            {canFollowUser && (
              <button
                onClick={handleFollowToggle}
                disabled={isLoadingFollow}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-colors flex items-center gap-3 disabled:opacity-50"
              >
                {isFollowing ? (
                  <>
                    <UserMinus className="h-4 w-4" />
                    <span>Ne plus suivre @{authorUsername || 'utilisateur'}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Suivre @{authorUsername || 'utilisateur'}</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={handleReportClick}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 transition-colors flex items-center gap-3"
            >
              <Flag className="h-4 w-4" />
              <span>Signaler</span>
            </button>
          </div>
        )}
      </div>

      {showReportModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-2xl border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Signaler ce contenu</h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Raison du signalement
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as ReportReason)}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                >
                  {Object.entries(reasonLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Détails (optionnel)
                </label>
                <textarea
                  value={reportMessage}
                  onChange={(e) => setReportMessage(e.target.value)}
                  maxLength={800}
                  rows={4}
                  placeholder="Décrivez le problème..."
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none resize-none"
                />
                <div className="text-xs text-gray-400 mt-1 text-right">
                  {reportMessage.length}/800
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowReportModal(false)}
                  disabled={isSubmittingReport}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmitReport}
                  disabled={isSubmittingReport}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {isSubmittingReport ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContentActionsMenu;
