import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../lib/supabaseClient';

const ShareReview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReview = async () => {
      if (!id) {
        navigate('/');
        return;
      }

      try {
        const { data: reviewData } = await supabase
          .from('game_ratings')
          .select('id, user_id, game_id, rating, review_text')
          .eq('id', id)
          .maybeSingle();

        if (reviewData) {
          const { data: gameData } = await supabase
            .from('games')
            .select('name')
            .eq('id', reviewData.game_id)
            .maybeSingle();

          const { data: userData } = await supabase
            .from('users')
            .select('username')
            .eq('id', reviewData.user_id)
            .maybeSingle();

          setReview({
            ...reviewData,
            gameName: gameData?.name || 'Unknown Game',
            username: userData?.username || 'Anonymous',
          });
        }
      } catch (error) {
        console.error('Error loading review:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReview();

    const timeout = setTimeout(() => {
      navigate(`/review/${id}`);
    }, 500);

    return () => clearTimeout(timeout);
  }, [id, navigate]);

  const ogImageUrl = `${window.location.origin}/functions/v1/og-review-image?id=${id}`;
  const reviewUrl = `${window.location.origin}/review/${id}`;
  const excerpt = review?.review_text
    ? review.review_text.length > 120
      ? review.review_text.slice(0, 120) + '...'
      : review.review_text
    : 'Voir cette critique de jeu vidéo sur Factiony';

  return (
    <>
      <Helmet>
        <title>{review ? `Critique de ${review.gameName} par @${review.username} - Factiony` : 'Critique sur Factiony'}</title>

        <meta property="og:title" content={review ? `Critique de ${review.gameName} par @${review.username}` : 'Critique sur Factiony'} />
        <meta property="og:description" content={excerpt} />
        <meta property="og:image" content={ogImageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={reviewUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Factiony" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={review ? `Critique de ${review.gameName} par @${review.username}` : 'Critique sur Factiony'} />
        <meta name="twitter:description" content={excerpt} />
        <meta name="twitter:image" content={ogImageUrl} />

        <meta name="description" content={excerpt} />

        <link rel="canonical" href={reviewUrl} />
      </Helmet>

      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Redirection en cours...</p>
        </div>
      </div>
    </>
  );
};

export default ShareReview;
