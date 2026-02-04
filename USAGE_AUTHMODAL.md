# AuthModal - Guide d'utilisation

## Vue d'ensemble
Le composant `AuthModal` permet de protéger les actions réservées aux utilisateurs connectés en affichant un popup d'authentification.

## Utilisation dans les composants

### 1. Import du hook
```tsx
import { useAuthGuard } from '../contexts/AuthGuardContext'
```

### 2. Utilisation dans un composant
```tsx
const MyComponent = () => {
  const { requireAuth } = useAuthGuard()

  const handleLike = () => {
    // Vérifie si l'utilisateur est connecté
    if (!requireAuth()) return

    // Code à exécuter si connecté
    console.log('Like ajouté!')
  }

  return (
    <button onClick={handleLike}>
      Liker
    </button>
  )
}
```

## Actions à protéger

Voici les actions qui doivent afficher le popup si l'utilisateur n'est pas connecté:

### Actions sociales
- Liker un jeu/post/commentaire
- Commenter
- Noter un jeu
- Partager
- Suivre un utilisateur

### Actions de gestion
- Ajouter à une liste
- Créer une liste
- Marquer comme joué/en cours/terminé
- Ajouter au journal
- Modifier son profil

### Actions premium
- Accéder au forum premium
- Créer une discussion
- Uploader une bannière personnalisée

## Exemple complet

```tsx
import React from 'react'
import { ThumbsUp } from 'lucide-react'
import { useAuthGuard } from '../contexts/AuthGuardContext'

const GameCard = ({ game }) => {
  const { requireAuth } = useAuthGuard()
  const [isLiked, setIsLiked] = React.useState(false)

  const handleLike = () => {
    // Affiche le popup si pas connecté
    if (!requireAuth()) return

    // L'utilisateur est connecté, on peut liker
    setIsLiked(!isLiked)
  }

  const handleAddToList = () => {
    if (!requireAuth()) return

    // Logique pour ajouter à une liste
  }

  const handleRate = () => {
    if (!requireAuth()) return

    // Logique pour noter le jeu
  }

  return (
    <div>
      <h3>{game.title}</h3>
      <button onClick={handleLike}>
        <ThumbsUp className={isLiked ? 'fill-current' : ''} />
      </button>
      <button onClick={handleAddToList}>Ajouter à ma liste</button>
      <button onClick={handleRate}>Noter</button>
    </div>
  )
}
```

## Fonctionnalités du popup

- **Deux onglets**: Connexion et Inscription
- **Validation**: Email, mot de passe (6 caractères min), pseudo unique
- **Erreurs claires**: Affichage des messages d'erreur Supabase
- **Design cohérent**: Suit la charte graphique Factiony
- **Fermeture**: Bouton X en haut à droite

## Backend

Le composant utilise Supabase pour:
1. Vérifier l'unicité du pseudo
2. Créer le compte auth
3. Insérer l'utilisateur dans la table `users`
4. Gérer les erreurs d'authentification
