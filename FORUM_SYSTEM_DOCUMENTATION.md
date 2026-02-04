# Documentation du Système de Forum Factiony

## Vue d'ensemble

Le système de forum de Factiony a été complètement restructuré pour offrir une expérience organisée et riche en fonctionnalités. Chaque jeu dispose désormais de son propre forum structuré avec des sections officielles, des tags, une recherche avancée, et la possibilité pour les utilisateurs Premium de créer leurs propres sections.

## Architecture de la base de données

### Tables principales

#### `forum_sections`
Sections officielles identiques pour tous les jeux :
- Discussions générales 💬
- Gameplay & mécaniques 🎮
- Histoire, lore & univers 📖
- Aide & guides 🆘
- Actualités & mises à jour 📰
- Créations & communauté 🎨

#### `forum_custom_sections`
Sections personnalisées créées par les utilisateurs Premium :
- 1 section maximum par utilisateur Premium par jeu
- Le créateur peut modérer les threads de sa section
- Badge "Premium" visible

#### `forum_threads`
Discussions du forum :
- Appartiennent à une section (officielle ou custom)
- Peuvent être épinglées et verrouillées
- Support des spoilers
- Compteur de vues, réponses et likes
- Suivi de la dernière activité

#### `forum_posts`
Réponses aux threads :
- Support des spoilers
- Système de likes

#### `forum_thread_tags`
7 tags prédéfinis :
- spoiler ⚠️
- bug 🐛
- guide 📚
- build ⚙️
- multijoueur 👥
- solo 🎮
- mod 🔧

### Sécurité (RLS)

Toutes les tables ont Row Level Security activé :
- **Lecture publique** : Tout le monde peut consulter le forum
- **Création** : Utilisateurs authentifiés uniquement
- **Sections Premium** : Utilisateurs Premium uniquement (1 par jeu)
- **Modification/Suppression** : Auteurs uniquement
- **Modération** : Créateurs de sections custom sur leurs sections

## Fonctionnalités

### 1. Sections structurées
- 6 sections officielles fixes pour tous les jeux
- Sections Premium personnalisables
- Navigation rapide entre les sections

### 2. Système de tags
- 7 tags prédéfinis pour catégoriser les discussions
- Plusieurs tags possibles par thread
- Filtrage par tags dans la recherche

### 3. Recherche avancée
- Recherche plein texte dans les titres et contenus
- Filtrage par :
  - Section (officielle ou custom)
  - Tags
  - Auteur
- Tri par :
  - Pertinence (avec recherche)
  - Activité récente
  - Nombre de réponses

### 4. Gestion des spoilers
- Flag spoiler au niveau des threads et posts
- Masquage visuel avec bouton de révélation
- Icon d'avertissement dans les listes

### 5. Interactions sociales
- Likes sur threads et posts
- Réponses imbriquées
- Compteurs de vues, réponses, likes
- Indicateurs d'activité récente

### 6. Fonctionnalités Premium
- Création de sections personnalisées
- 1 section par utilisateur Premium par jeu
- Droits de modération sur sa section
- Badge Premium visible

## Composants

### `GameForum` (`src/components/GameForum.tsx`)
Composant principal du forum avec :
- Barre de recherche intégrée
- Filtres par tags
- Options de tri
- Liste des sections (officielles et custom)
- Liste des threads
- Vue détaillée d'un thread avec réponses
- Modals de création de thread et section

### API (`src/lib/api/forum.ts`)
Fonctions complètes pour :
- Gestion des sections (lecture, création custom)
- CRUD des threads et posts
- Recherche avancée
- Système de likes
- Incrémentation des vues

## Migration des données existantes

Les données de forum mockées précédentes ont été remplacées par le nouveau système. Tous les nouveaux threads sont créés dans les sections officielles ou custom.

## Utilisation

### Créer un thread
1. Cliquer sur "Nouveau sujet"
2. Sélectionner une section (automatique si une section est déjà sélectionnée)
3. Renseigner titre et contenu
4. (Optionnel) Ajouter des tags
5. (Optionnel) Marquer comme contenant des spoilers
6. Publier

### Créer une section Premium
1. Être utilisateur Premium
2. Ne pas avoir déjà créé de section pour ce jeu
3. Cliquer sur "Créer une section Premium"
4. Renseigner nom et description
5. Valider

### Rechercher
1. Utiliser la barre de recherche en haut du forum
2. (Optionnel) Sélectionner des tags
3. (Optionnel) Choisir le tri
4. Les résultats s'affichent automatiquement

## Performances

- Index sur `game_id`, `section_id`, `author_id`
- Index full-text sur `title` et `content` (français)
- Trigger automatique pour mise à jour des compteurs
- Fonction RPC optimisée pour la recherche

## Améliorations futures possibles

- Notifications pour les réponses
- Abonnement à des threads
- Modération avancée (signalement, bannissement)
- Sondages dans les threads
- Rich text editor pour le formatage
- Upload d'images dans les posts
- Système de réputation
- Recherche par date
- Export de threads
