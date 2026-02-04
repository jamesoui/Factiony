import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPublicReview } from '../lib/api/reviews';
import Spinner from '../components/Spinner';

export default function PublicReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    const redirectToGamePage = async () => {
      // Fetch the review to get the game slug
      const review = await getPublicReview(id);

      if (!review || !review.game_slug) {
        // If review not found or no slug, redirect to home
        navigate('/');
        return;
      }

      // Redirect to the game page with the review parameter
      navigate(`/game/${review.game_slug}?review=${id}`, { replace: true });
    };

    redirectToGamePage();
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Spinner size="xl" />
        <p className="text-gray-400 mt-4">Redirecting...</p>
      </div>
    </div>
  );
}
