import { User } from '../../types';

const mockUserDefaults = {
  avatar:
    'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
  banner:
    'https://images.pexels.com/photos/1174746/pexels-photo-1174746.jpeg?auto=compress&cs=tinysrgb&w=1200',
  preferences: {
    language: 'fr',
    theme: 'dark',
    notifications: {
      email: true,
      push: true,
      friends: true,
      reviews: false,
      newFollowers: true,
      gameReleases: true,
      friendActivity: true,
      promotions: false
    },
    privacy: {
      profileVisibility: 'public',
      showRealName: false,
      showEmail: false,
      showPlaytime: true,
      showCurrentlyPlaying: true
    }
  }
};

// Nettoie les emails pollués du type "TON_E_email@domain.com"
const cleanEmail = (value?: string | null) => {
  if (!value) return '';
  const s = value.trim();

  // Si le champ contient un email et un préfixe genre "TON_E_", on garde la partie après le dernier "_"
  if (s.includes('@') && s.includes('_')) return s.split('_').pop()!;

  return s;
};

export async function loadUserData(userId: string): Promise<User | null> {
  try {
    const { db } = await import('../database');

    const profile = await db.sql.getUserById(userId);
    if (!profile) return null;

    const [followersData, followingData] = await Promise.all([
      db.sql.getUserFollowers(userId),
      db.sql.getUserFollowing(userId)
    ]);

    const emailClean = cleanEmail(profile.email);

    const user: User = {
      id: profile.id,
      email: emailClean,
      username: profile.username || (emailClean ? emailClean.split('@')[0] : ''),
      avatar: profile.avatar_url || mockUserDefaults.avatar,
      banner: profile.banner_url || mockUserDefaults.banner,
      bio: profile.bio || '',
      location: profile.location || '',
      website: profile.website || '',
      joinDate: profile.created_at,
      isPremium: profile.is_premium || false,
      isVerified: profile.is_verified || false,
      followers: followersData.map((f) => f.id),
      following: followingData.map((f) => f.id),
      stats: {
        gamesPlayed: 0,
        gamesCompleted: 0,
        totalPlaytime: 0,
        averageRating: 0,
        currentStreak: 0,
        longestStreak: 0,
        reviewsWritten: 0,
        achievementsUnlocked: 0,
        genreBreakdown: {},
        platformBreakdown: {},
        yearlyStats: {}
      },
      favoriteGames: [],
      preferences: mockUserDefaults.preferences
    };

    console.log(`✅ Données utilisateur chargées pour ${user.username}`);
    return user;
  } catch (error) {
    console.error('❌ Erreur chargement données utilisateur:', error);
    return null;
  }
}
