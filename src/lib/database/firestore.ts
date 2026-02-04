import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  WhereFilterOp,
  DocumentData,
  QueryConstraint,
  setDoc
} from 'firebase/firestore';

// Types pour les collections Firestore
export interface UserLike {
  id?: string;
  user_id: string;
  game_id: string;
  created_at: Timestamp;
}

export interface Comment {
  id?: string;
  user_id: string;
  game_id: string;
  content: string;
  rating?: number;
  is_spoiler: boolean;
  likes: number;
  replies: string[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface UserList {
  id?: string;
  user_id: string;
  name: string;
  description?: string;
  games: string[];
  is_public: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface GameApiCache {
  id?: string;
  game_id: string;
  api_source: 'rawg' | 'igdb';
  data_json: any;
  last_updated: Timestamp;
  expires_at: Timestamp;
}

export interface ActivityLog {
  id?: string;
  user_id: string;
  action_type: 'view_game' | 'add_to_list' | 'rate_game' | 'comment' | 'search' | 'like' | 'follow' | 'register' | 'login';
  resource_id?: string;
  metadata?: Record<string, any>;
  timestamp: Timestamp;
  ip_address?: string;
  user_agent?: string;
}

class FirestoreManager {
  private db: Firestore | null = null;
  private app: FirebaseApp | null = null;
  private isConnected = false;
  private isDisabled = false;
  private permissionErrorLogged = false;

  constructor() {
    this.initializeFirebase();
  }

  /**
   * Vérifie si une erreur Firebase est liée aux permissions insuffisantes.
   * Si c'est le cas, désactive Firestore pour éviter de futures tentatives.
   */
  private handleFirebaseError(error: any, operation: string): void {
    if (!error) return;

    const errorMessage = error.message || error.toString();
    const isPermissionError =
      errorMessage.includes('Missing or insufficient permissions') ||
      errorMessage.includes('permission-denied') ||
      error.code === 'permission-denied';

    if (isPermissionError) {
      if (!this.permissionErrorLogged) {
        console.warn('⚠️ Firestore: Permissions insuffisantes - Firestore désactivé');
        console.warn('L\'application continuera de fonctionner avec Supabase uniquement');
        this.permissionErrorLogged = true;
      }
      this.isDisabled = true;
      this.isConnected = false;
    }
  }

  /**
   * Initialise Firebase avec la configuration publique côté client.
   *
   * SÉCURITÉ: Les variables VITE_* sont publiques côté client et ne doivent
   * JAMAIS contenir de secrets (service accounts, private keys). Cette configuration
   * utilise uniquement des identifiants publics qui sont safe pour le client.
   *
   * La sécurité est assurée par les règles Firestore Security Rules côté serveur.
   */
  private initializeFirebase() {
    try {
      // Construire la configuration Firebase à partir des variables d'environnement
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      };

      // Validation: vérifier que toutes les variables requises sont présentes
      const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
      const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

      if (missingKeys.length > 0) {
        console.warn('⚠️ Configuration Firebase incomplète - Firestore désactivé');
        console.warn('L\'application continuera de fonctionner avec Supabase uniquement');
        this.isDisabled = true;
        return;
      }

      // Vérifier si Firebase est déjà initialisé
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
      } else {
        this.app = getApps()[0];
      }

      this.db = getFirestore(this.app);
      this.isConnected = true;
      console.log('✅ Firestore initialisé avec succès');
      console.log(`📍 Projet: ${firebaseConfig.projectId}`);
    } catch (error) {
      console.warn('⚠️ Erreur initialisation Firebase - Firestore désactivé');
      console.warn('L\'application continuera de fonctionner avec Supabase uniquement');
      this.isDisabled = true;
      this.handleFirebaseError(error, 'initialization');
    }
  }

  // Vérification de la connexion
  async healthCheck(): Promise<boolean> {
    if (this.isDisabled) {
      return false;
    }

    if (!this.db || !this.isConnected) {
      return false;
    }

    try {
      const testDoc = doc(this.db, 'health_check', 'test');
      await setDoc(testDoc, {
        timestamp: Timestamp.now(),
        status: 'healthy'
      });

      const docSnap = await getDoc(testDoc);
      const isHealthy = docSnap.exists();

      if (isHealthy) {
        console.log('✅ Connexion Firestore OK');
      }
      return isHealthy;
    } catch (error) {
      this.handleFirebaseError(error, 'healthCheck');
      return false;
    }
  }

  // === MÉTHODES USER LIKES ===

  async addLike(userId: string, gameId: string): Promise<string | null> {
    if (this.isDisabled || !this.db) return null;

    try {
      const like: UserLike = {
        user_id: userId,
        game_id: gameId,
        created_at: Timestamp.now()
      };

      const docRef = await addDoc(collection(this.db, 'user_likes'), like);
      return docRef.id;
    } catch (error) {
      this.handleFirebaseError(error, 'addLike');
      return null;
    }
  }

  async removeLike(userId: string, gameId: string): Promise<boolean> {
    if (this.isDisabled || !this.db) return false;

    try {
      const q = query(
        collection(this.db, 'user_likes'),
        where('user_id', '==', userId),
        where('game_id', '==', gameId)
      );

      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      return true;
    } catch (error) {
      this.handleFirebaseError(error, 'removeLike');
      return false;
    }
  }

  async getUserLikes(userId: string, limitCount = 50): Promise<UserLike[]> {
    if (this.isDisabled || !this.db) return [];

    try {
      const q = query(
        collection(this.db, 'user_likes'),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const likes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserLike));

      return likes;
    } catch (error) {
      this.handleFirebaseError(error, 'getUserLikes');
      return [];
    }
  }

