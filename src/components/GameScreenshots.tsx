import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface GameScreenshotsProps {
  screenshots: string[];
}

const GameScreenshots: React.FC<GameScreenshotsProps> = ({ screenshots }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  if (!screenshots || screenshots.length === 0) {
    return null;
  }

  const displayedScreenshots = screenshots.slice(0, 6);

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex !== null && selectedImageIndex < displayedScreenshots.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;

      if (e.key === 'ArrowLeft') {
        if (selectedImageIndex > 0) {
          setSelectedImageIndex(selectedImageIndex - 1);
        }
      } else if (e.key === 'ArrowRight') {
        if (selectedImageIndex < displayedScreenshots.length - 1) {
          setSelectedImageIndex(selectedImageIndex + 1);
        }
      } else if (e.key === 'Escape') {
        setSelectedImageIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, displayedScreenshots.length]);

  return (
    <>
      <div className="bg-gray-700/30 rounded-lg p-4">
        <h3 className="font-semibold text-white text-base mb-4 flex items-center gap-2">
          <span>📸</span> Screenshots
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {displayedScreenshots.map((screenshot, index) => (
            <div
              key={index}
              className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
              onClick={() => setSelectedImageIndex(index)}
            >
              <img
                src={screenshot}
                alt={`Screenshot ${index + 1}`}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">
          {displayedScreenshots.length} screenshot{displayedScreenshots.length > 1 ? 's' : ''} disponible{displayedScreenshots.length > 1 ? 's' : ''}
        </p>
      </div>

      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImageIndex(null)}
        >
          <button
            onClick={() => setSelectedImageIndex(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Navigation gauche */}
          {selectedImageIndex > 0 && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 hover:bg-black/70 rounded-full p-3"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
          )}

          {/* Navigation droite */}
          {selectedImageIndex < displayedScreenshots.length - 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 hover:bg-black/70 rounded-full p-3"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          )}

          {/* Image */}
          <div className="relative max-w-full max-h-full flex flex-col items-center">
            <img
              src={displayedScreenshots[selectedImageIndex]}
              alt={`Screenshot ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {/* Compteur */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
              {selectedImageIndex + 1} / {displayedScreenshots.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GameScreenshots;
