import React, { useState } from 'react';
import { X, AlertTriangle, Tag, Save } from 'lucide-react';
import { Game } from '../types';
import StarRating from './StarRating';
import { useLanguage } from '../contexts/LanguageContext';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game;
  onSave: (review: {
    rating: number;
    content: string;
    spoilers: boolean;
    tags: string[];
    isQuickReview: boolean;
  }) => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  game,
  onSave
}) => {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [spoilers, setSpoilers] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isQuickReview, setIsQuickReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      alert('Veuillez donner une note');
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      await onSave({
        rating,
        content: content.trim(),
        spoilers,
        tags,
        isQuickReview
      });

      // Reset form only after successful save
      setRating(0);
      setContent('');
      setSpoilers(false);
      setTags([]);
      setNewTag('');
      setIsQuickReview(false);
      onClose();
    } catch (error) {
      console.error('Error saving review:', error);
      alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-2xl border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">
              {t('review.writeReview')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex items-center space-x-4 mb-6 p-4 bg-gray-700 rounded-lg">
            <div className="w-16 h-20 rounded overflow-hidden flex-shrink-0">
              <img
                src={game.coverImage}
                alt={game.title}
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div>
              <h4 className="font-bold text-white">{game.title}</h4>
              <p className="text-sm text-gray-400">{game.developer} • {new Date(game.releaseDate).getFullYear()}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {game.genres.slice(0, 3).map(genre => (
                  <span key={genre} className="px-2 py-1 bg-orange-900 text-orange-300 rounded text-xs">
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('review.rating')} *
              </label>
              <div className="flex items-center space-x-4">
                <StarRating
                  rating={rating}
                  onRatingChange={setRating}
                  size="lg"
                />
                <span className="text-lg font-semibold text-white">
                  {rating > 0 ? `${rating.toFixed(1)}/5` : t('review.notRated')}
                </span>
              </div>
            </div>

            {/* Quick Review Toggle */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="quickReview"
                checked={isQuickReview}
                onChange={(e) => setIsQuickReview(e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-600 bg-gray-700 rounded"
              />
              <label htmlFor="quickReview" className="text-sm text-gray-300">
                Note seulement (sans critique écrite)
              </label>
            </div>

            {/* Review Content */}
            {!isQuickReview && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('review.yourReview')}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={6}
                  placeholder={t('review.shareExperience')}
                />
              </div>
            )}

            {/* Spoilers */}
            {!isQuickReview && (
              <div className="flex items-center space-x-3 p-3 bg-yellow-900/20 rounded-lg border border-yellow-700">
                <input
                  type="checkbox"
                  id="spoilers"
                  checked={spoilers}
                  onChange={(e) => setSpoilers(e.target.checked)}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-600 bg-gray-700 rounded"
                />
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <label htmlFor="spoilers" className="text-sm text-gray-300">
                  {t('review.containsSpoilers')}
                </label>
              </div>
            )}


            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('review.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || rating === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4" />
                <span>{isSubmitting ? 'Enregistrement...' : t('review.publish')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;