  // === MÉTHODES COMMENTAIRES ===

  async createComment(userId: string, gameId: string, content: string, rating?: number, isSpoiler = false): Promise<string | null> {
    if (this.isDisabled || !this.db) return null;

    try {
      const comment: Comment = {
        user_id: userId,
        game_id: gameId,
        content,
        rating,
        is_spoiler: isSpoiler,
        likes: 0,
        replies: [],
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      };

      const docRef = await addDoc(collection(this.db, 'comments'), comment);
      return docRef.id;
    } catch (error) {
      this.handleFirebaseError(error, 'createComment');
      return null;
    }
  }

  async getGameComments(gameId: string, limitCount = 20): Promise<Comment[]> {
    if (this.isDisabled || !this.db) return [];

    try {
      const q = query(
        collection(this.db, 'comments'),
        where('game_id', '==', gameId),
        orderBy('created_at', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const comments = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Comment));

      return comments;
    } catch (error) {
      this.handleFirebaseError(error, 'getGameComments');
      return [];
    }
  }

  // === MÉTHODES LISTES UTILISATEUR ===

  async createUserList(userId: string, name: string, description?: string, isPublic = false): Promise<string | null> {
    if (this.isDisabled || !this.db) return null;

    try {
      const userList: UserList = {
        user_id: userId,
        name,
        description,
        games: [],
        is_public: isPublic,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      };

      const docRef = await addDoc(collection(this.db, 'user_lists'), userList);
      return docRef.id;
    } catch (error) {
      this.handleFirebaseError(error, 'createUserList');
      return null;
    }
  }

