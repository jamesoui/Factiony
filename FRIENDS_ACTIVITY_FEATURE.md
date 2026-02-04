# Fonctionnalité : Actualités des Amis

## Vue d'ensemble

Une nouvelle section "Les dernières actualités de vos amis" a été ajoutée à la page d'accueil. Elle affiche les dernières interactions des amis de l'utilisateur avec les jeux (notes, critiques, commentaires, likes).

## Emplacement

Cette section est affichée entre :
- **"Les jeux en tendance"** (avant)
- **"Les jeux les plus attendus"** (après)

Elle apparaît uniquement pour les utilisateurs connectés qui suivent d'autres utilisateurs.

## Architecture

### 1. Base de données

#### Table `user_activities`
```sql
CREATE TABLE user_activities (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  game_id text,
  game_name text,
  game_image text,
  activity_type text CHECK (activity_type IN ('rating', 'review', 'comment', 'like', 'follow_game')),
  activity_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

#### Types d'activités supportés :
- `rating` - L'utilisateur a noté un jeu
- `review` - L'utilisateur a écrit une critique
- `comment` - L'utilisateur a commenté un jeu
- `like` - L'utilisateur a aimé un jeu
- `follow_game` - L'utilisateur suit un jeu

#### Trigger automatique
Lorsqu'un utilisateur note un jeu dans `game_ratings`, une activité est automatiquement créée dans `user_activities`.

### 2. API

#### Fonction `get_friends_activities(p_user_id, p_limit)`
Récupère les activités des amis d'un utilisateur :
- Filtre les utilisateurs suivis via la table `follows`
- Exclut les comptes privés
- Trie par date décroissante
- Retourne le nom d'utilisateur, avatar, et détails de l'activité

### 3. Composants React

#### `FriendsActivitySection.tsx`
Composant principal qui affiche le carrousel horizontal d'activités :

**Fonctionnalités :**
- Chargement automatique au montage
- États de chargement avec skeletons
- Message d'état vide si aucune activité
- Carrousel horizontal scrollable
- Cartes d'activité cliquables
- Support multi-langue (fr/en)

**Props :**
```typescript
interface FriendsActivitySectionProps {
  onGameClick?: (gameId: string) => void;
  onUserClick?: (userId: string) => void;
}
```

#### Module `activities.ts`
Fonctions utilitaires pour gérer les activités :

- `getFriendsActivities(limit)` - Récupère les activités
- `createActivity(...)` - Crée une nouvelle activité
- `enrichActivitiesWithGameData(activities, locale)` - Enrichit avec les images de jeux
- `getActivityMessage(activity, locale)` - Retourne le message d'activité traduit
- `getActivityDetails(activity, locale)` - Retourne les détails (note, extrait de critique)
- `formatActivityDate(dateString, locale)` - Formate la date relative

## Design

### Affichage

Chaque carte d'activité contient :
1. **Image du jeu** (en haut, 128px de hauteur)
2. **Avatar de l'utilisateur** (rond, 40px)
3. **Nom d'utilisateur** (cliquable, hover orange)
4. **Action** ("a noté", "a critiqué", etc.)
5. **Nom du jeu** (cliquable, texte orange)
6. **Détails** :
   - Pour les notes : étoile jaune + note/5
   - Pour les critiques : extrait du texte (2 lignes max)
7. **Date relative** ("Il y a 2h", "Il y a 3j", etc.)

### Style

- Fond : `bg-gray-800`
- Largeur fixe : `320px` par carte
- Carrousel horizontal avec scroll masqué
- Effet hover : `bg-gray-750`
- Dégradé sur l'image : de transparent à `gray-800`

## Sécurité (RLS)

### Politiques appliquées :
1. **Création** : Utilisateurs peuvent créer leurs propres activités
2. **Lecture personnelle** : Utilisateurs peuvent voir leurs propres activités
3. **Lecture amis** : Utilisateurs peuvent voir les activités de leurs amis
4. **Lecture publique** : Tout le monde peut voir les activités des comptes non-privés

## Flux utilisateur

### Scénario 1 : Utilisateur connecté avec amis
1. L'utilisateur se connecte
2. Va sur la page d'accueil
3. Voit la section "Les dernières actualités de vos amis"
4. Peut cliquer sur :
   - L'image du jeu → Ouvre la fiche du jeu
   - Le nom du jeu → Ouvre la fiche du jeu
   - L'avatar → Ouvre le profil de l'ami
   - Le nom d'utilisateur → Ouvre le profil de l'ami

### Scénario 2 : Utilisateur connecté sans amis
1. L'utilisateur se connecte
2. Va sur la page d'accueil
3. Voit un message : "Aucune activité récente de vos amis"
4. Encouragement à suivre d'autres utilisateurs

### Scénario 3 : Utilisateur non connecté
1. L'utilisateur n'est pas connecté
2. Va sur la page d'accueil
3. La section n'apparaît pas (return null)

## Cas d'usage

### Création automatique d'activités

**Quand un utilisateur note un jeu :**
```typescript
// Automatique via trigger SQL
INSERT INTO game_ratings (user_id, game_id, rating, review_text)
VALUES ('user-uuid', 'game-123', 4.5, 'Excellent jeu !');

