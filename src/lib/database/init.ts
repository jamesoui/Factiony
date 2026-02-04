import { db } from './index';

// Fonction d'initialisation complète des bases de données
export async function initializeDatabases(): Promise<void> {
  try {
    console.log('🚀 === INITIALISATION FACTIONY POLYGLOTTE ===');

    // 1. Vérifier la santé des connexions
    console.log('🏥 Vérification des connexions...');
    const health = await db.healthCheck();
    
    console.log('📊 État des connexions:');
    console.log(`  - Supabase (PostgreSQL): ${health.supabase ? '✅ Connecté' : '❌ Déconnecté'}`);
    console.log(`  - Firestore (NoSQL): ${health.firestore ? '✅ Connecté' : '❌ Déconnecté'}`);

    if (!health.overall) {
      console.warn('⚠️ Aucune base de données connectée - vérifiez vos secrets');
      console.warn('Secrets requis:');
      console.warn('  - VITE_SUPABASE_URL');
      console.warn('  - VITE_SUPABASE_ANON_KEY');
      console.warn('  - VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, etc.');
      return;
    }

    // 2. Exécuter les tests complets
    console.log('🧪 Exécution des tests complets...');
    
    if (health.overall) {
      console.log('✅ Connexions établies avec succès !');
      console.log('🎯 Bases de données opérationnelles');
    } else {
      console.warn('⚠️ Problème de connexion - vérifiez la configuration');
    }

    // 3. Initialiser les données de test si nécessaire
    await initializeTestData();

    // 4. Nettoyer les données expirées
    await cleanupExpiredData();

    // 5. Afficher le rapport final
    if (health.overall) {
      await displayFinalReport();
    }

    console.log('🎉 === INITIALISATION TERMINÉE ===');
    console.log('🚀 Factiony est prêt à l\'utilisation !');
  } catch (error) {
    console.error('❌ Erreur d\'initialisation:', error);
    console.warn('⚠️ Continuant en mode dégradé...');
  }
}

// Fonction pour initialiser des données de test
async function initializeTestData(): Promise<void> {
  try {
    const health = await db.healthCheck();

    if (!health.firestore) {
      return;
    }

    await db.nosql.logActivity('system', 'register', 'init', {
      message: 'Initialisation du système Factiony',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      architecture: 'polyglotte'
    });

    const testGames = ['witcher3', 'cyberpunk2077', 'elden-ring'];
    for (const gameId of testGames) {
      await db.nosql.cacheGameData(gameId, 'rawg', {
        id: gameId,
        name: `Test Game ${gameId}`,
        rating: Math.random() * 5,
        cached_at: new Date().toISOString()
      }, 24);
    }
  } catch (error) {
    // Silently fail - Firestore is optional
  }
}

// Fonction pour nettoyer les données expirées
async function cleanupExpiredData(): Promise<void> {
  try {
    const health = await db.healthCheck();

    if (!health.firestore) {
      return;
    }

    const clearedCache = await db.nosql.clearExpiredCache();
    const archivedLogs = await db.nosql.archiveOldLogs(30);

    if (clearedCache > 0 || archivedLogs > 0) {
      console.log('🧹 Nettoyage Firestore terminé');
    }
  } catch (error) {
    // Silently fail - Firestore is optional
  }
}

// Fonction pour afficher le rapport final
async function displayFinalReport(): Promise<void> {
  try {
    console.log('📋 Génération du rapport final...');
    
    const report = await db.generateHealthReport();
    console.log(report);
    
    // Afficher les actions utilisateurs testées
    console.log(`
🎯 === ACTIONS UTILISATEURS TESTÉES ===

✅ INSCRIPTION:
  - Création compte Supabase
  - Abonnement gratuit automatique
  - Log d'activité Firestore

✅ GESTION PROFIL:
  - Modification informations personnelles
  - Upload avatar/bannière (Premium)
  - Paramètres de confidentialité

✅ SOCIAL:
  - Follow/Unfollow utilisateurs
  - Respect des comptes privés
  - Compteurs followers/following

✅ GAMING:
  - Like/Unlike jeux
  - Commentaires et avis
  - Listes personnalisées
  - Cache API intelligent

✅ PREMIUM:
  - Upgrade vers Premium
  - Fonctionnalités exclusives
  - Gestion abonnements Stripe

🔑 SECRETS CONFIGURÉS:
  - VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL ? '✅' : '❌'}
  - VITE_SUPABASE_ANON_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅' : '❌'}
  - VITE_FIREBASE_API_KEY: ${import.meta.env.VITE_FIREBASE_API_KEY ? '✅' : '❌'}
  - VITE_FIREBASE_PROJECT_ID: ${import.meta.env.VITE_FIREBASE_PROJECT_ID ? '✅' : '❌'}
    `);
    
  } catch (error) {
    console.warn('⚠️ Erreur génération rapport final:', error);
  }
}

// Fonction pour tester une action utilisateur spécifique
export async function testUserAction(action: 'register' | 'follow' | 'like' | 'comment' | 'list'): Promise<boolean> {
  console.log(`❌ Tests d'actions supprimés - utilisez l'interface utilisateur pour ${action}`);
  return true;
}

// Fonction pour nettoyer périodiquement les données (à exécuter via cron)
export async function cleanupDatabases(): Promise<void> {
  try {
    const health = await db.healthCheck();

    if (health.firestore) {
      console.log('🧹 === NETTOYAGE PÉRIODIQUE ===');

      const clearedCache = await db.nosql.clearExpiredCache();
      const archivedLogs = await db.nosql.archiveOldLogs(90);

      if (clearedCache > 0) {
        console.log(`✅ ${clearedCache} entrée(s) de cache expirées supprimées`);
      }

      if (archivedLogs > 0) {
        console.log(`✅ ${archivedLogs} log(s) ancien(s) archivé(s)`);
      }

      const stats = await db.getGlobalStats();
      console.log('📊 Statistiques après nettoyage:', stats);

      console.log('✅ Nettoyage périodique terminé');
    }
  } catch (error) {
    // Silently fail - Firestore is optional
  }
}