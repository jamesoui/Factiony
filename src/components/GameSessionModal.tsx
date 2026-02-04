import React, { useState } from 'react';
import { X, Calendar, Clock, Monitor, Camera, Save } from 'lucide-react';
import { Game, GameSession } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface GameSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game;
  onSave: (session: Omit<GameSession, 'id'>) => void;
}

const GameSessionModal: React.FC<GameSessionModalProps> = ({
  isOpen,
  onClose,
  game,
  onSave
}) => {
  const { t } = useLanguage();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('');
  const [platform, setPlatform] = useState(game.platforms[0] || '');
  const [notes, setNotes] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const session: Omit<GameSession, 'id'> = {
      gameId: game.id,
      date,
      duration: parseInt(duration) || 0,
      platform,
      notes: notes.trim() || undefined,
      screenshots: [],
      completionPercentage: completionPercentage ? parseInt(completionPercentage) : undefined
    };

    onSave(session);
    onClose();
    
    // Reset form
    setDate(new Date().toISOString().split('T')[0]);
    setDuration('');
    setPlatform(game.platforms[0] || '');
    setNotes('');
    setCompletionPercentage('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-2xl border border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">
              {t('session.newSession')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex items-center space-x-3 mb-6 p-3 bg-gray-700 rounded-lg">
            <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0">
              <img
                src={game.coverImage}
                alt={game.title}
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div>
              <h4 className="font-semibold text-white">{game.title}</h4>
              <p className="text-sm text-gray-400">{game.developer}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('session.date')}
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('session.duration')}
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="120"
                    min="1"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('session.platform')}
              </label>
              <div className="relative">
                <Monitor className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  {game.platforms.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('session.progress')}
              </label>
              <input
                type="number"
                value={completionPercentage}
                onChange={(e) => setCompletionPercentage(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="75"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('session.personalNotes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder={t('session.impressions')}
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                className="flex items-center space-x-2 text-orange-400 hover:text-orange-300 transition-colors"
              >
                <Camera className="h-4 w-4" />
                <span className="text-sm">{t('session.addScreenshots')}</span>
              </button>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  {t('review.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>{t('session.save')}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GameSessionModal;