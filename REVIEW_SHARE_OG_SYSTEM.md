# Review Share OG System Implementation

## Objectif
Permettre le partage de critiques avec des previews riches (OG meta tags) sur X/Facebook/WhatsApp et corriger le problème "Loading..." dans le partage iOS.

## Modifications apportées

### A) Application Frontend

#### 1. ShareReviewButton Component (`src/components/ShareReviewButton.tsx`)

**Problèmes corrigés:**
- Protection contre le partage avec des données "Loading..."
- Construction des textes de partage uniquement au moment du clic
- Détection mobile vs desktop pour le partage natif
- URL de partage correcte pour les OG meta tags

**Changements clés:**
```typescript
// Props optionnelles
interface ShareReviewButtonProps {
  reviewId: string;
  gameId?: string | number;
  gameName?: string;        // Optionnel
  username?: string;        // Optionnel
  rating?: number;          // Optionnel
  className?: string;
}

// Vérification des données
const canShare = !!gameName && gameName !== "Loading..." && rating != null;

// URL de partage (OG-ready)
const shareUrl = `https://factiony.com/share/review/${reviewId}`;

// Construction des textes au clic (pas au render)
const buildShareTitle = () => ...;
const buildShareText = () => ...;

// Détection mobile pour navigator.share
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Bouton désactivé si données non prêtes
<button disabled={!canShare} ...>
```

**URLs mises à jour:**
- Partage: `https://factiony.com/share/review/{reviewId}`
- Image OG: `https://factiony.com/og/review/{reviewId}.png`

#### 2. GameDetailModal Component (`src/components/GameDetailModal.tsx`)

Ajout des props nécessaires à ShareReviewButton:
```tsx
<ShareReviewButton
  reviewId={review.id}
  gameId={game.id}
  gameName={game.name}
  username={review.username}
  rating={review.rating}
/>
```

### B) Netlify Edge Functions

#### 1. Configuration (`netlify.toml`)

```toml
[build]
  publish = "dist"
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[edge_functions]]
  function = "share-review"
  path = "/share/review/*"

[[edge_functions]]
  function = "og-review"
  path = "/og/review/*"
```

#### 2. share-review Edge Function (`netlify/edge-functions/share-review.ts`)

**Rôle:** Servir une page HTML avec les meta tags OG pour le partage social

**Fonctionnement:**
1. Extrait l'ID de la review depuis l'URL
2. Génère le HTML avec les meta tags OG complets:
   - `og:type`, `og:url`, `og:title`, `og:description`
   - `og:image`, `og:image:width`, `og:image:height`
   - `twitter:card`, `twitter:image`
3. Redirige automatiquement vers la review réelle via:
   - Meta refresh: `<meta http-equiv="refresh" content="0;url=...">`
   - JavaScript: `window.location.replace(...)`

**URLs générées:**
- Image OG: `https://factiony.com/og/review/{reviewId}.png`
- Redirection: `https://factiony.com/review/{reviewId}`

#### 3. og-review Edge Function (`netlify/edge-functions/og-review.ts`)

**Rôle:** Servir l'image OG pour les previews sociales

**PHASE 1 - Placeholder:**
- Fetch l'image placeholder depuis `/og-placeholder.png`
- Retourne l'image avec les headers appropriés:
  - `Content-Type: image/png`
  - `Cache-Control: public, max-age=3600`
  - `X-Review-ID: {reviewId}` (pour le debug)

**PHASE 2 - À venir:**
- Génération dynamique d'image avec:
  - Jaquette du jeu
  - Note de l'utilisateur
  - Extrait de la critique
  - Nom d'utilisateur

#### 4. Placeholder Image (`public/og-placeholder.png`)

