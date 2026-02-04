# Factiony - Architecture Polyglotte Complète 🚀

## 🏗️ Architecture des Bases de Données

Cette application utilise une **architecture polyglotte** avec deux bases de données complémentaires optimisées pour leurs cas d'usage spécifiques :

### 📊 **Supabase (PostgreSQL)** - Données Structurées et Critiques
**Rôle** : Données relationnelles, sécurité et intégrité
- ✅ **Utilisateurs** et authentification Supabase Auth
- ✅ **Abonnements** Premium avec intégration Stripe
- ✅ **Relations d'amitié** avec statuts (pending, accepted, blocked)
- ✅ **Contraintes d'intégrité** référentielle strictes
- ✅ **RLS (Row Level Security)** activé sur toutes les tables
- ✅ **Triggers automatiques** pour création utilisateur

### 🔥 **Firestore (NoSQL)** - Données Dynamiques et Volumineuses
**Rôle** : Flexibilité, performance et scalabilité
- ✅ **Likes utilisateur** sur les jeux
- ✅ **Commentaires et avis** avec système de réponses
- ✅ **Listes personnalisées** illimitées pour Premium
- ✅ **Cache API intelligent** (RAWG, IGDB) avec expiration
- ✅ **Logs d'activité** pour analytics et recommandations

## 🚀 Interface Unifiée

### Accès Simplifié
```typescript
import { db } from './lib/database';

// 📊 Supabase (SQL) - Données critiques
const user = await db.sql.createUser(email, username);
const subscription = await db.sql.getUserSubscription(userId);
const friends = await db.sql.getUserFriends(userId);

// 🔥 Firestore (NoSQL) - Données dynamiques
await db.nosql.logActivity(userId, 'view_game', gameId);
await db.nosql.addLike(userId, gameId);
const comments = await db.nosql.getGameComments(gameId);

// 🔄 Méthodes unifiées
await db.deleteAllUserData(userId); // RGPD complet
await db.optimizeCosts(); // Nettoyage automatique
const health = await db.healthCheck(); // Vérification santé
```

### Exemples Métier
```typescript
import { DatabaseExamples } from './lib/database/examples';

// Créer un utilisateur complet avec abonnement
const { user, subscription } = await DatabaseExamples.createUserWithSubscription(
  'user@example.com', 
  'username', 
  'premium'
);

// Ajouter un jeu à une liste avec logging automatique
await DatabaseExamples.addGameToUserList(userId, gameId, 'Mes Favoris');

// Récupérer des données de jeu avec cache intelligent
const gameData = await DatabaseExamples.getGameData(gameId, userId);

// Gérer l'activité sociale
const friendsActivity = await DatabaseExamples.getFriendsActivity(userId);
```

## 🛡️ Sécurité & RGPD

### Sécurité Renforcée
- ✅ **RLS activé** sur toutes les tables Supabase
- ✅ **Politiques d'accès** granulaires par utilisateur
- ✅ **Authentification Supabase Auth** intégrée
- ✅ **Validation des données** côté serveur et client

### Conformité RGPD
- ✅ **Suppression complète** des données utilisateur
- ✅ **Archivage automatique** des logs anciens (90 jours)
- ✅ **Droit à l'oubli** implémenté
- ✅ **Audit trail** complet des actions

## 📈 Optimisations & Performance

### Cache Intelligent
- ✅ **Cache API 24h** dans Firestore
- ✅ **Expiration automatique** des données
- ✅ **Réduction drastique** des appels externes
- ✅ **Performance optimisée** pour les requêtes fréquentes

### Coûts Maîtrisés
- ✅ **Archivage automatique** des logs anciens
- ✅ **Nettoyage périodique** du cache expiré
- ✅ **Limitation intelligente** des lectures Firestore
- ✅ **Monitoring des coûts** intégré

### Scalabilité
- ✅ **Architecture découplée** SQL/NoSQL
- ✅ **Répartition optimale** des charges
- ✅ **Croissance horizontale** Firestore
- ✅ **Performance constante** même à grande échelle

## 🔧 Configuration

### Variables d'Environnement
```env
# Supabase (PostgreSQL)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Firebase/Firestore (NoSQL)
# IMPORTANT: Ces variables sont publiques côté client et ne doivent jamais contenir de secrets
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

# APIs Externes (optionnel)
VITE_RAWG_API_KEY=your_rawg_api_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_key
```

### Schéma Supabase
```sql
-- Tables principales
users (id, email, username, avatar_url, is_premium, created_at)
subscriptions (id, user_id, plan, status, stripe_subscription_id)
friends (id, user_id, friend_id, status, created_at)

-- Fonctionnalités avancées
✅ Triggers automatiques pour création utilisateur
✅ Fonction RGPD pour suppression complète
✅ RLS avec politiques granulaires
✅ Index optimisés pour performances
```

### Collections Firestore
```javascript
// Collections dynamiques
user_likes (user_id, game_id, created_at)
comments (user_id, game_id, content, rating, likes, replies)
user_lists (user_id, name, games[], is_public)
games_api_cache (game_id, api_source, data_json, expires_at)
logs (user_id, action_type, resource_id, metadata, timestamp)
```

## 🔄 Maintenance Automatique

### Nettoyage Périodique
```typescript
import { cleanupDatabases } from './lib/database/init';

// À programmer via cron job
await cleanupDatabases(); // Nettoie cache + logs anciens
```

### Monitoring
```typescript
// Vérification santé
const health = await db.healthCheck();
console.log('Supabase:', health.supabase ? '✅' : '❌');
console.log('Firestore:', health.firestore ? '✅' : '❌');

// Statistiques globales
const stats = await db.getGlobalStats();
console.log('Utilisateurs:', stats.sql.totalUsers);
console.log('Commentaires:', stats.nosql.totalComments);
```

## 🏃‍♂️ Démarrage Rapide

1. **Configurer les variables d'environnement** dans `.env`
2. **Les bases se connectent automatiquement** au démarrage de l'app
3. **Utiliser l'interface unifiée** `db.sql` et `db.nosql`
4. **Profiter des exemples** dans `DatabaseExamples`

## 🎯 Cas d'Usage Optimaux

### Supabase (SQL) - Utilisez pour :
- 👤 Gestion des utilisateurs et authentification
- 💳 Abonnements et paiements Stripe
- 🤝 Relations sociales (amis, followers)
- 🔒 Données nécessitant l'intégrité référentielle

### Firestore (NoSQL) - Utilisez pour :
- ❤️ Likes, favoris et interactions rapides
- 💬 Commentaires et discussions
- 📝 Listes personnalisées dynamiques
- 📊 Logs d'activité et analytics
- 🔄 Cache des APIs externes

## 🚀 Fonctionnalités Avancées

- ✅ **Auto-scaling** Firestore pour pics de trafic
- ✅ **Backup automatique** des données critiques
- ✅ **Migration de données** entre environnements
- ✅ **Tests de performance** intégrés
- ✅ **Monitoring en temps réel** des connexions
- ✅ **Optimisation continue** des coûts

L'architecture est **production-ready** et s'adapte automatiquement à la croissance ! 🎉

---

**Factiony** - Votre plateforme gaming avec une architecture de données moderne et évolutive.