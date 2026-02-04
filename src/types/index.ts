export interface Game {
  id: string;
  title: string;
  coverImage?: string;
  coverUrl?: string;
  releaseDate: string;
  platforms: string[];
  genres: string[];
  rating: number;
  description: string;
  developer: string;
  publisher: string;
  screenshots?: string[];
  trailers?: string[];
  howLongToBeat?: {
    main: number;
    completionist: number;
    average: number;
  };
  metacritic?: number;
  metacriticScore?: number;
  tags?: string[];
  anticipationCount?: number;
  localPlayers?: string;
  playtime?: number;
  esrbRating?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  banner?: string;
  bio: string;
  location?: string;
  website?: string;
  joinDate: string;
  isPremium: boolean;
  isVerified?: boolean;
  followers: string[];
  following: string[];
  favoriteGames: string[];
  customLists?: CustomList[];
  stats: {
    gamesPlayed: number;
    gamesCompleted: number;
    totalPlaytime?: number;
    averageRating: number;
    currentStreak?: number;
    longestStreak?: number;
    reviewsWritten?: number;
    achievementsUnlocked?: number;
    genreBreakdown: Record<string, number>;
    platformBreakdown: Record<string, number>;
    yearlyStats: Record<string, number>;
  };
  preferences: {
    theme?: string;
    language: string;
    notifications: {
      newFollowers: boolean;
      gameReleases: boolean;
      friendActivity: boolean;
      promotions: boolean;
      email: boolean;
      push: boolean;
      friends: boolean;
      reviews: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'friends' | 'private';
      showPlaytime: boolean;
      showCurrentlyPlaying: boolean;
      showRealName: boolean;
      showEmail: boolean;
    };
  };
}

export interface UserGame {
  gameId: string;
  status: 'playing' | 'completed' | 'wishlist' | 'abandoned' | 'on-hold';
  rating?: number;
  review?: string;
  dateAdded: string;
  lastPlayed?: string;
  playtime?: number;
  completionPercentage?: number;
  sessions: GameSession[];
  personalTags?: string[];
  isSpoilerReview?: boolean;
}

export interface GameSession {
  id: string;
  gameId: string;
  date: string;
  duration: number; // in minutes
  platform: string;
  notes?: string;
  screenshots?: string[];
  completionPercentage?: number;
}

export interface CustomList {
  id: string;
  name: string;
  games: string[];
}

export interface AnticipationComment {
  id: string;
  gameId: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  isPositive: boolean; // true = veut jouer, false = ne veut pas jouer
  date: string;
  likes: number;
}

export interface GameAnticipation {
  gameId: string;
  userId: string;
  isAnticipating: boolean;
  comment?: AnticipationComment;
  date: string;
}
export interface ForumPost {
  id: string;
  gameId: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  type: 'comment' | 'question';
  date: string;
  likes: number;
  isLiked?: boolean;
  replies: ForumReply[];
}

export interface ForumReply {
  id: string;
  postId: string;
  userId: string;
  username: string;
  avatar: string;
  content: string;
  date: string;
  likes: number;
  isLiked?: boolean;
}
