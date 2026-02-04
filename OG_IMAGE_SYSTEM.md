# Système de génération d'images Open Graph

## 🚨 UPDATED SYSTEM

**This documentation describes the OLD Supabase-based system.**

**For the NEW Netlify Edge Function implementation, see:**
→ [`OG_IMAGE_DYNAMIC_GENERATION.md`](./OG_IMAGE_DYNAMIC_GENERATION.md)

The new system uses Netlify Edge Functions (Deno) instead of Supabase Edge Functions.

---

## Vue d'ensemble (Ancien système)

Le système génère automatiquement des images Open Graph (1200x630 PNG) pour les critiques de jeux sur Factiony, optimisées pour le partage sur les réseaux sociaux.

## Architecture

### 1. Edge Function `og-review-image`

**URL :** `/functions/v1/og-review-image?id={reviewId}`

**Technologie :**
- **Satori** : Convertit du JSX-like en SVG
- **Resvg** : Convertit le SVG en PNG haute qualité

**Processus :**
1. Récupère la critique depuis `game_ratings`
2. Récupère les infos du jeu depuis `games`
3. Récupère le username depuis `users`
4. Vérifie que le compte n'est pas privé
5. Génère l'image avec Satori + Resvg
6. Retourne un PNG 1200x630

**Design de l'image :**
```
┌─────────────────────────────────────────────────┐
│ Fond: #0f172a (bleu sombre)    Padding: 60px   │
│                                                  │
│  ┌────────┐  Nom du jeu (48px, bold, blanc)    │
│  │        │                                      │
│  │ Cover  │  Note: X/10 (56px, bold, #facc15)  │
│  │ 360x500│                                      │
│  │        │  "Extrait de la critique..."        │
│  │        │  (28px, #cbd5e1, max 120 chars)    │
│  └────────┘                                      │
│             @username (24px, #94a3b8)           │
│                                                  │
│  factiony.com          Factiony                 │
│  (20px, #64748b)      (32px, #f97316)          │
└─────────────────────────────────────────────────┘
```

### 2. Page de partage `/share/review/:id`

**URL :** `/share/review/:id`

**Fonctionnalités :**
- Affiche les meta tags Open Graph
- Utilise l'image générée par l'edge function
- Redirige automatiquement vers `/review/:id` après 500ms

**Meta tags inclus :**
```html
<!-- Open Graph (Facebook, LinkedIn) -->
<meta property="og:title" content="Critique de {game} par @{user}" />
<meta property="og:description" content="{excerpt}" />
<meta property="og:image" content="/functions/v1/og-review-image?id={id}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="/review/{id}" />
<meta property="og:type" content="article" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Critique de {game} par @{user}" />
<meta name="twitter:description" content="{excerpt}" />
<meta name="twitter:image" content="/functions/v1/og-review-image?id={id}" />
```

### 3. Bouton de téléchargement

Le composant `ShareReviewButton` inclut maintenant un bouton "Télécharger l'image" dans le menu de partage.

**Fonctionnement :**
1. Fetch l'image depuis l'edge function
2. Crée un Blob
3. Télécharge avec le nom `factiony-review-{id}.png`
4. Track l'événement dans l'analytics

## Utilisation

### Pour les utilisateurs

**Partager avec image OG :**
1. Partager le lien `/share/review/{id}` sur les réseaux sociaux
2. L'image s'affiche automatiquement dans l'aperçu

**Télécharger l'image :**
1. Cliquer sur le bouton "Partager" d'une critique
2. Sélectionner "Télécharger l'image"
3. L'image PNG est téléchargée localement

### Pour les développeurs

**Générer manuellement une image :**
```bash
curl "https://factiony.com/functions/v1/og-review-image?id={reviewId}" > review.png
```

**Tester l'aperçu Open Graph :**
- Facebook : https://developers.facebook.com/tools/debug/
- Twitter : https://cards-dev.twitter.com/validator
- LinkedIn : https://www.linkedin.com/post-inspector/

## Performance

**Cache :**
- Header `Cache-Control: public, max-age=86400` (24 heures)
- Les images sont mises en cache par les CDN et les réseaux sociaux

**Génération :**
- Temps moyen : ~500-800ms
- Dépend de la latence réseau pour charger la cover du jeu

## Sécurité

**Protection des comptes privés :**
- Les reviews de comptes privés retournent 403 Forbidden
- Pas d'image générée pour les comptes privés

**Rate limiting :**
- Géré par Supabase Edge Functions
- Pas de limitation spécifique implémentée côté fonction

## Données requises

Pour qu'une image soit générée, il faut :
- ✅ Review existante dans `game_ratings`
- ✅ User non-privé dans `users`
- ✅ Game dans `games` (optionnel, fallback sur "Unknown Game")
- ✅ Cover image (optionnel, affiche un placeholder gris)

## Dépendances npm

Les packages suivants sont utilisés dans l'edge function :
```json
{
  "satori": "0.10.9",
  "@resvg/resvg-js": "2.6.0",
  "@supabase/supabase-js": "2.58.0"
}
```

## Maintenance

### Problèmes courants

**L'image ne s'affiche pas :**
1. Vérifier que la review existe
2. Vérifier que le compte n'est pas privé
3. Vérifier les logs de l'edge function

**La cover du jeu ne s'affiche pas :**
1. Vérifier l'URL de la cover dans `games`
2. Vérifier que l'URL est accessible (pas de CORS)

**Erreur lors de la génération :**
1. Vérifier les logs : `supabase functions logs og-review-image`
2. Vérifier que Satori et Resvg sont disponibles

### Modifier le design

Pour modifier l'apparence de l'image, éditer le template Satori dans :
```
supabase/functions/og-review-image/index.ts
```

Puis redéployer :
```bash
supabase functions deploy og-review-image
```

## Exemples d'URLs

**Générer l'image :**
```
https://factiony.com/functions/v1/og-review-image?id=123e4567-e89b-12d3-a456-426614174000
```

**Page de partage :**
```
https://factiony.com/share/review/123e4567-e89b-12d3-a456-426614174000
```

**Page de la critique :**
```
https://factiony.com/review/123e4567-e89b-12d3-a456-426614174000
```
