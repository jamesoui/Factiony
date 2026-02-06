import React, { useMemo, useState } from 'react';
import { Share2, Check, Copy, MessageCircle, Instagram, Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { trackEvent } from '../lib/analytics';

interface ShareReviewButtonProps {
  reviewId: string;
  gameId?: string | number;
  gameName?: string;
  username?: string;
  rating?: number;
  className?: string;
}

export const ShareReviewButton: React.FC<ShareReviewButtonProps> = ({
  reviewId,
  gameId,
  gameName,
  username,
  rating,
  className = ''
}) => {
  // Keep compatibility even if your LanguageContext only exposes { t }
  const langCtx: any = useLanguage();
  const t: (key: string) => string = langCtx.t;
  const language: string = typeof langCtx.language === 'string' ? langCtx.language : 'fr';

  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [instagramCopied, setInstagramCopied] = useState(false);

  // Never use placeholder names in share texts
  const safeGameName =
    gameName && gameName !== 'Loading...' && gameName !== 'Chargement...' ? gameName : undefined;

  // Data readiness (for nicer texts only — NOT for disabling)
  const hasRichData = !!safeGameName && rating != null;

  // Build share URL - use /share/review/ for OG meta tags
  const shareUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://factiony.com';
    return `${origin}/share/review/${reviewId}`;
  }, [reviewId]);

  // Build share texts only when sharing (not during render)
  const buildShareTitle = () => {
    if (username && safeGameName && rating != null) return `${username} • ${safeGameName} • ${rating}/5`;
    if (safeGameName) return `${safeGameName} — Critique sur Factiony`;
    return `Critique sur Factiony`;
  };

  const buildShareText = () => {
    const isFr = language === 'fr';

    if (safeGameName) {
      return isFr
        ? `Découvrez ma critique de ${safeGameName} !`
        : `Check out my review of ${safeGameName}!`;
    }

    return isFr
      ? `Découvrez cette critique sur Factiony !`
      : `Check out this review on Factiony!`;
  };

  const handleShare = async () => {
    if (!reviewId) return;

    // Build texts at click time
    const shareTitle = buildShareTitle();
    const shareText = buildShareText();

    // Detect mobile platform
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Try native share on mobile with HTTPS
    if (isMobile && navigator.share && window.location.protocol === 'https:') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });

        trackEvent('share_click', {
          network: 'native_share',
          game_id: gameId?.toString() || null,
          review_id: reviewId
        });

        return;
      } catch (err) {
        // If user cancels, don't show menu
        if ((err as Error).name === 'AbortError') return;
        // Otherwise fall back to custom menu
        console.log('Native share failed, using custom menu:', err);
      }
    }

    // Desktop / fallback: open menu (never blocked)
    setShowShareMenu((v) => !v);

    trackEvent('share_click', {
      network: 'open_menu',
      game_id: gameId?.toString() || null,
      review_id: reviewId
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);

      trackEvent('share_click', {
        network: 'copy_link',
        game_id: gameId?.toString() || null,
        review_id: reviewId
      });

      setTimeout(() => {
        setCopied(false);
        setShowShareMenu(false);
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const shareToWhatsApp = () => {
    const shareText = buildShareText();

    trackEvent('share_click', {
      network: 'whatsapp',
      game_id: gameId?.toString() || null,
      review_id: reviewId
    });

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setShowShareMenu(false);
  };

  const shareToX = () => {
    const shareText = buildShareText();

    trackEvent('share_click', {
      network: 'x',
      game_id: gameId?.toString() || null,
      review_id: reviewId
    });

    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(xUrl, '_blank', 'noopener,noreferrer');
    setShowShareMenu(false);
  };

  const shareToFacebook = () => {
    trackEvent('share_click', {
      network: 'facebook',
      game_id: gameId?.toString() || null,
      review_id: reviewId
    });

    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'noopener,noreferrer');
    setShowShareMenu(false);
  };

  const copyForInstagram = async () => {
    try {
      const shareTitle = buildShareTitle();
      const shareText = buildShareText();
      const instagramText = `${shareTitle}\n\n${shareText}\n\n${shareUrl}`;
      await navigator.clipboard.writeText(instagramText);
      setInstagramCopied(true);

      trackEvent('share_click', {
        network: 'instagram',
        game_id: gameId?.toString() || null,
        review_id: reviewId
      });

      setTimeout(() => {
        setInstagramCopied(false);
        setShowShareMenu(false);
      }, 2000);
    } catch (err) {
      console.error('Instagram copy failed:', err);
    }
  };

  const downloadOgImage = async () => {
    try {
      const ogImageUrl = `https://factiony.com/og/review/${reviewId}.png`;

      trackEvent('share_click', {
        network: 'download_image',
        game_id: gameId?.toString() || null,
        review_id: reviewId
      });

      const response = await fetch(ogImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factiony-review-${reviewId}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShowShareMenu(false);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleShare}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
          bg-blue-600 hover:bg-blue-700 text-white cursor-pointer`}
        title={hasRichData ? '' : 'Les détails se chargent — le lien de partage fonctionne quand même.'}
      >
        <Share2 className="w-4 h-4" />
        <span>{t('review.shareReview')}</span>
      </button>

      {showShareMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowShareMenu(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50 overflow-hidden">
            <button
              type="button"
              onClick={copyToClipboard}
              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 text-white transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">{t('review.copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>{t('review.copyLink')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={shareToWhatsApp}
              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 text-white transition-colors border-t border-gray-700"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={shareToX}
              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 text-white transition-colors border-t border-gray-700"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>X (Twitter)</span>
            </button>

            <button
              type="button"
              onClick={shareToFacebook}
              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 text-white transition-colors border-t border-gray-700"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Facebook</span>
            </button>

            <button
              type="button"
              onClick={copyForInstagram}
              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 text-white transition-colors border-t border-gray-700"
            >
              {instagramCopied ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-green-500">{t('review.copied')}</span>
                </>
              ) : (
                <>
                  <Instagram className="w-4 h-4" />
                  <span>Instagram</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={downloadOgImage}
              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 text-white transition-colors border-t border-gray-700"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger l'image</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareReviewButton;