// ↓ Trigger crée automatiquement :
INSERT INTO user_activities (
  user_id, game_id, game_name, activity_type, activity_data
) VALUES (
  'user-uuid', 'game-123', 'The Witcher 3', 'rating',
  '{"rating": 4.5, "review_text": "Excellent jeu !"}'::jsonb
);
```

### Création manuelle d'activités

**Pour d'autres types d'interactions :**
```typescript
import { createActivity } from '@/lib/api/activities';

// Liker un jeu
await createActivity(
  'game-123',
  'The Witcher 3',
  'https://image-url.jpg',
  'like',
  {}
);

// Suivre un jeu
await createActivity(
  'game-456',
  'Cyberpunk 2077',
  'https://image-url.jpg',
  'follow_game',
  {}
);
```

## Traductions

### Français
- Section : "Les dernières actualités de vos amis"
- Description : "Découvrez ce que vos amis pensent des derniers jeux"
- Actions :
  - `rating` → "a noté"
  - `review` → "a critiqué"
  - `comment` → "a commenté"
  - `like` → "a aimé"
  - `follow_game` → "suit maintenant"

### Anglais
- Section : "Your Friends' Latest Activity"
- Description : "See what your friends think about the latest games"
- Actions :
  - `rating` → "rated"
  - `review` → "reviewed"
  - `comment` → "commented on"
  - `like` → "liked"
  - `follow_game` → "is now following"

## Performance

### Optimisations :
1. **Limite par défaut** : 15 activités maximum
2. **Index sur les colonnes** :
   - `user_id` pour filtrage rapide
   - `created_at` pour tri chronologique
   - Composite `(user_id, created_at)` pour les feeds d'amis
3. **Enrichissement lazy** : Les images de jeux sont chargées uniquement si manquantes
4. **Cache** : Les données de jeux utilisent le système de cache existant

### Requête SQL optimisée :
```sql
SELECT ua.*, u.username, u.avatar_url
FROM user_activities ua
INNER JOIN users u ON ua.user_id = u.id
WHERE ua.user_id IN (
  SELECT friend_id FROM follows WHERE user_id = ?
)
AND (u.is_private = false OR u.is_private IS NULL)
ORDER BY ua.created_at DESC
LIMIT 20;
```

## Tests

### Tests manuels recommandés :

1. **Test de base**
   - Créer 2 utilisateurs
   - User A suit User B
   - User B note un jeu
   - Vérifier que User A voit l'activité de User B

2. **Test de confidentialité**
   - User B met son compte en privé
   - Vérifier que User A ne voit plus les activités de User B

3. **Test de performance**
   - Créer 100 activités
   - Vérifier que le chargement est rapide (< 500ms)

4. **Test multi-langue**
   - Changer la langue en anglais
   - Vérifier que les messages d'activité sont traduits

## Prochaines améliorations

- [ ] Filtrer par type d'activité (notes, critiques, etc.)
- [ ] Réaction rapide aux activités (like, commentaire)
- [ ] Notification en temps réel des nouvelles activités
- [ ] Pagination pour charger plus d'activités
- [ ] Statistiques d'engagement (vues, interactions)
- [ ] Export des activités en JSON
