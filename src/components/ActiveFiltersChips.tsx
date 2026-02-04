import React from 'react';
import { X } from 'lucide-react';

interface Filters {
  year: string;
  platform: string;
  tag: string;
  multiplayer: boolean;
}

interface ActiveFiltersChipsProps {
  filters: Filters;
  onRemoveFilter: (filterKey: keyof Filters) => void;
  onClearAll: () => void;
}

const platformNames: Record<string, string> = {
  '4': 'PC',
  '187': 'PlayStation 5',
  '18': 'PlayStation 4',
  '1': 'Xbox One',
  '186': 'Xbox Series S/X',
  '7': 'Nintendo Switch'
};

const tagNames: Record<string, string> = {
  'action': 'Action',
  'action-adventure': 'Action-Adventure',
  'action-rpg': 'Action RPG',
  'adventure': 'Aventure',
  'atmospheric': 'Atmospheric',
  'battle': 'Battle',
  'battle-royale': 'Battle Royale',
  'co-op': 'Coopération',
  'combat': 'Combat',
  'cooperative': 'Cooperative',
  'cyberpunk': 'Cyberpunk',
  'exploration': 'Exploration',
  'fantasy': 'Fantasy',
  'first-person': 'First-Person',
  'fps': 'FPS',
  'free-to-play': 'Free to Play',
  'multiplayer': 'Multijoueur',
  'online': 'Online',
  'online-pvp': 'Online PvP',
  'open-world': 'Open World',
  'pvp': 'PvP',
  'role-playing': 'Role-Playing',
  'rpg': 'RPG',
  'sandbox': 'Sandbox',
  'sci-fi': 'Sci-fi',
  'singleplayer': 'Solo',
  'story': 'Story',
  'story-rich': 'Story Rich',
  'survival': 'Survival',
  'third-person': 'Third Person'
};

const ActiveFiltersChips: React.FC<ActiveFiltersChipsProps> = ({ filters, onRemoveFilter, onClearAll }) => {
  const activeFiltersCount =
    (filters.year ? 1 : 0) +
    (filters.platform ? 1 : 0) +
    (filters.tag ? 1 : 0) +
    (filters.multiplayer ? 1 : 0);

  if (activeFiltersCount === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4 mb-6 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Filtres actifs</h3>
        <button
          onClick={onClearAll}
          className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
        >
          Effacer tous les filtres
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.year && (
          <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm">
            <span>Année: {filters.year}</span>
            <button
              onClick={() => onRemoveFilter('year')}
              className="hover:bg-blue-700 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {filters.platform && (
          <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm">
            <span>Plateforme: {platformNames[filters.platform] || filters.platform}</span>
            <button
              onClick={() => onRemoveFilter('platform')}
              className="hover:bg-blue-700 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {filters.tag && (
          <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm">
            <span>Tag: {tagNames[filters.tag] || filters.tag}</span>
            <button
              onClick={() => onRemoveFilter('tag')}
              className="hover:bg-blue-700 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        {filters.multiplayer && (
          <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm">
            <span>Multijoueur uniquement</span>
            <button
              onClick={() => onRemoveFilter('multiplayer')}
              className="hover:bg-blue-700 rounded-full p-0.5 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveFiltersChips;
