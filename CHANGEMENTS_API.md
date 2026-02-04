# 🎮 Changements API Factiony - Firebase Integration

## ✅ Modifications effectuées

### 1. **API Firebase - Endpoint unique**

Tous les appels passent maintenant par votre Cloud Function Firebase :
```
https://europe-west1-factiony-1fc0f.cloudfunctions.net/getGame
```

**Header d'authentification :**
```javascript
headers: { "x-api-key": import.meta.env.VITE_FACTIONY_API_KEY }
```

### 2. **Affichage des jaquettes (cover_url)**

✅ **Classe CSS créée** (`src/index.css`) :
```css
.game-cover {
  width: 100%;
  aspect-ratio: 3/4;
  object-fit: cover;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  transition: transform 0.2s ease;
}

.game-cover:hover {
  transform: scale(1.03);
}
```

✅ **Fallback image** : Tous les composants utilisent `/placeholder.jpg` si `cover_url` est manquant
✅ **Priorité** : `cover_url` → `background_image` → `/placeholder.jpg`

### 3. **Page Découverte (DiscoverView.tsx)**

#### 🎯 Section "Jeux les mieux notés"

**Sans votes utilisateur :**
- Affiche 10 jeux populaires sélectionnés aléatoirement
- Pool de 30 jeux iconiques (Witcher 3, RDR2, Elden Ring, etc.)
- Sélection aléatoire à chaque chargement avec `Math.random()`

**Avec votes utilisateur (Supabase) :**
- Lit les notes moyennes depuis `game_stats`
- Tri par `average_rating` DESC
- Met à jour automatiquement via subscription temps réel

#### 🚀 Section "Jeux les plus attendus"

- GTA VI et Project 007 toujours affichés en premier
- Complété par des jeux à venir (Elder Scrolls VI, Hollow Knight Silksong, etc.)
- Fallback sur jeux populaires si aucun jeu futur disponible

**Skeleton loader** : Message "Chargement des jeux…" pendant le chargement initial

### 4. **Page Recherche (SearchView.tsx)**

✅ **Pagination** : 10 résultats par page
✅ **Debounce** : 300ms sur la saisie utilisateur
✅ **Comportement intelligent** :
- Requête < 3 caractères → Affiche jeux populaires
- Requête ≥ 3 caractères → Recherche via Firebase
✅ **Bouton "Afficher plus"** pour charger la page suivante
✅ **Message d'erreur** : "Aucun jeu trouvé. Vérifie le titre ou essaie un mot-clé plus court."

### 5. **Système de votes Supabase**

#### Migration créée : `20251014120000_game_ratings.sql`

**Tables :**

**`game_ratings`**
- Stocke les votes individuels des utilisateurs
- Contrainte : Un seul vote par utilisateur/jeu
- Rating entre 0 et 5

**`game_stats`**
- Stocke les statistiques agrégées
- Calculées automatiquement via trigger
- Moyenne et total des votes

**Sécurité RLS :**
- Lecture publique des notes et stats
- Création/modification uniquement des propres notes
- Trigger automatique pour recalcul des stats

#### API créée : `src/lib/api/ratings.ts`

```typescript
rateGame(gameId, gameSlug, rating)        // Voter pour un jeu
getUserRating(gameId)                     // Récupérer le vote de l'utilisateur
getGameStats(gameId)                      // Récupérer les stats d'un jeu
getTopRatedGames(limit)                   // Top jeux par note Factiony
subscribeToGameStats(callback)            // Écoute temps réel des changements
```

### 6. **Composants mis à jour**

#### GameCard.tsx
- ✅ Utilise la classe `.game-cover`
- ✅ Affiche `game.rating.toFixed(2)`
- ✅ Fallback `/placeholder.jpg`

#### GameDetailModal.tsx
- ✅ Utilise la classe `.game-cover`
- ✅ Affiche `game.rating.toFixed(2)`
- ✅ Affiche toutes les infos détaillées (description, plateformes, développeurs, éditeurs, date, note)

#### Tous les composants de vue
- ✅ Utilisent `cover_url` en priorité
- ✅ Fallback sur `background_image` puis `/placeholder.jpg`

### 7. **Nouvelles fonctions games.ts**

```typescript
fetchRandomPopularGames(count)  // Jeux aléatoires depuis un pool de 30 jeux
```

## 🔒 Sécurité

✅ **Aucune clé RAWG exposée** : Toutes les requêtes passent par Firebase
✅ **Header x-api-key** : Authentification sur toutes les requêtes
✅ **RLS Supabase** : Protection des votes utilisateurs
✅ **Variables d'environnement** : `VITE_FACTIONY_API_KEY` requis

## 📊 Fonctionnement du système de notes

1. **Note affichée** = `computeGlobalRating(rawgRating, factionyRating)`
   - Avec vote Factiony : 60% Factiony + 40% RAWG
   - Sans vote Factiony : 100% RAWG

2. **Mise à jour temps réel** :
   - Quand un utilisateur vote, trigger Supabase recalcule les stats
   - DiscoverView écoute les changements et met à jour l'affichage
   - Pas de rechargement de page nécessaire

3. **Fallback intelligent** :
   - S'il n'y a aucun vote → Jeux aléatoires populaires
   - Dès le premier vote → Affichage dynamique par note

## 🚀 Résultat

✅ **Build réussi** - Aucune erreur de compilation
✅ **100% Firebase** - Tous les appels passent par votre endpoint
✅ **Jaquettes ratio 3:4** - Style cohérent partout
✅ **Votes temps réel** - Mise à jour automatique sans rechargement
✅ **Pagination fonctionnelle** - 10 jeux par page
✅ **Cache Firebase/Firestore** - Performances optimales
✅ **Aucun module cassé** - Profils, listes, forum, premium intacts
