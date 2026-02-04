import { Game, User, UserGame } from '../types';

export const mockGames: Game[] = [
  {
    id: '1',
    title: 'The Witcher 3: Wild Hunt',
    coverImage: 'https://images.pexels.com/photos/1174746/pexels-photo-1174746.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2015-05-19',
    platforms: ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'],
    genres: ['RPG', 'Open World', 'Fantasy'],
    rating: 4.8,
    description: 'Un RPG épique dans un monde ouvert fantastique où vous incarnez Geralt de Riv, un sorceleur à la recherche de sa fille adoptive.',
    developer: 'CD Projekt RED',
    publisher: 'CD Projekt',
    trailers: ['https://example.com/witcher3-trailer'],
    howLongToBeat: {
      main: 51,
      completionist: 173,
      average: 103
    },
    metacriticScore: 93,
    tags: ['Mature', 'Story Rich', 'Choices Matter'],
    anticipationCount: 0,
    localPlayers: '1 joueur'
  },
  {
    id: '2',
    title: 'Cyberpunk 2077',
    coverImage: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2020-12-10',
    platforms: ['PC', 'PlayStation', 'Xbox'],
    genres: ['RPG', 'Action', 'Cyberpunk'],
    rating: 3.8,
    description: 'Un RPG d\'action en monde ouvert se déroulant dans Night City, une mégalopole obsédée par le pouvoir, la glamour et les modifications corporelles.',
    developer: 'CD Projekt RED',
    publisher: 'CD Projekt',
    trailers: ['https://example.com/cyberpunk-trailer'],
    howLongToBeat: {
      main: 24,
      completionist: 103,
      average: 60
    },
    metacriticScore: 86,
    tags: ['Futuristic', 'Mature', 'Character Customization'],
    anticipationCount: 0,
    localPlayers: '1 joueur'
  },
  {
    id: '3',
    title: 'Hollow Knight',
    coverImage: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2017-02-24',
    platforms: ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'],
    genres: ['Metroidvania', 'Indie', 'Platformer'],
    rating: 4.6,
    description: 'Un jeu d\'action-aventure 2D qui vous emmène dans un royaume souterrain en ruine peuplé d\'insectes et de héros.',
    developer: 'Team Cherry',
    publisher: 'Team Cherry',
    trailers: ['https://example.com/hollow-knight-trailer'],
    howLongToBeat: {
      main: 27,
      completionist: 62,
      average: 43
    },
    metacriticScore: 90,
    tags: ['Atmospheric', 'Difficult', 'Great Soundtrack'],
    anticipationCount: 0,
    localPlayers: '1 joueur'
  },
  {
    id: '4',
    title: 'Elden Ring',
    coverImage: 'https://images.pexels.com/photos/3945313/pexels-photo-3945313.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2022-02-25',
    platforms: ['PC', 'PlayStation', 'Xbox'],
    genres: ['Action RPG', 'Souls-like', 'Open World'],
    rating: 4.7,
    description: 'Un action RPG en monde ouvert développé par FromSoftware et créé en collaboration avec George R.R. Martin.',
    developer: 'FromSoftware',
    publisher: 'Bandai Namco',
    trailers: ['https://example.com/elden-ring-trailer'],
    howLongToBeat: {
      main: 58,
      completionist: 132,
      average: 101
    },
    metacriticScore: 96,
    tags: ['Difficult', 'Dark Fantasy', 'Exploration'],
    anticipationCount: 0,
    localPlayers: '1 joueur'
  },
  {
    id: '5',
    title: 'God of War',
    coverImage: 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2018-04-20',
    platforms: ['PC', 'PlayStation'],
    genres: ['Action', 'Adventure', 'Mythology'],
    rating: 4.9,
    description: 'Kratos et son fils Atreus s\'aventurent dans les terres nordiques hostiles et explorent ses mythologies sombres.',
    developer: 'Santa Monica Studio',
    publisher: 'Sony Interactive Entertainment',
    trailers: ['https://example.com/god-of-war-trailer'],
    howLongToBeat: {
      main: 20,
      completionist: 51,
      average: 32
    },
    metacriticScore: 94,
    tags: ['Story Rich', 'Emotional', 'Norse Mythology'],
    anticipationCount: 0,
    localPlayers: '1 joueur'
  },
  {
    id: '6',
    title: 'Red Dead Redemption 2',
    coverImage: 'https://images.pexels.com/photos/1670977/pexels-photo-1670977.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2018-10-26',
    platforms: ['PC', 'PlayStation', 'Xbox'],
    genres: ['Action', 'Adventure', 'Western'],
    rating: 4.5,
    description: 'L\'histoire d\'Arthur Morgan et de la bande de Van der Linde, des hors-la-loi en fuite dans l\'Amérique de 1899.',
    developer: 'Rockstar Games',
    publisher: 'Rockstar Games',
    trailers: ['https://example.com/rdr2-trailer'],
    howLongToBeat: {
      main: 50,
      completionist: 174,
      average: 79
    },
    metacriticScore: 97,
    tags: ['Open World', 'Western', 'Realistic'],
    anticipationCount: 0,
    localPlayers: '1 joueur'
  },
  {
    id: '7',
    title: 'Hades',
    coverImage: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2020-09-17',
    platforms: ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'],
    genres: ['Roguelike', 'Action', 'Indie'],
    rating: 4.4,
    description: 'Un roguelike d\'action où vous incarnez Zagreus, fils d\'Hadès, tentant de s\'échapper des Enfers.',
    developer: 'Supergiant Games',
    publisher: 'Supergiant Games',
    trailers: ['https://example.com/hades-trailer'],
    howLongToBeat: {
      main: 22,
      completionist: 95,
      average: 43
    },
    metacriticScore: 93,
    tags: ['Roguelike', 'Greek Mythology', 'Replayable'],
    anticipationCount: 0,
    localPlayers: '1 joueur'
  },
  {
    id: '8',
    title: 'The Last of Us Part II',
    coverImage: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2020-06-19',
    platforms: ['PlayStation'],
    genres: ['Action', 'Adventure', 'Survival'],
    rating: 4.2,
    description: 'Cinq ans après leur périlleux voyage, Ellie et Joel se sont installés à Jackson, Wyoming.',
    developer: 'Naughty Dog',
    publisher: 'Sony Interactive Entertainment',
    trailers: ['https://example.com/tlou2-trailer'],
    howLongToBeat: {
      main: 24,
      completionist: 29,
      average: 25
    },
    metacriticScore: 93,
    tags: ['Post-Apocalyptic', 'Emotional', 'Mature'],
    anticipationCount: 0,
    localPlayers: '1 joueur'
  },
  // Jeux mobiles
  {
    id: '12',
    title: 'Genshin Impact',
    coverImage: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2020-09-28',
    platforms: ['Mobile', 'PC', 'PlayStation'],
    genres: ['RPG', 'Action', 'Gacha', 'Mobile'],
    rating: 4.3,
    description: 'Un RPG d\'action en monde ouvert avec un système de gacha, explorez le monde de Teyvat et collectionnez des personnages.',
    developer: 'miHoYo',
    publisher: 'miHoYo',
    trailers: [],
    howLongToBeat: {
      main: 60,
      completionist: 200,
      average: 120
    },
    metacriticScore: 81,
    tags: ['Free-to-Play', 'Gacha', 'Anime Style'],
    anticipationCount: 0,
    localPlayers: '1 joueur'
  },
  {
    id: '13',
    title: 'Among Us',
    coverImage: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2018-06-15',
    platforms: ['Mobile', 'PC', 'Nintendo Switch'],
    genres: ['Party', 'Social Deduction', 'Mobile'],
    rating: 4.1,
    description: 'Un jeu de déduction sociale où les joueurs doivent identifier les imposteurs parmi l\'équipage.',
    developer: 'InnerSloth',
    publisher: 'InnerSloth',
    trailers: [],
    howLongToBeat: {
      main: 5,
      completionist: 20,
      average: 10
    },
    metacriticScore: 85,
    tags: ['Multiplayer', 'Social', 'Casual'],
    anticipationCount: 0,
    localPlayers: '4-10 joueurs'
  },
  {
    id: '14',
    title: 'Clash Royale',
    coverImage: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2016-03-02',
    platforms: ['Mobile'],
    genres: ['Strategy', 'Card Game', 'Mobile'],
    rating: 4.0,
    description: 'Un jeu de stratégie en temps réel combinant cartes à collectionner et défense de tour.',
    developer: 'Supercell',
    publisher: 'Supercell',
    trailers: [],
    howLongToBeat: {
      main: 10,
      completionist: 100,
      average: 50
    },
    metacriticScore: 83,
    tags: ['Free-to-Play', 'Competitive', 'Card Game'],
    anticipationCount: 0,
    localPlayers: '1 joueur'
  },
  {
    id: '15',
    title: 'PUBG Mobile',
    coverImage: 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2018-03-19',
    platforms: ['Mobile'],
    genres: ['Battle Royale', 'Shooter', 'Mobile'],
    rating: 4.2,
    description: 'La version mobile du célèbre battle royale, optimisée pour les appareils mobiles.',
    developer: 'Tencent Games',
    publisher: 'Tencent Games',
    trailers: [],
    howLongToBeat: {
      main: 15,
      completionist: 80,
      average: 40
    },
    metacriticScore: 79,
    tags: ['Battle Royale', 'Multiplayer', 'Free-to-Play'],
    anticipationCount: 0,
    localPlayers: '1 joueur'
  },
  {
    id: '16',
    title: 'Monument Valley',
    coverImage: 'https://images.pexels.com/photos/1174746/pexels-photo-1174746.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2014-04-03',
    platforms: ['Mobile'],
    genres: ['Puzzle', 'Indie', 'Mobile'],
    rating: 4.6,
    description: 'Un jeu de puzzle artistique avec des illusions d\'optique et une architecture impossible.',
    developer: 'ustwo games',
    publisher: 'ustwo games',
    trailers: [],
    howLongToBeat: {
      main: 2,
      completionist: 3,
      average: 2
    },
    metacriticScore: 89,
    tags: ['Artistic', 'Relaxing', 'Premium'],
    anticipationCount: 0,
    localPlayers: '1 joueur'
  },
  // Ajout de quelques jeux à venir pour tester
  {
    id: '9',
    title: 'The Elder Scrolls VI',
    coverImage: 'https://images.pexels.com/photos/3945313/pexels-photo-3945313.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2026-11-11',
    platforms: ['PC', 'PlayStation', 'Xbox'],
    genres: ['RPG', 'Open World', 'Fantasy'],
    rating: 0,
    description: 'Le prochain chapitre de la saga Elder Scrolls tant attendu.',
    developer: 'Bethesda Game Studios',
    publisher: 'Bethesda Softworks',
    trailers: [],
    tags: ['Fantasy', 'Open World', 'RPG'],
    anticipationCount: 15420
  },
  {
    id: '10',
    title: 'Grand Theft Auto VI',
    coverImage: 'https://images.pexels.com/photos/1670977/pexels-photo-1670977.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2025-12-01',
    platforms: ['PC', 'PlayStation', 'Xbox'],
    genres: ['Action', 'Open World', 'Crime'],
    rating: 0,
    description: 'Le prochain opus de la série Grand Theft Auto.',
    developer: 'Rockstar Games',
    publisher: 'Rockstar Games',
    trailers: [],
    tags: ['Crime', 'Open World', 'Action'],
    anticipationCount: 23750
  },
  {
    id: '11',
    title: 'Hollow Knight: Silksong',
    coverImage: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2025-06-15',
    platforms: ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch'],
    genres: ['Metroidvania', 'Indie', 'Platformer'],
    rating: 0,
    description: 'La suite tant attendue de Hollow Knight.',
    developer: 'Team Cherry',
    publisher: 'Team Cherry',
    trailers: [],
    tags: ['Metroidvania', 'Indie', 'Atmospheric'],
    anticipationCount: 8930
  }
];

