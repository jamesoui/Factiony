import { db } from './index';

// Exemples d'utilisation de l'architecture polyglotte Factiony

export class DatabaseExamples {
  
  // === EXEMPLES UTILISATEURS ===
  
  // Exemple 1: Créer un utilisateur complet avec abonnement
  static async createUserWithSubscription(email: string, username?: string, plan: 'free' | 'premium' = 'free') {
    console.log('❌ Création automatique d\'utilisateur supprimée - utilisez le formulaire d\'inscription');
    throw new Error('Utilisez le formulaire d\'inscription dans l\'interface');
  }

  // Exemple 2: Rechercher et suivre des utilisateurs
  static async searchAndFollowUser(userId: string, searchQuery: string) {
    try {
      console.log(`🔍 Recherche d'utilisateurs: "${searchQuery}"`);
      
      // 1. Rechercher des utilisateurs
      const users = await db.sql.searchUsers(searchQuery, 10);
      
      if (users.length === 0) {
        console.log('❌ Aucun utilisateur trouvé');
        return [];
      }
      
      // 2. Logger la recherche
      await db.nosql.logActivity(userId, 'search', undefined, {
        query: searchQuery,
        results_count: users.length
      });
      
      console.log(`✅ ${users.length} utilisateur(s) trouvé(s)`);
      return users;
    } catch (error) {
      console.error('❌ Erreur recherche utilisateurs:', error);
      throw error;
    }
  }

  // === EXEMPLES JEUX ===
  
  // Exemple 3: Ajouter un jeu à une liste utilisateur
  static async addGameToUserList(userId: string, gameId: string, listName: string) {
    try {
      console.log(`📝 Ajout jeu ${gameId} à la liste "${listName}"`);
      
      // Utiliser la méthode unifiée
      await db.addGameToUserList(userId, gameId, listName);
      
      console.log('✅ Jeu ajouté à la liste');
      return true;
    } catch (error) {
      console.error('❌ Erreur ajout jeu à la liste:', error);
      throw error;
    }
  }

  // Exemple 4: Récupérer les données d'un jeu avec cache
  static async getGameData(gameId: string, userId?: string) {
    try {
      console.log(`🎮 Récupération données jeu: ${gameId}`);
      
      // Utiliser la méthode unifiée avec cache intelligent
      const gameData = await db.getGameData(gameId, userId);
      
      console.log('✅ Données jeu récupérées');
      return gameData;
    } catch (error) {
      console.error('❌ Erreur récupération données jeu:', error);
      throw error;
    }
  }

  // Exemple 5: Liker/Unliker un jeu
  static async toggleGameLike(userId: string, gameId: string) {
    try {
      console.log(`❤️ Toggle like jeu ${gameId}`);
      
      const isLiked = await db.likeGame(userId, gameId);
      
      console.log(`✅ Jeu ${isLiked ? 'liké' : 'unliké'}`);
      return isLiked;
    } catch (error) {
      console.error('❌ Erreur toggle like:', error);
      throw error;
    }
  }

  // === EXEMPLES COMMENTAIRES ===
  
  // Exemple 6: Créer un commentaire avec note
  static async createGameReview(userId: string, gameId: string, content: string, rating?: number, isSpoiler = false) {
    try {
      console.log(`💬 Création commentaire pour jeu ${gameId}`);
      
      // 1. Créer le commentaire dans Firestore
      const commentId = await db.nosql.createComment(userId, gameId, content, rating, isSpoiler);
      
      // 2. Logger l'activité
      await db.nosql.logActivity(userId, 'comment', gameId, {
        comment_id: commentId,
        rating: rating,
        has_spoiler: isSpoiler
      });
      
      console.log('✅ Commentaire créé:', commentId);
      return commentId;
    } catch (error) {
      console.error('❌ Erreur création commentaire:', error);
      throw error;
    }
  }

  // Exemple 7: Récupérer les commentaires d'un jeu
  static async getGameReviews(gameId: string, limit = 20) {
    try {
      console.log(`📖 Récupération commentaires jeu ${gameId}`);
      
      const comments = await db.nosql.getGameComments(gameId, limit);
      
      console.log(`✅ ${comments.length} commentaire(s) récupéré(s)`);
      return comments;
    } catch (error) {
      console.error('❌ Erreur récupération commentaires:', error);
      throw error;
    }
  }

  // === EXEMPLES ACTIVITÉ SOCIALE ===
  
  // Exemple 8: Récupérer l'activité des utilisateurs suivis
  static async getFollowingActivity(userId: string) {
    try {
      console.log(`👥 Récupération activité utilisateurs suivis pour ${userId}`);
      
      const followingActivity = await db.getFollowingActivity(userId);
      
      console.log(`✅ Activité de ${followingActivity.length} utilisateur(s) suivi(s) récupérée`);
      return followingActivity;
    } catch (error) {
      console.error('❌ Erreur récupération activité utilisateurs suivis:', error);
      throw error;
    }
  }

  // Exemple 9: Gérer les follows
  static async handleFollow(userId: string, targetUserId: string, action: 'follow' | 'unfollow') {
    try {
      console.log(`🤝 ${action}: ${userId} -> ${targetUserId}`);
      
      switch (action) {
        case 'follow':
          await db.followUser(userId, targetUserId);
          break;
          
        case 'unfollow':
          await db.unfollowUser(userId, targetUserId);
          break;
      }
      
      console.log(`✅ Action ${action} traitée`);
      return true;
    } catch (error) {
      console.error('❌ Erreur gestion follow:', error);
      throw error;
    }
  }

