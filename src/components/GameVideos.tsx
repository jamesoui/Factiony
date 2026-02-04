import React, { useState } from 'react';
import { Play, X } from 'lucide-react';

interface VideoItem {
  title: string;
  provider: 'youtube' | 'rawg_mp4';
  url: string;
  videoId?: string;
  thumbnail?: string | null;
}

interface GameVideosProps {
  trailers: VideoItem[];
  gameplay: VideoItem[];
}

const extractYouTubeId = (url: string): string | null => {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

interface VideoButtonProps {
  video: VideoItem;
  label: string;
  icon: React.ReactNode;
}

const VideoButton: React.FC<VideoButtonProps> = ({ video, label, icon }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  let thumbnailUrl = '';
  let videoId = '';
  let hasThumbnail = false;

  if (video.provider === 'youtube') {
    videoId = video.videoId || extractYouTubeId(video.url) || '';
    if (!videoId) return null;
    thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    hasThumbnail = true;
  } else {
    thumbnailUrl = video.thumbnail || '';
    hasThumbnail = !!video.thumbnail;
  }

  const handlePlay = () => {
    if (video.provider === 'youtube') {
      window.open(video.url, '_blank', 'noopener,noreferrer');
      return;
    }

    setIsPlaying(true);
  };

  return (
    <>
      <div
        className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group bg-gray-800"
        onClick={handlePlay}
      >
        {hasThumbnail ? (
          <img
            src={thumbnailUrl}
            alt={label}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
            <Play className="h-20 w-20 text-gray-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-colors flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-orange-600 group-hover:bg-orange-700 rounded-full flex items-center justify-center transition-colors">
              {icon}
            </div>
            <span className="text-white font-medium text-sm">{label}</span>
          </div>
        </div>
      </div>

      {isPlaying && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setIsPlaying(false)}
        >
          <button
            onClick={() => setIsPlaying(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <X className="h-8 w-8" />
          </button>
          <div
            className="relative w-full max-w-5xl aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={video.url}
              controls
              autoPlay
              preload="none"
              className="w-full h-full rounded-lg"
            >
              Votre navigateur ne supporte pas la lecture de vidéos.
            </video>
          </div>
        </div>
      )}
    </>
  );
};

const GameVideos: React.FC<GameVideosProps> = ({ trailers, gameplay }) => {
  const hasVideos = (trailers && trailers.length > 0) || (gameplay && gameplay.length > 0);

  if (!hasVideos) {
    return null;
  }

  return (
    <div className="bg-gray-700/30 rounded-lg p-4">
      <h3 className="font-semibold text-white text-base mb-4 flex items-center gap-2">
        <span>🎬</span> Vidéos
      </h3>

      {trailers && trailers.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Trailers</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trailers.map((trailer, index) => (
              <VideoButton
                key={index}
                video={trailer}
                label={trailer.title || `Trailer ${trailers.length > 1 ? index + 1 : ''}`}
                icon={<Play className="h-8 w-8 text-white" />}
              />
            ))}
          </div>
        </div>
      )}

      {gameplay && gameplay.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Gameplay</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gameplay.slice(0, 2).map((video, index) => (
              <VideoButton
                key={index}
                video={video}
                label={video.title || `Gameplay ${gameplay.length > 1 ? index + 1 : ''}`}
                icon={<Play className="h-8 w-8 text-white" />}
              />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        {(trailers?.length || 0) + Math.min(gameplay?.length || 0, 2)} vidéo{((trailers?.length || 0) + Math.min(gameplay?.length || 0, 2)) > 1 ? 's' : ''} disponible{((trailers?.length || 0) + Math.min(gameplay?.length || 0, 2)) > 1 ? 's' : ''}
      </p>
    </div>
  );
};

export default GameVideos;