export const mockUsers: User[] = [
  {
    id: '1',
    username: 'GamerPro2024',
    email: 'gamer@example.com',
    avatar: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
    banner: 'https://images.pexels.com/photos/1174746/pexels-photo-1174746.jpeg?auto=compress&cs=tinysrgb&w=1200',
    bio: 'Passionné de jeux vidéo depuis toujours. J\'adore explorer de nouveaux mondes virtuels et partager mes découvertes avec la communauté gaming.',
    location: 'Paris, France',
    website: 'https://gamerpro.blog',
    joinDate: '2023-01-15',
    isPremium: true,
    isVerified: true,
    favoriteGames: ['1', '3', '5', '8'],
    stats: {
      gamesPlayed: 156,
      gamesCompleted: 89,
      totalPlaytime: 2847,
      averageRating: 4.2,
      currentStreak: 7,
      longestStreak: 23,
      reviewsWritten: 45,
      achievementsUnlocked: 1203,
      genreBreakdown: {
        'RPG': 45,
        'Action': 38,
        'Adventure': 32,
        'Indie': 25,
        'Strategy': 16
      },
      platformBreakdown: {
        'PC': 98,
        'PlayStation': 45,
        'Xbox': 13
      },
      yearlyStats: {
        '2022': 34,
        '2023': 67,
        '2024': 55
      }
    },
    preferences: {
      theme: 'dark',
      language: 'fr',
      notifications: {
        newFollowers: true,
        gameReleases: true,
        friendActivity: true,
        promotions: false,
        email: true,
        push: true,
        friends: true,
        reviews: false
      },
      privacy: {
        profileVisibility: 'public',
        showPlaytime: true,
        showCurrentlyPlaying: true,
        showRealName: false,
        showEmail: false
      }
    }
  },
  {
    id: '2',
    username: 'GameMaster92',
    email: 'gamemaster@example.com',
    avatar: 'https://images.pexels.com/photos/1337247/pexels-photo-1337247.jpeg?auto=compress&cs=tinysrgb&w=400',
    banner: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1200',
    bio: 'Critique gaming professionnel • 15 ans d\'expérience dans l\'industrie du jeu vidéo.',
    location: 'Lyon, France',
    website: 'https://gamemaster92.com',
    joinDate: '2022-08-10',
    isPremium: true,
    isVerified: true,
    favoriteGames: ['1', '4', '7'],
    following: ['1', '3', '4'],
    followers: ['1', '3', '4', '5'],
    stats: {
      gamesPlayed: 203,
      gamesCompleted: 145,
      totalPlaytime: 3420,
      averageRating: 4.1,
      currentStreak: 12,
      longestStreak: 31,
      reviewsWritten: 78,
      achievementsUnlocked: 1567,
      genreBreakdown: {
        'RPG': 52,
        'Action': 41,
        'Strategy': 38,
        'Adventure': 35,
        'Indie': 37
      },
      platformBreakdown: {
        'PC': 125,
        'PlayStation': 58,
        'Xbox': 20
      },
      yearlyStats: {
        '2022': 45,
        '2023': 89,
        '2024': 69
      }
    },
    preferences: {
      theme: 'dark',
      language: 'fr',
      notifications: {
        newFollowers: true,
        gameReleases: true,
        friendActivity: true,
        promotions: true,
        email: true,
        push: true,
        friends: true,
        reviews: true
      },
      privacy: {
        profileVisibility: 'public',
        showPlaytime: true,
        showCurrentlyPlaying: true,
        showRealName: false,
        showEmail: false
      }
    }
  },
  {
    id: '3',
    username: 'PixelHunter',
    email: 'pixelhunter@example.com',
    avatar: 'https://images.pexels.com/photos/1298601/pexels-photo-1298601.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Streamer et expert en jeux indépendants. Toujours à la recherche de la prochaine perle rare !',
    location: 'Montréal, Canada',
    joinDate: '2023-03-22',
    isPremium: false,
    isVerified: false,
    favoriteGames: ['3', '7'],
    following: ['1', '2'],
    followers: ['1', '2', '4'],
    stats: {
      gamesPlayed: 89,
      gamesCompleted: 67,
      totalPlaytime: 1890,
      averageRating: 4.3,
      currentStreak: 5,
      longestStreak: 18,
      reviewsWritten: 23,
      achievementsUnlocked: 567,
      genreBreakdown: {
        'Indie': 45,
        'Platformer': 23,
        'Puzzle': 15,
        'Adventure': 6
      },
      platformBreakdown: {
        'PC': 67,
        'Nintendo Switch': 22
      },
      yearlyStats: {
        '2023': 34,
        '2024': 55
      }
    },
    preferences: {
      theme: 'dark',
      language: 'fr',
      notifications: {
        newFollowers: true,
        gameReleases: false,
        friendActivity: true,
        promotions: false,
        email: false,
        push: true,
        friends: true,
        reviews: true
      },
      privacy: {
        profileVisibility: 'public',
        showPlaytime: false,
        showCurrentlyPlaying: true,
        showRealName: false,
        showEmail: false
      }
    }
  },
  {
    id: '4',
    username: 'RPGLegend',
    email: 'rpglegend@example.com',
    avatar: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400',
    bio: 'Spécialiste RPG depuis 20 ans. Si ça a des stats et de la progression, je suis dedans !',
    location: 'Tokyo, Japon',
    joinDate: '2021-11-05',
    isPremium: true,
    isVerified: true,
    favoriteGames: ['1', '4', '5'],
    following: ['1', '2', '3'],
    followers: ['2', '3'],
    stats: {
      gamesPlayed: 312,
      gamesCompleted: 198,
      totalPlaytime: 5670,
      averageRating: 4.0,
      currentStreak: 8,
      longestStreak: 45,
      reviewsWritten: 156,
      achievementsUnlocked: 2890,
      genreBreakdown: {
        'RPG': 89,
        'JRPG': 67,
        'MMO': 45,
        'Action RPG': 56,
        'Strategy': 34,
        'Adventure': 21,
        'Mobile': 3
      },
      platformBreakdown: {
        'PC': 189,
        'PlayStation': 89,
        'Nintendo Switch': 34,
        'Mobile': 12
      },
      yearlyStats: {
        '2021': 23,
        '2022': 78,
        '2023': 123,
        '2024': 88
      }
    },
    preferences: {
      theme: 'dark',
      language: 'en',
      notifications: {
        newFollowers: true,
        gameReleases: true,
        friendActivity: true,
        promotions: true,
        email: true,
        push: true,
        friends: true,
        reviews: true
      },
      privacy: {
        profileVisibility: 'public',
        showPlaytime: true,
        showCurrentlyPlaying: true,
        showRealName: false,
        showEmail: false
      }
    }
  }
];