  // === EXEMPLES ADMINISTRATION ===
  
  // Exemple 10: Supprimer un utilisateur (RGPD)
  static async deleteUser(userId: string) {
    try {
      console.log(`🗑️ Suppression utilisateur RGPD: ${userId}`);
      
      // Utiliser la méthode unifiée qui gère les deux bases
      await db.deleteAllUserData(userId);
      
      console.log(`✅ Utilisateur ${userId} supprimé complètement`);
      return true;
    } catch (error) {
      console.error('❌ Erreur suppression utilisateur:', error);
      throw error;
    }
  }

  // Exemple 11: Optimiser les coûts
  static async optimizeDatabase() {
    try {
      console.log('💰 Optimisation des coûts...');
      
      await db.optimizeCosts();
      
      console.log('✅ Optimisation terminée');
      return true;
    } catch (error) {
      console.error('❌ Erreur optimisation:', error);
      throw error;
    }
  }

  // === EXEMPLES CACHE API ===
  
  // Exemple 12: Gérer le cache des API externes
  static async cacheExternalApiData(gameId: string) {
    try {
      console.log(`🔄 Mise en cache données API pour jeu ${gameId}`);
      
      // Simuler des données RAWG
      const rawgData = {
        id: gameId,
        name: `Game ${gameId}`,
        rating: Math.random() * 5,
        released: new Date().toISOString(),
        platforms: ['PC', 'PlayStation', 'Xbox'],
        genres: ['Action', 'Adventure']
      };
      
      // Simuler des données IGDB
      const igdbData = {
        id: gameId,
        name: `Game ${gameId}`,
        rating: Math.random() * 100,
        first_release_date: Date.now() / 1000,
        platforms: [6, 48, 49], // PC, PlayStation, Xbox
        genres: [12, 31] // Action, Adventure
      };
      
      // Mettre en cache (24h)
      await db.nosql.cacheGameData(gameId, 'rawg', rawgData, 24);
      await db.nosql.cacheGameData(gameId, 'igdb', igdbData, 24);
      
      console.log('✅ Données API mises en cache');
      return { rawg: rawgData, igdb: igdbData };
    } catch (error) {
      console.error('❌ Erreur cache API:', error);
      throw error;
    }
  }
}

// Exemples d'utilisation directe des managers
export const directExamples = {
  
  // Utilisation directe de Supabase
  async supabaseExample() {
    console.log('📊 Exemple Supabase direct');
    
    try {
      // Créer un utilisateur
      const user = await db.sql.createUser('test@example.com', 'TestUser');
      
      // Récupérer son abonnement
      const subscription = await db.sql.getUserSubscription(user.id);
      
      console.log('✅ Exemple Supabase réussi');
      return { user, subscription };
    } catch (error) {
      console.error('❌ Erreur exemple Supabase:', error);
      throw error;
    }
  },

  // Utilisation directe de Firestore
  async firestoreExample() {
    console.log('🔥 Exemple Firestore direct');
    
    try {
      // Logger une activité
      await db.nosql.logActivity('user123', 'search', undefined, { 
        query: 'cyberpunk',
        timestamp: new Date().toISOString()
      });
      
      // Récupérer des commentaires
      const comments = await db.nosql.getGameComments('game456', 5);
      
      console.log('✅ Exemple Firestore réussi');
      return comments;
    } catch (error) {
      console.error('❌ Erreur exemple Firestore:', error);
      throw error;
    }
  },

  // Requêtes personnalisées
  async customQueries() {
    console.log('🔧 Exemples requêtes personnalisées');
    
    try {
      // Requête SQL personnalisée sur Supabase
      const sqlResult = await db.sql.query(
        'SELECT COUNT(*) as total_users FROM users WHERE created_at > $1',
        [new Date('2024-01-01')]
      );

      // Requête personnalisée sur Firestore
      const firestoreResult = await db.nosql.query(
        'comments',
        [{ field: 'rating', operator: '>=', value: 4 }],
        { field: 'created_at', direction: 'desc' },
        10
      );

      console.log('✅ Requêtes personnalisées réussies');
      return { sqlResult, firestoreResult };
    } catch (error) {
      console.error('❌ Erreur requêtes personnalisées:', error);
      throw error;
    }
  },

  // Test complet de l'architecture
  async fullArchitectureTest() {
    console.log('🧪 Test complet de l\'architecture polyglotte');
    
    try {
      // 1. Créer un utilisateur
      const { user } = await DatabaseExamples.createUserWithSubscription(
        'test@factiony.com', 
        'TestUser', 
        'free'
      );
      
      // 2. Créer une liste
      await DatabaseExamples.addGameToUserList(user.id, 'game123', 'Mes Favoris');
      
      // 3. Liker un jeu
      await DatabaseExamples.toggleGameLike(user.id, 'game123');
      
      // 4. Créer un commentaire
      await DatabaseExamples.createGameReview(
        user.id, 
        'game123', 
        'Excellent jeu !', 
        5, 
        false
      );
      
      // 5. Récupérer les statistiques
      const stats = await db.getGlobalStats();
      
      console.log('✅ Test complet réussi');
      console.log('📊 Statistiques finales:', stats);
      
      return { user, stats };
    } catch (error) {
      console.error('❌ Erreur test complet:', error);
      throw error;
    }
  }
};

// Export des exemples pour utilisation dans l'application
export default DatabaseExamples;