# Système de cache des jaquettes Top 50 jeux

## Vue d'ensemble

Ce système optimise le chargement de la section "Les jeux les plus joués" sur la page `/search` en servant les jaquettes depuis Supabase Storage au lieu d'appels externes (RAWG/IGDB). Cela élimine les problèmes CORS et accélère considérablement le temps de chargement initial.

## Architecture

### 1. Base de données

**Table `top_games_covers_cache`**
- Stocke les métadonnées des jaquettes
- Lecture publique autorisée (données publiques)
- Modification uniquement via service_role

Colonnes principales :
- `slug` : identifiant unique du jeu
- `title` : nom du jeu
- `public_url` : URL CDN de la jaquette
- `updated_at` : date de dernière mise à jour
- `version` : version du cache
- `width`, `height` : dimensions de l'image

### 2. Supabase Storage

**Bucket `top-game-covers`**
- Public, accessible via CDN
- Cache-Control de 30 jours
- Limite de taille : 5MB par fichier
- Formats acceptés : JPEG, PNG, WebP

Convention de nommage :
```
top50/<game-slug>.jpg
```

### 3. Edge Function

**`warm-top-game-covers`**

Fonction serverless qui :
1. Récupère les données des jeux depuis l'API RAWG
2. Télécharge les jaquettes
3. Les optimise (max 600px de large)
4. Les upload dans Storage
5. Enregistre les URLs dans la table cache

Paramètres :
```json
{
  "force": false,    // Force le rechargement même si cache valide
  "limit": 75        // Nombre de jeux à traiter
}
```

TTL du cache : 30 jours

### 4. Frontend

**Nouveau fichier** : `src/lib/api/topGamesCovers.ts`

Fonctions principales :
- `getTopGamesCached(limit)` : Récupère les jeux avec leurs covers depuis le cache
- `preloadTopCovers(slugs)` : Précharge les 8 premières images
- `warmTopGameCovers(force, limit)` : Appelle l'Edge Function

**Composant modifié** : `src/components/TopGamesSection.tsx`

Changements :
- ✅ Utilise le cache au lieu de `getTopGamesHydrated()`
- ✅ Timeout de 3 secondes pour éviter les spinners infinis
- ✅ Fallback avec placeholders si le cache échoue
- ✅ Eager loading pour les 8 premières images
- ✅ Lazy loading pour les images suivantes

**Composant modifié** : `src/components/SimpleGameCard.tsx`

Ajout :
- Nouvelle prop `loading?: 'lazy' | 'eager'` pour optimiser le chargement

## Workflow

### Chargement initial (/search)

1. L'utilisateur arrive sur `/search` sans requête
2. `TopGamesSection` charge en < 300ms
3. Une seule requête DB récupère les 75 URLs de jaquettes
4. Les 8 premières images sont préchargées (above the fold)
5. Les autres sont chargées en lazy loading

### Rafraîchissement du cache

**Option 1 : Manuel**

Appeler l'Edge Function via console ou script admin :

```typescript
import { warmTopGameCovers } from './src/lib/api/topGamesCovers';

// Mettre à jour uniquement les covers obsolètes (> 30 jours)
const result = await warmTopGameCovers(false, 75);

// Forcer la mise à jour de toutes les covers
const result = await warmTopGameCovers(true, 75);
```

**Option 2 : Automatique (à implémenter)**

Créer un Supabase Scheduled Trigger :
- Fréquence : 1 fois par semaine ou par mois
- Appelle `warm-top-game-covers` avec `force: false`

## Avantages

### Performance
- ⚡ Temps de chargement divisé par 5-10x
- 🚀 1 seule requête DB vs 75 appels externes
- 🎯 CDN avec cache long terme
- 📦 Images optimisées (600px max)

### Fiabilité
- ✅ Plus d'erreurs CORS
- ✅ Plus de timeouts d'API externes
- ✅ Fallback gracieux avec placeholders
- ✅ Cache résilient (TTL 30 jours)

### UX
- 🎨 Skeletons au lieu de spinners infinis
- 🖼️ Images above-the-fold préchargées
- ⏱️ Timeout 3s avec affichage même en cas d'erreur
- 📱 Responsive avec lazy loading

## Commandes utiles

### Vérifier l'état du cache

```sql
SELECT
  slug,
  title,
  updated_at,
  version,
  EXTRACT(DAY FROM NOW() - updated_at) as days_old
FROM top_games_covers_cache
ORDER BY updated_at DESC;
```

### Compter les jeux en cache

```sql
SELECT COUNT(*) FROM top_games_covers_cache;
```

### Trouver les covers obsolètes (> 30 jours)

```sql
SELECT slug, title, updated_at
FROM top_games_covers_cache
WHERE updated_at < NOW() - INTERVAL '30 days'
ORDER BY updated_at ASC;
```

### Supprimer le cache d'un jeu spécifique

```sql
-- En base
DELETE FROM top_games_covers_cache WHERE slug = 'game-slug';

-- En Storage (à faire via dashboard ou API)
```

## Migration & Setup

### Prérequis

**Variables d'environnement Supabase Edge Functions** (à configurer dans Supabase Dashboard → Edge Functions → Secrets) :

1. `RAWG_API_KEY` : Clé API RAWG (obligatoire)
2. `WARM_TOP_COVERS_SECRET` : Secret pour protéger l'endpoint (obligatoire)
   - Générer un secret fort : `openssl rand -hex 32`
   - Exemple : `a1b2c3d4e5f6...`

⚠️ **IMPORTANT** : Ces secrets ne doivent JAMAIS être exposés côté frontend. L'Edge Function est protégée et ne peut être appelée que côté serveur avec le header `X-Warm-Secret`.

