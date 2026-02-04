# Feature: Review Sharing avec Aperçu Open Graph

## Vue d'ensemble

Cette fonctionnalité permet aux utilisateurs de partager leurs critiques de jeux avec un aperçu visuel style Letterboxd sur les réseaux sociaux (WhatsApp, iMessage, X/Twitter, LinkedIn, etc.).

## Composants Implémentés

### 1. Route Publique `/review/:id`
- **Fichier**: `src/pages/PublicReview.tsx`
- Page publique accessible sans authentification
- Affiche une critique individuelle avec:
  - Avatar et nom de l'utilisateur (avec badges vérified/premium)
  - Jaquette du jeu
  - Note en étoiles
  - Texte de la critique
  - Fond dégradé avec l'image du jeu
  - Bouton de partage

### 2. Meta Tags Open Graph
- Intégrés dans `PublicReview.tsx` via `react-helmet-async`
- Tags implémentés:
  - `og:title`: `{username} • {gameName} • {rating}/5`
  - `og:description`: Extrait de la critique (180 caractères max)
  - `og:url`: URL canonique de la critique
  - `og:image`: Image OG générée dynamiquement
  - `twitter:card`: Format summary_large_image

### 3. Edge Function pour Image OG
- **Fonction**: `og-review-image`
- **URL**: `{SUPABASE_URL}/functions/v1/og-review-image?id={reviewId}`
- Génère une image SVG 1200x630 contenant:
  - Fond dégradé sombre
  - Jaquette du jeu à gauche
  - Nom du jeu
  - Username de l'auteur
  - Note avec étoiles
  - Extrait de la critique (3-4 lignes)
  - Logo Factiony
- Format: SVG (compatible avec tous les réseaux sociaux)
- Cache: 24 heures

### 4. Bouton de Partage
- **Composant**: `src/components/ShareReviewButton.tsx`
- Fonctionnalités:
  - Utilise l'API native `navigator.share` sur mobile
  - Menu de partage desktop avec:
    - Copie du lien
    - WhatsApp
    - X (Twitter)
    - LinkedIn
  - Feedback visuel (animation "Copied!")

### 5. Intégration dans GameDetailModal
- Bouton de partage affiché après qu'un utilisateur ait soumis sa critique
- Apparaît à côté du bouton "Modifier"
- Nécessite que la critique ait un ID

## API

### Nouvelle API: `src/lib/api/reviews.ts`

#### `getPublicReview(reviewId: string)`
Récupère une critique publique avec:
- Données de la critique
- Informations utilisateur (username, avatar, badges)
- Informations du jeu (nom, cover, background)
- Respect de la vie privée (retourne null si profil privé)

#### `getUserReviews(userId: string, limit: number)`
Récupère les critiques d'un utilisateur
- Filtrage des profils privés
- Enrichissement avec données jeu/utilisateur

## Modifications Principales

### 1. `src/main.tsx`
```typescript
// Ajout de React Router et Helmet Provider
<HelmetProvider>
  <BrowserRouter>
    <Routes>
      <Route path="/review/:id" element={<PublicReview />} />
      <Route path="*" element={<App />} />
    </Routes>
  </BrowserRouter>
</HelmetProvider>
```

### 2. `src/components/GameDetailModal.tsx`
- Import du `ShareReviewButton`
- Affichage conditionnel du bouton de partage après sauvegarde d'une critique

## Sécurité et Confidentialité

- Les critiques de profils privés ne sont pas accessibles publiquement
- Vérification `is_private` dans `getPublicReview()`
- Pas d'exposition de données sensibles
- Edge Function utilise `SUPABASE_SERVICE_ROLE_KEY` pour accès sécurisé

## Utilisation

### Pour l'utilisateur:
1. Noter et critiquer un jeu dans `GameDetailModal`
2. Cliquer sur "Share Review" après avoir soumis
3. Choisir la méthode de partage (native ou menu desktop)

### Pour le destinataire:
1. Recevoir le lien `/review/{id}`
2. Voir l'aperçu visuel dans l'application de messagerie
3. Cliquer pour voir la critique complète

## URLs Importantes

- Page publique critique: `{origin}/review/{reviewId}`
- Image OG: `{SUPABASE_URL}/functions/v1/og-review-image?id={reviewId}`

## Dépendances Ajoutées

- `react-helmet-async`: ^2.0.0
- `react-router-dom`: ^6.x

## Tests

✅ Build réussi sans erreurs
✅ Route publique configurée
✅ Edge Function déployée
✅ Meta tags Open Graph configurés
✅ Bouton de partage intégré

## Améliorations Futures Possibles

1. Générer une vraie image PNG au lieu de SVG (avec satori/sharp dans Deno)
2. Ajouter plus d'options de partage (Facebook, Reddit, etc.)
3. Analytics pour tracker les partages
4. Prévisualisation de l'aperçu OG dans l'interface
5. Personnalisation du message de partage par réseau social