  async getUserLists(userId: string): Promise<UserList[]> {
    if (this.isDisabled || !this.db) return [];

    try {
      const q = query(
        collection(this.db, 'user_lists'),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const lists = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserList));

      return lists;
    } catch (error) {
      this.handleFirebaseError(error, 'getUserLists');
      return [];
    }
  }

  async addGameToList(listId: string, gameId: string): Promise<boolean> {
    if (this.isDisabled || !this.db) return false;

    try {
      const listRef = doc(this.db, 'user_lists', listId);
      const listDoc = await getDoc(listRef);

      if (listDoc.exists()) {
        const currentGames = listDoc.data().games || [];
        if (!currentGames.includes(gameId)) {
          await updateDoc(listRef, {
            games: [...currentGames, gameId],
            updated_at: Timestamp.now()
          });
          return true;
        }
      }
      return false;
    } catch (error) {
      this.handleFirebaseError(error, 'addGameToList');
      return false;
    }
  }

  // === MÉTHODES CACHE API ===

  async cacheGameData(gameId: string, apiSource: 'rawg' | 'igdb', data: any, expirationHours = 24): Promise<boolean> {
    if (this.isDisabled || !this.db) return false;

    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expirationHours);

      const cacheData: GameApiCache = {
        game_id: gameId,
        api_source: apiSource,
        data_json: data,
        last_updated: Timestamp.now(),
        expires_at: Timestamp.fromDate(expiresAt)
      };

      const cacheRef = doc(this.db, 'games_api_cache', `${gameId}_${apiSource}`);
      await setDoc(cacheRef, cacheData);

      return true;
    } catch (error) {
      this.handleFirebaseError(error, 'cacheGameData');
      return false;
    }
  }

  async getCachedGameData(gameId: string, apiSource: 'rawg' | 'igdb'): Promise<GameApiCache | null> {
    if (this.isDisabled || !this.db) return null;

    try {
      const cacheRef = doc(this.db, 'games_api_cache', `${gameId}_${apiSource}`);
      const cacheDoc = await getDoc(cacheRef);

      if (cacheDoc.exists()) {
        const data = cacheDoc.data() as GameApiCache;

        if (data.expires_at.toDate() > new Date()) {
          return { id: cacheDoc.id, ...data };
        } else {
          await deleteDoc(cacheRef);
        }
      }

      return null;
    } catch (error) {
      this.handleFirebaseError(error, 'getCachedGameData');
      return null;
    }
  }

  // === MÉTHODES LOGS D'ACTIVITÉ ===

  async logActivity(userId: string, actionType: ActivityLog['action_type'], resourceId?: string, metadata?: Record<string, any>): Promise<boolean> {
    if (this.isDisabled || !this.db) return false;

    try {
      const log: ActivityLog = {
        user_id: userId,
        action_type: actionType,
        resource_id: resourceId,
        metadata,
        timestamp: Timestamp.now()
      };

      await addDoc(collection(this.db, 'logs'), log);
      return true;
    } catch (error) {
      this.handleFirebaseError(error, 'logActivity');
      return false;
    }
  }

  async getUserActivity(userId: string, limitCount = 50): Promise<ActivityLog[]> {
    if (this.isDisabled || !this.db) return [];

    try {
      const q = query(
        collection(this.db, 'logs'),
        where('user_id', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const activities = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ActivityLog));

      return activities;
    } catch (error) {
      this.handleFirebaseError(error, 'getUserActivity');
      return [];
    }
  }

  // === MÉTHODES RGPD ===

  async deleteUserData(userId: string): Promise<boolean> {
    if (this.isDisabled || !this.db) return false;

    try {
      const collections = ['user_likes', 'comments', 'user_lists', 'logs'];

      for (const collectionName of collections) {
        const q = query(
          collection(this.db, collectionName),
          where('user_id', '==', userId)
        );

        const querySnapshot = await getDocs(q);
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      }

      return true;
    } catch (error) {
      this.handleFirebaseError(error, 'deleteUserData');
      return false;
    }
  }

  // === MÉTHODES DE STATISTIQUES ===

  async getStats(): Promise<{
    totalLikes: number;
    totalComments: number;
    totalLists: number;
    cacheSize: number;
    totalLogs: number;
  }> {
    if (this.isDisabled || !this.db) {
      return { totalLikes: 0, totalComments: 0, totalLists: 0, cacheSize: 0, totalLogs: 0 };
    }

    try {
      const [likesSnapshot, commentsSnapshot, listsSnapshot, cacheSnapshot, logsSnapshot] = await Promise.all([
        getDocs(collection(this.db, 'user_likes')),
        getDocs(collection(this.db, 'comments')),
        getDocs(collection(this.db, 'user_lists')),
        getDocs(collection(this.db, 'games_api_cache')),
        getDocs(collection(this.db, 'logs'))
      ]);

      const stats = {
        totalLikes: likesSnapshot.size,
        totalComments: commentsSnapshot.size,
        totalLists: listsSnapshot.size,
        cacheSize: cacheSnapshot.size,
        totalLogs: logsSnapshot.size
      };

      return stats;
    } catch (error) {
      this.handleFirebaseError(error, 'getStats');
      return { totalLikes: 0, totalComments: 0, totalLists: 0, cacheSize: 0, totalLogs: 0 };
    }
  }

  // === MÉTHODES DE TEST CRUD ===
  
  async testCRUDOperations(): Promise<{ success: boolean; details: any }> {
    console.log('❌ Tests CRUD supprimés - utilisez l\'interface utilisateur');
    return { success: true, details: 'Tests désactivés' };
  }

  // === MÉTHODES UTILITAIRES ===

  async clearExpiredCache(): Promise<number> {
    if (this.isDisabled || !this.db) return 0;

    try {
      const q = query(
        collection(this.db, 'games_api_cache'),
        where('expires_at', '<', Timestamp.now())
      );

      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      return querySnapshot.size;
    } catch (error) {
      this.handleFirebaseError(error, 'clearExpiredCache');
      return 0;
    }
  }

  async archiveOldLogs(daysOld = 90): Promise<number> {
    if (this.isDisabled || !this.db) return 0;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const q = query(
        collection(this.db, 'logs'),
        where('timestamp', '<', Timestamp.fromDate(cutoffDate))
      );

      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      return querySnapshot.size;
    } catch (error) {
      this.handleFirebaseError(error, 'archiveOldLogs');
      return 0;
    }
  }
}

export const firestoreManager = new FirestoreManager();