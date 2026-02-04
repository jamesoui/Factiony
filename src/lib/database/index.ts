import { supabaseManager } from './supabase';
import { firestoreManager } from './firestore';

// Interface unifiée pour l'accès aux bases de données Factiony
class DatabaseManager {
  // Accès à Supabase (données structurées et critiques)
  get sql() {
    return supabaseManager;
  }

  // Accès à Firestore (données dynamiques et volumineuses)
  get nosql() {
    return firestoreManager;
  }

  // === MÉTHODES UNIFIÉES ===

  // Méthode pour supprimer toutes les données d'un utilisateur (RGPD)
  async deleteAllUserData(userId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Suppression RGPD pour l'utilisateur ${userId}...`);
      
      // Supprimer de Firestore d'abord (plus rapide)
      const firestoreSuccess = await this.nosql.deleteUserData(userId);
      console.log(`${firestoreSuccess ? '✅' : '❌'} Données Firestore supprimées`);
      
      // Puis supprimer de Supabase (avec contraintes FK)
      const supabaseSuccess = await this.sql.deleteUserData(userId);
      console.log(`${supabaseSuccess ? '✅' : '❌'} Données Supabase supprimées`);
      
      const success = firestoreSuccess && supabaseSuccess;
      console.log(`${success ? '✅' : '❌'} Suppression RGPD ${success ? 'réussie' : 'échouée'}`);
      return success;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression des données utilisateur:', error);
      return false;
    }
  }

  // Méthode pour vérifier la santé des connexions
  async healthCheck(): Promise<{ supabase: boolean; firestore: boolean; overall: boolean }> {
    console.log('🏥 Vérification santé des connexions...');
    
    const results = {
      supabase: false,
      firestore: false,
      overall: false
    };

    try {
      // Test Supabase
      results.supabase = await this.sql.healthCheck();
    } catch (error) {
      console.error('❌ Erreur de connexion Supabase:', error);
    }

    try {
      // Test Firestore
      results.firestore = await this.nosql.healthCheck();
    } catch (error) {
      console.error('❌ Erreur de connexion Firestore:', error);
    }

    results.overall = results.supabase || results.firestore;
    
    console.log('🏥 État des connexions:', results);
    return results;
  }

  // Créer un utilisateur complet avec abonnement
  async createCompleteUser(email: string, password: string, username?: string): Promise<{
    user: any;
    subscription: any;
    success: boolean;
  }> {
    console.log('❌ createCompleteUser supprimé - utilisez les formulaires d\'inscription');
    return { user: null, subscription: null, success: false };
  }

  // Ajouter un jeu à une liste utilisateur avec logging
  async addGameToUserList(userId: string, gameId: string, listName: string): Promise<boolean> {
    try {
      console.log(`📝 Ajout jeu ${gameId} à la liste "${listName}" pour ${userId}`);
      
      // 1. Vérifier que l'utilisateur existe
      const user = await this.sql.getUserById(userId);
      if (!user) {
        console.error('❌ Utilisateur non trouvé');
        return false;
      }

      // 2. Créer ou récupérer la liste dans Firestore
      const userLists = await this.nosql.getUserLists(userId);
      let targetList = userLists.find(list => list.name === listName);
      
      if (!targetList) {
        const listId = await this.nosql.createUserList(userId, listName);
        if (!listId) return false;
        await this.nosql.addGameToList(listId, gameId);
      } else {
        await this.nosql.addGameToList(targetList.id!, gameId);
      }

      // 3. Logger l'activité
      await this.nosql.logActivity(userId, 'add_to_list', gameId, {
        list_name: listName,
        timestamp: new Date().toISOString()
      });

      console.log('✅ Jeu ajouté à la liste avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur ajout jeu à la liste:', error);
      return false;
    }
  }

  // Liker un jeu avec gestion des doublons
  async likeGame(userId: string, gameId: string): Promise<boolean> {
    try {
      console.log(`❤️ Gestion like jeu ${gameId} par ${userId}`);
      
      // Vérifier si déjà liké
      const existingLikes = await this.nosql.getUserLikes(userId, 1000);
      const alreadyLiked = existingLikes.some(like => like.game_id === gameId);
      
      if (alreadyLiked) {
        // Retirer le like
        const removed = await this.nosql.removeLike(userId, gameId);
        if (removed) {
          await this.nosql.logActivity(userId, 'like', gameId, { action: 'unlike' });
        }
        return false;
      } else {
        // Ajouter le like
        const likeId = await this.nosql.addLike(userId, gameId);
        if (likeId) {
          await this.nosql.logActivity(userId, 'like', gameId, { action: 'like' });
        }
        return !!likeId;
      }
    } catch (error) {
      console.error('❌ Erreur gestion like:', error);
      return false;
    }
  }

  // Suivre un utilisateur avec vérifications
  async followUser(userId: string, targetUserId: string): Promise<boolean> {
    try {
      console.log(`🤝 Follow: ${userId} → ${targetUserId}`);
      
      // 1. Suivre dans Supabase (avec vérification automatique des comptes privés)
      const follow = await this.sql.followUser(userId, targetUserId);
      if (!follow) return false;
      
      // 2. Logger l'action
      await this.nosql.logActivity(userId, 'follow', targetUserId, {
        action: 'follow_user',
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Follow créé avec succès`);
      return true;
    } catch (error) {
      console.error('❌ Erreur follow utilisateur:', error);
      return false;
    }
  }

  // Arrêter de suivre un utilisateur
  async unfollowUser(userId: string, targetUserId: string): Promise<boolean> {
    try {
      console.log(`💔 Unfollow: ${userId} ↛ ${targetUserId}`);
      
      // 1. Unfollow dans Supabase
      const success = await this.sql.unfollowUser(userId, targetUserId);
      if (!success) return false;
      
      // 2. Logger l'action
      await this.nosql.logActivity(userId, 'follow', targetUserId, {
        action: 'unfollow_user',
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Unfollow traité avec succès`);
      return true;
    } catch (error) {
      console.error('❌ Erreur unfollow utilisateur:', error);
      return false;
    }
  }

  // Obtenir des statistiques globales
  async getGlobalStats(): Promise<{
    sql: {
      totalUsers: number;
      premiumUsers: number;
      totalFollowships: number;
      totalSubscriptions: number;
    };
    nosql: {
      totalLikes: number;
      totalComments: number;
      totalLists: number;
      cacheSize: number;
      totalLogs: number;
    };
    timestamp: string;
  }> {
    try {
      console.log('📊 Récupération statistiques globales...');
      
      const [sqlStats, nosqlStats] = await Promise.all([
        this.sql.getStats(),
        this.nosql.getStats()
      ]);

      const globalStats = {
        sql: sqlStats,
        nosql: nosqlStats,
        timestamp: new Date().toISOString()
      };
      
      console.log('📊 Statistiques globales:', globalStats);
      return globalStats;
    } catch (error) {
      console.error('❌ Erreur récupération statistiques:', error);
      return {
        sql: { totalUsers: 0, premiumUsers: 0, totalFollowships: 0, totalSubscriptions: 0 },
        nosql: { totalLikes: 0, totalComments: 0, totalLists: 0, cacheSize: 0, totalLogs: 0 },
        timestamp: new Date().toISOString()
      };
    }
  }

  // Test complet de l'architecture polyglotte
  async runFullArchitectureTest(): Promise<{ success: boolean; report: any }> {
    console.log('🧪 Test d\'architecture simplifié...');
    
    const health = await this.healthCheck();
    const stats = await this.getGlobalStats();
    
    const report = {
      connections: { supabase: health.supabase, firestore: health.firestore },
      statistics: stats,
      timestamp: new Date().toISOString()
    };
    
    return { success: health.overall, report };
  }

  // Générer un rapport de santé complet
  async generateHealthReport(): Promise<string> {
    try {
      const health = await this.healthCheck();
      const stats = await this.getGlobalStats();
      
      let report = `
🏥 === RAPPORT DE SANTÉ FACTIONY ===
Timestamp: ${new Date().toISOString()}

🔗 CONNEXIONS:
  - Supabase: ${health.supabase ? '✅ OK' : '❌ ÉCHEC'}
  - Firestore: ${health.firestore ? '✅ OK' : '❌ ÉCHEC'}

📈 STATISTIQUES:
  - Utilisateurs: ${stats.sql?.totalUsers || 0}
  - Abonnements: ${stats.sql?.totalSubscriptions || 0}
  - Follows: ${stats.sql?.totalFollowships || 0}
  - Likes: ${stats.nosql?.totalLikes || 0}
  - Commentaires: ${stats.nosql?.totalComments || 0}
  - Listes: ${stats.nosql?.totalLists || 0}
  - Cache API: ${stats.nosql?.cacheSize || 0}
  - Logs: ${stats.nosql?.totalLogs || 0}

🎯 RÉSULTAT GLOBAL: ${health.overall ? '✅ SUCCÈS' : '❌ ÉCHEC'}
      `;
      
      console.log(report);
      return report;
    } catch (error) {
      console.error('❌ Erreur génération rapport:', error);
      return '❌ Erreur lors de la génération du rapport de santé';
    }
  }
}

// Instance singleton
export const db = new DatabaseManager();

// Exports pour utilisation directe si nécessaire
export { supabaseManager, firestoreManager };
export * from './supabase';
export * from './firestore';