export const mockUserGames: UserGame[] = [
  {
    gameId: '1',
    status: 'completed',
    rating: 5,
    review: 'Un chef-d\'œuvre absolu ! L\'histoire, les personnages, le monde ouvert... tout est parfait.',
    dateAdded: '2023-03-15',
    lastPlayed: '2023-12-20',
    playtime: 127,
    completionPercentage: 100,
    sessions: [],
    personalTags: ['chef-d\'œuvre', 'histoire incroyable'],
    isSpoilerReview: false
  },
  {
    gameId: '2',
    status: 'playing',
    rating: 4,
    dateAdded: '2024-01-10',
    lastPlayed: '2024-01-25',
    playtime: 45,
    completionPercentage: 60,
    sessions: [],
    personalTags: ['cyberpunk', 'immersif']
  },
  {
    gameId: '3',
    status: 'completed',
    rating: 4.5,
    review: 'Un metroidvania exceptionnel avec une direction artistique sublime.',
    dateAdded: '2023-08-05',
    lastPlayed: '2023-09-12',
    playtime: 43,
    completionPercentage: 112,
    sessions: [],
    personalTags: ['metroidvania', 'difficile', 'artistique']
  },
  {
    gameId: '4',
    status: 'wishlist',
    dateAdded: '2024-01-20',
    sessions: [],
    personalTags: ['souls-like', 'à jouer']
  },
  {
    gameId: '5',
    status: 'completed',
    rating: 5,
    review: 'Une expérience émotionnelle incroyable. La relation père-fils est magnifiquement développée.',
    dateAdded: '2023-06-10',
    lastPlayed: '2023-07-15',
    playtime: 32,
    completionPercentage: 100,
    sessions: [],
    personalTags: ['émotionnel', 'mythologie nordique']
  }
];
