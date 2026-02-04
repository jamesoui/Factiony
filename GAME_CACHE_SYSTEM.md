# Système de Cache pour les Informations de Jeux

## Vue d'ensemble

Le système de cache implémenté permet de récupérer les informations des jeux en priorité depuis le cache Supabase, puis depuis les APIs RAWG et IGDB si les données ne sont pas en cache.

## Architecture

### 1. **Module de Cache (`src/lib/api/gameCache.ts`)**

Module centralisé qui gère toutes les interactions avec le cache et les APIs externes.

#### Fonctions principales :

- `fetchGameFromCacheOrAPI(gameIdOrSlug, locale)` - Récupère un jeu depuis le cache ou les APIs
- `fetchMultipleGamesFromCache(gameIds, locale)` - Récupère plusieurs jeux en batch
- `searchGamesWithCache(query, locale)` - Recherche de jeux avec cache
- `clearExpiredCache()` - Nettoie les entrées expirées du cache

### 2. **Edge Function (`supabase/functions/fetch-game-data`)**

Fonction serverless qui récupère les données depuis RAWG et IGDB, les fusionne et les met en cache.

#### Flux de données :

1. Vérification du cache Supabase avec clé `gameId_locale`
2. Si cache valide → retourne les données en cache
3. Si cache manquant ou expiré :
   - Récupère depuis RAWG API (slug ou ID)
   - Récupère depuis IGDB API (ID uniquement)
   - Fusionne les données des deux sources
   - Traduit la description si nécessaire (via Edge Function `translate`)
   - Met en cache pour 24h
   - Retourne les données fusionnées

### 3. **API Client (`src/lib/api/games.ts`)**

Toutes les fonctions ont été mises à jour pour utiliser le système de cache :

- `getGame(query)` - Utilise le cache via `fetchGameFromCacheOrAPI`
- `searchGames(query, page, pageSize)` - Recherche avec cache
- `fetchFeaturedGames(slugs)` - Batch de jeux en cache
- `fetchTopRatedGames(limit)` - Top des jeux en cache
- `fetchUpcomingGames(limit)` - Jeux à venir en cache
- `searchPopularGames(limit)` - Jeux populaires en cache
- `fetchRandomPopularGames(count)` - Jeux aléatoires en cache
- `fetchGamesByIds(gameIds)` - Batch de jeux par IDs en cache

## Table de Cache

### `api_cache_rawg_igdb`

```sql
CREATE TABLE api_cache_rawg_igdb (
  game_id text PRIMARY KEY,           -- Format: "gameId_locale" (ex: "3498_fr")
  payload jsonb NOT NULL,              -- Données du jeu fusionnées
  expires_at timestamptz NOT NULL,     -- Date d'expiration (24h)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Priorité des Sources de Données

1. **Cache Supabase** (priorité 1) - Vérifié en premier, le plus rapide
2. **RAWG API** (priorité 2) - Utilisé pour les slugs ET IDs
3. **IGDB API** (priorité 3) - Utilisé uniquement pour les IDs numériques

## Configuration

### Variables d'environnement requises dans `.env` :

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_RAWG_KEY=your_rawg_api_key
VITE_RAWG_API_KEY=your_rawg_api_key
VITE_IGDB_CLIENT_ID=your_igdb_client_id
VITE_IGDB_ACCESS_TOKEN=your_igdb_access_token
```

### Obtenir les clés API :

#### RAWG API
1. Créer un compte sur https://rawg.io/apidocs
2. Obtenir votre clé API dans votre dashboard

#### IGDB API
1. Créer un compte Twitch Developer sur https://dev.twitch.tv/
2. Créer une application
3. Obtenir le Client ID
4. Générer un Access Token avec :
   ```bash
   curl -X POST "https://id.twitch.tv/oauth2/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&grant_type=client_credentials"
   ```

## Durée de Cache

- **24 heures** pour chaque entrée
- Le cache est vérifié à chaque requête
- Les entrées expirées sont automatiquement remplacées par un nouveau fetch

## Logs et Debugging

Les logs suivants sont visibles dans la console Supabase Edge Functions :

- `✅ Cache HIT` - Données trouvées dans le cache
- `🔄 Cache MISS` - Pas de cache, fetch depuis les APIs
- `🎮 Fetching from RAWG` - Récupération depuis RAWG
- `🎯 Fetching from IGDB` - Récupération depuis IGDB
- `✨ Game data compiled` - Données fusionnées avec succès
- `💾 Cached game` - Données mises en cache

## Performance

### Avantages :
- **Réduction des appels API** : Les données fréquemment consultées sont en cache
- **Temps de réponse réduit** : ~20-50ms (cache) vs ~500-1500ms (APIs)
- **Support multi-langue** : Cache séparé par locale (fr, en)
- **Fusion intelligente** : Combine le meilleur de RAWG et IGDB

### Cache Hit Rate attendu :
- **Jeux populaires** : 95%+ (après quelques heures)
- **Jeux récents** : 80-90%
- **Jeux obscurs** : 20-30%

## Utilisation dans le Code

### Exemple : Récupérer un jeu

```typescript
import { fetchGameFromCacheOrAPI } from '@/lib/api/gameCache';

const game = await fetchGameFromCacheOrAPI('the-witcher-3-wild-hunt', 'fr');
// Récupère depuis le cache si disponible, sinon depuis les APIs
```

### Exemple : Recherche de jeux

```typescript
import { searchGames } from '@/lib/api/games';

const results = await searchGames('zelda', 1, 20);
// Utilise le cache automatiquement
```

## Maintenance

### Nettoyer le cache manuellement :

```typescript
import { clearExpiredCache } from '@/lib/api/gameCache';

await clearExpiredCache();
```

### Vider tout le cache (via SQL) :

```sql
DELETE FROM api_cache_rawg_igdb;
```

## Limitations

1. **IGDB** : Fonctionne uniquement avec des IDs numériques (pas de slugs)
2. **Cache** : 24h de durée fixe (peut être ajusté dans l'Edge Function)
3. **Traduction** : La traduction automatique est utilisée si pas de version française disponible

## Prochaines Améliorations

- [ ] Préchargement des jeux populaires au démarrage
- [ ] Système de cache côté client (localStorage)
- [ ] Invalidation manuelle du cache par admin
- [ ] Statistiques de cache hit/miss
- [ ] Support de plus de langues (es, de, it)