### Étapes de déploiement

1. **Migration appliquée** : `create_top_games_covers_cache.sql`
2. **Edge Function déployée** : `warm-top-game-covers`
3. **Secrets configurés** dans Supabase Dashboard
4. **Frontend mis à jour** : Utilise uniquement le cache (lecture seule)

### Configuration des secrets Supabase

1. Aller dans Supabase Dashboard → Project → Edge Functions
2. Cliquer sur "Manage secrets"
3. Ajouter les secrets :
   ```
   RAWG_API_KEY=votre_clé_rawg_ici
   WARM_TOP_COVERS_SECRET=votre_secret_généré_ici
   ```
4. Sauvegarder

### Premier lancement

⚠️ **Ne PAS appeler depuis le navigateur !** Utiliser un script serveur, cURL ou Postman.

**Exemple avec cURL** :

```bash
# Remplacer par vos vraies valeurs
SUPABASE_URL="https://votre-projet.supabase.co"
SUPABASE_ANON_KEY="votre_anon_key"
WARM_SECRET="votre_warm_top_covers_secret"

curl -X POST "${SUPABASE_URL}/functions/v1/warm-top-game-covers" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "X-Warm-Secret: ${WARM_SECRET}" \
  -d '{"force": true, "limit": 75}'
```

**Exemple avec script Node.js** :

```javascript
// warm-covers-admin.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const WARM_SECRET = process.env.WARM_TOP_COVERS_SECRET;

async function warmCovers(force = false, limit = 75) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/warm-top-game-covers`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'X-Warm-Secret': WARM_SECRET
      },
      body: JSON.stringify({ force, limit })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed: ${response.status} - ${error}`);
  }

  return await response.json();
}

warmCovers(true, 75)
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error));
```

Durée estimée : ~3-5 minutes pour 75 jeux (batch de 3 simultanés)

## Maintenance

### Rafraîchir le cache manuellement

⚠️ **IMPORTANT** : Ne jamais appeler depuis le frontend. Utiliser uniquement un script serveur avec le secret `WARM_TOP_COVERS_SECRET`.

**Option 1 : Script Node.js**

```javascript
// Créer un fichier admin/warm-covers.js
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const WARM_SECRET = process.env.WARM_TOP_COVERS_SECRET;

async function warmCovers(force = false, limit = 75) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/warm-top-game-covers`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'X-Warm-Secret': WARM_SECRET
      },
      body: JSON.stringify({ force, limit })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed: ${response.status} - ${error}`);
  }

  return await response.json();
}

// Rafraîchir uniquement les covers obsolètes (> 30 jours)
warmCovers(false, 75)
  .then(result => {
    console.log(`✅ Processed: ${result.processed}`);
    console.log(`📦 Updated: ${result.updated}`);
    console.log(`💾 Cached: ${result.cached}`);
    console.log(`❌ Failed: ${result.failed}`);
  })
  .catch(error => console.error('Error:', error));

// Pour forcer la mise à jour de toutes les covers
// warmCovers(true, 75).then(...).catch(...);
```

**Option 2 : cURL**

```bash
# .env ou variables d'environnement
source .env

curl -X POST "${VITE_SUPABASE_URL}/functions/v1/warm-top-game-covers" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "X-Warm-Secret: ${WARM_TOP_COVERS_SECRET}" \
  -d '{"force": false, "limit": 75}'
```

### Monitorer les performances

Vérifier dans les logs Supabase :
- Temps de réponse de l'Edge Function
- Taux d'erreur lors de l'upload
- Taille des images uploadées

## Sécurité

### Protection de l'Edge Function

L'Edge Function `warm-top-game-covers` est protégée par plusieurs couches :

1. **Secret header obligatoire** (`X-Warm-Secret`)
   - Empêche tout accès non autorisé
   - Le secret doit être stocké uniquement côté serveur
   - Retourne 401 Unauthorized si absent ou invalide

2. **Pas d'exposition frontend**
   - La fonction `warmTopGameCovers()` a été supprimée du code client
   - Les clés RAWG ne sont jamais exposées au navigateur
   - Seul le cache en lecture est accessible publiquement

3. **Service Role uniquement pour Storage**
   - Upload/Update/Delete limités au service_role
   - Lecture publique autorisée (CDN)

### Bonnes pratiques

- ✅ Stocker `WARM_TOP_COVERS_SECRET` dans un gestionnaire de secrets (1Password, Vault, etc.)
- ✅ Utiliser des secrets forts (32+ caractères, générés aléatoirement)
- ✅ Ne jamais commiter les secrets dans Git
- ✅ Restreindre l'accès aux scripts admin
- ✅ Monitorer les logs Supabase pour détecter les tentatives non autorisées

## Limitations

- **Dépendance RAWG** : L'Edge Function utilise toujours l'API RAWG pour récupérer les URLs sources
- **Taille max** : 5MB par image (largement suffisant avec resize à 600px)
- **Pas de CDN custom** : Utilise le CDN Supabase (performant mais pas gérable finement)
- **Pas de WebP natif** : Les images sont converties en JPEG
- **Appel manuel requis** : Le cache doit être rafraîchi manuellement (pas de scheduled trigger par défaut)

## Améliorations futures

1. **Scheduled refresh** : Automatiser le rafraîchissement hebdomadaire
2. **Webhook notifications** : Notifier en cas d'échec de rafraîchissement
3. **Metrics dashboard** : Visualiser les stats de cache hit/miss
4. **Multiple tailles** : Générer thumbnails + full-size
5. **WebP support** : Utiliser WebP avec fallback JPEG
6. **Cache warming au build** : Intégrer dans le pipeline CI/CD
