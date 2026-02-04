# Firebase Cloud Function - CORS Fix

## 🔧 Problème résolu

Le préflight OPTIONS échouait avec un 503, empêchant les requêtes GET de s'exécuter.

## ✅ Correctifs appliqués

### 1. Handler OPTIONS (lignes 39-44)

```javascript
if (req.method === 'OPTIONS') {
  setCorsHeaders(res, origin);
  res.status(204).send('');
  return;
}
```

**Pourquoi :** Le préflight OPTIONS doit répondre 204 **avant** toute vérification d'authentification.

### 2. Fonction setCorsHeaders (lignes 28-36)

```javascript
function setCorsHeaders(res, origin) {
  const allowedOrigin = isOriginAllowed(origin) ? origin : 'https://factiony.com';

  res.set('Access-Control-Allow-Origin', allowedOrigin);
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'x-factiony-key, content-type, authorization');
  res.set('Access-Control-Max-Age', '86400');
  res.set('Vary', 'Origin');
}
```

**Headers CORS :**
- `Access-Control-Allow-Origin` : Retourne l'origin de la requête si elle est dans l'allowlist
- `Access-Control-Allow-Methods` : GET, OPTIONS uniquement
- `Access-Control-Allow-Headers` : Autorise `x-factiony-key` (requis par le frontend)
- `Access-Control-Max-Age` : Cache le préflight pendant 24h
- `Vary: Origin` : Indique que la réponse varie selon l'origin

### 3. Allowlist d'origins (lignes 12-26)

```javascript
function isOriginAllowed(origin) {
  if (!origin) return false;

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (origin.endsWith('.webcontainer-api.io')) {
    return true;
  }

  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return true;
  }

  return false;
}
```

**Origins autorisées :**
- `https://factiony.com`
- `https://www.factiony.com`
- `*.webcontainer-api.io` (environnement Bolt preview)
- `localhost` et `127.0.0.1` (développement local)

### 4. Ordre d'exécution

```
1. OPTIONS arrive → setCorsHeaders → 204 → return (PAS d'auth check)
2. GET arrive → setCorsHeaders → vérif x-factiony-key → proxy RAWG
```

**Critique :** Le check d'authentification (ligne 51-54) se fait **après** la gestion de CORS, pas avant.

## 📦 Déploiement

### Prérequis

```bash
npm install -g firebase-tools
firebase login
```

### Structure requise

```
project-root/
├── firebase-functions/
│   ├── apiFunction.js       ← Ce fichier
│   ├── package.json
│   └── README.md
└── firebase.json
```

### package.json pour la fonction

Créer `firebase-functions/package.json` :

```json
{
  "name": "factiony-cloud-functions",
  "version": "1.0.0",
  "engines": {
    "node": "18"
  },
  "dependencies": {
    "firebase-functions": "^5.0.0",
    "firebase-admin": "^12.0.0",
    "axios": "^1.6.0"
  }
}
```

### firebase.json à la racine

Créer `firebase.json` à la racine du projet :

```json
{
  "functions": {
    "source": "firebase-functions",
    "runtime": "nodejs18"
  }
}
```

### Configuration de la clé RAWG

```bash
firebase functions:config:set rawg.key="VOTRE_CLE_RAWG_ICI"
```

### Déployer

```bash
cd /tmp/cc-agent/59735240/project/firebase-functions
npm install
cd ..
firebase deploy --only functions:apiFunction
```

## 🧪 Test

### Préflight OPTIONS

```bash
curl -X OPTIONS \
  -H "Origin: https://factiony.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: x-factiony-key" \
  https://europe-west1-factiony-1fc0f.cloudfunctions.net/apiFunction/games \
  -v
```

**Réponse attendue :**
```
< HTTP/2 204
< access-control-allow-origin: https://factiony.com
< access-control-allow-methods: GET, OPTIONS
< access-control-allow-headers: x-factiony-key, content-type, authorization
< access-control-max-age: 86400
< vary: Origin
```

### Requête GET

```bash
curl -X GET \
  -H "Origin: https://factiony.com" \
  -H "x-factiony-key: FACTIONY_KEY_35d39805f838ac70aa9dca01e4e3ff0764e638dd341728f4" \
  "https://europe-west1-factiony-1fc0f.cloudfunctions.net/apiFunction/games?page_size=5" \
  -v
```

**Réponse attendue :**
```
< HTTP/2 200
< access-control-allow-origin: https://factiony.com
< content-type: application/json
< vary: Origin
{
  "count": ...,
  "results": [...]
}
```

## 🔒 Sécurité

✅ **OPTIONS ne vérifie PAS x-factiony-key** (standard CORS)
✅ **GET vérifie x-factiony-key** (sécurité maintenue)
✅ **Allowlist d'origins** (protection contre les origins non autorisées)
✅ **Vary: Origin** (évite les problèmes de cache)
✅ **Pas de wildcard `*`** (sécurité renforcée)

## 📝 Modifications par rapport à l'original

| Avant | Après |
|-------|-------|
| 503 sur OPTIONS | 204 sur OPTIONS |
| Pas de CORS headers | CORS headers sur OPTIONS et GET |
| Auth check avant CORS | CORS avant auth check |
| Pas d'allowlist | Allowlist d'origins |
| Pas de Vary header | Vary: Origin |

## ⚠️ Important

- Le préflight OPTIONS **ne doit jamais** vérifier l'authentification
- Les headers CORS doivent être envoyés **avant** toute erreur 401/403/500
- L'allowlist doit être maintenue si vous ajoutez de nouveaux domaines
