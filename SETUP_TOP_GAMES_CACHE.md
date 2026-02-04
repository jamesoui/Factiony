# Configuration initiale du cache Top Games

Ce guide décrit comment configurer et initialiser le système de cache des jaquettes pour la section "Les jeux les plus joués" sur `/search`.

## Prérequis

1. Supabase configuré et fonctionnel
2. Accès au dashboard Supabase
3. Clé API RAWG valide

## Étape 1 : Configurer les secrets Supabase

### 1.1 Générer un secret fort

```bash
# Générer un secret de 32 caractères
openssl rand -hex 32
```

Copiez le résultat (exemple : `a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456`)

### 1.2 Ajouter les secrets dans Supabase

1. Ouvrir le [Supabase Dashboard](https://supabase.com/dashboard)
2. Sélectionner votre projet Factiony
3. Aller dans **Edge Functions**
4. Cliquer sur **Manage secrets**
5. Ajouter les deux secrets suivants :

```
RAWG_API_KEY=votre_clé_rawg_ici
WARM_TOP_COVERS_SECRET=le_secret_généré_étape_1.1
```

6. Cliquer sur **Save**

## Étape 2 : Initialiser le cache

⚠️ **IMPORTANT** : Ne pas exécuter depuis le navigateur. Utiliser un script serveur.

### Option A : Via cURL (Recommandé)

```bash
# Créer un fichier .env.local avec vos valeurs
cat > .env.local << EOF
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key
WARM_TOP_COVERS_SECRET=votre_secret_généré
EOF

# Charger les variables et exécuter
source .env.local

curl -X POST "${VITE_SUPABASE_URL}/functions/v1/warm-top-game-covers" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -H "X-Warm-Secret: ${WARM_TOP_COVERS_SECRET}" \
  -d '{"force": true, "limit": 75}'
```

### Option B : Via script Node.js

```bash
# 1. Copier le script exemple
cp admin/warm-covers.example.js admin/warm-covers.js

# 2. S'assurer que .env contient les variables nécessaires
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
# WARM_TOP_COVERS_SECRET=...

# 3. Exécuter le script
node admin/warm-covers.js --force --limit=75
```

### Résultat attendu

```
🚀 Lancement du rafraîchissement du cache...
   Force: true
   Limit: 75

✅ Rafraîchissement terminé!

📊 Résultats:
   Total: 75
   Traités: 75
   ✅ Mis à jour: 75
   💾 Déjà en cache: 0
   ❌ Échecs: 0

⏱️  Durée: 180.45s

🎉 Terminé avec succès!
```

**Durée estimée** : 3-5 minutes pour 75 jeux

## Étape 3 : Vérifier le cache

### Via SQL (Supabase Dashboard)

```sql
-- Vérifier le nombre de jeux en cache
SELECT COUNT(*) as total_cached FROM top_games_covers_cache;

-- Voir les 10 dernières entrées
SELECT slug, title, updated_at, version
FROM top_games_covers_cache
ORDER BY updated_at DESC
LIMIT 10;

-- Vérifier s'il y a des erreurs (aucune entry = tout OK)
SELECT slug, title
FROM top_games_covers_cache
WHERE public_url IS NULL OR public_url = '';
```

### Via l'application

1. Ouvrir Factiony en mode développement : `npm run dev`
2. Naviguer vers `/search`
3. La section "Les jeux les plus joués" doit s'afficher instantanément (<1s)
4. Les jaquettes doivent être visibles (pas de placeholder "No Image")

## Maintenance

### Rafraîchir le cache (mensuel recommandé)

```bash
# Mettre à jour uniquement les covers obsolètes (> 30 jours)
node admin/warm-covers.js

# Forcer la mise à jour de toutes les covers
node admin/warm-covers.js --force
```

### Rafraîchir un jeu spécifique

Si une jaquette est manquante ou incorrecte :

```sql
-- 1. Supprimer l'entrée en cache
DELETE FROM top_games_covers_cache WHERE slug = 'nom-du-jeu';

-- 2. Supprimer du Storage via Dashboard Supabase :
-- Storage → top-game-covers → top50 → nom-du-jeu.jpg (clic droit → Delete)

-- 3. Réexécuter le script pour 1 seul jeu
-- (modifier temporairement la limite dans la fonction)
```

## Dépannage

### Erreur 401 Unauthorized

- Vérifier que `WARM_TOP_COVERS_SECRET` est bien configuré dans Supabase
- Vérifier que le header `X-Warm-Secret` est envoyé correctement

### Erreur 500 "RAWG_API_KEY missing"

- Vérifier que `RAWG_API_KEY` est bien configuré dans Supabase Edge Functions Secrets
- Redéployer l'Edge Function si nécessaire

### Images ne s'affichent pas

1. Vérifier le cache DB :
   ```sql
   SELECT slug, public_url FROM top_games_covers_cache LIMIT 5;
   ```

2. Tester l'URL publique dans le navigateur
3. Vérifier les RLS policies du bucket `top-game-covers`

### Build échoue

Les warnings de build (duplicate keys, chunk size) sont normaux et n'affectent pas le fonctionnement.

## Sécurité

- ✅ `WARM_TOP_COVERS_SECRET` doit rester strictement confidentiel
- ✅ Ne jamais commiter `admin/warm-covers.js` dans Git (déjà ignoré)
- ✅ Ne jamais exposer la clé RAWG côté frontend
- ✅ Le script doit être exécuté uniquement depuis un environnement serveur sécurisé

## Documentation complète

Pour plus de détails, consulter [TOP_GAMES_CACHE_SYSTEM.md](./TOP_GAMES_CACHE_SYSTEM.md)