Image de fallback 1200x630px générée avec ImageMagick:
- Fond gris foncé (#1a1a1a)
- Logo "Factiony" en blanc
- Sous-titre "Critique de jeu vidéo"
- 28KB

### C) Build & Déploiement

**Build réussi:** ✓ 15.95s
**Taille bundle:** 1,863.93 kB (427.17 kB gzipped)

**Fichiers ajoutés/modifiés:**
- ✓ `src/components/ShareReviewButton.tsx` (modifié)
- ✓ `src/components/GameDetailModal.tsx` (modifié)
- ✓ `netlify.toml` (créé)
- ✓ `netlify/edge-functions/share-review.ts` (créé)
- ✓ `netlify/edge-functions/og-review.ts` (créé)
- ✓ `public/og-placeholder.png` (créé)

## Flow de Partage

### Desktop
1. User clique "Partager" → Menu custom s'affiche
2. User choisit plateforme (X, Facebook, WhatsApp, etc.)
3. URL partagée: `https://factiony.com/share/review/{reviewId}`

### Mobile (iOS/Android)
1. User clique "Partager" → `navigator.share()` natif
2. Partage avec URL: `https://factiony.com/share/review/{reviewId}`
3. Pas de "Loading..." car vérification `canShare`

### Réseaux Sociaux (X, Facebook, WhatsApp)
1. Bot crawl l'URL: `https://factiony.com/share/review/{reviewId}`
2. Edge function `share-review` retourne HTML avec OG tags
3. Bot lit les meta tags et récupère l'image: `https://factiony.com/og/review/{reviewId}.png`
4. Edge function `og-review` retourne l'image placeholder
5. Preview riche s'affiche avec l'image

### Utilisateur clique sur le lien partagé
1. Browser charge: `https://factiony.com/share/review/{reviewId}`
2. HTML contient meta refresh + JavaScript redirect
3. Redirection immédiate vers: `https://factiony.com/review/{reviewId}`
4. Application React charge et affiche la review

## Tests à effectuer après déploiement

### 1. Test des routes
```bash
# Test share route (doit retourner HTML avec OG tags)
curl -I https://factiony.com/share/review/123

# Test OG image (doit retourner image/png)
curl -I https://factiony.com/og/review/123.png
```

### 2. Validation OG tags
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- Twitter Card Validator: https://cards-dev.twitter.com/validator
- LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/

### 3. Test mobile
- iOS Safari: vérifier que "Loading..." n'apparaît plus
- Android Chrome: tester le partage natif
- WhatsApp: vérifier la preview de lien

### 4. Test desktop
- Menu de partage custom doit s'afficher
- Copier le lien doit fonctionner
- Partage X/Facebook/WhatsApp doit ouvrir les bons URLs

## Prochaines étapes (PHASE 2)

### Génération dynamique d'image OG

**Données nécessaires:**
1. Récupérer la review depuis Supabase dans `og-review.ts`
2. Obtenir les infos du jeu (nom, jaquette)
3. Obtenir les infos utilisateur (nom, avatar)

**Génération d'image:**
Plusieurs options:
1. **Puppeteer/Playwright:** Render HTML to image
2. **Canvas API (Deno):** Draw image programmatically
3. **Service externe:** Vercel OG, Cloudinary, etc.
4. **Pre-rendering:** Generate images at review creation time

**Recommandation:** Canvas API avec Deno pour performance et contrôle

**Template d'image:**
```
┌─────────────────────────────────────────┐
│  [Game Cover]  │  FACTIONY              │
│    300x400     │  Username              │
│                │  ⭐⭐⭐⭐⭐ 5/5         │
│                │                         │
│                │  "Review excerpt..."    │
└─────────────────────────────────────────┘
       1200 x 630 pixels
```

## Notes importantes

1. **Cache:** Les images OG sont cachées 1h (`max-age=3600`)
2. **Fallback:** Si erreur, placeholder est toujours servi
3. **Sécurité:** Pas d'injection possible (review ID validé)
4. **Performance:** Edge functions = latence minimale
5. **SEO:** Meta tags améliorent le partage social et le référencement
