# Pages SEO par Catégorie

## Vue d'ensemble

Système de pages SEO indexables pour les grandes catégories de jeux, basé sur le composant de recherche existant sans modification de l'interface.

## Routes disponibles

Les pages sont accessibles via `/top/:tagSlug` :

- `/top/battle-royale` - Meilleurs jeux Battle Royale
- `/top/rpg` - Meilleurs jeux RPG
- `/top/fps` - Meilleurs jeux FPS
- `/top/coop` - Meilleurs jeux Coopératif
- `/top/survival` - Meilleurs jeux Survie

## Mapping slug → tag

| Slug URL | Tag API | Nom affiché |
|----------|---------|-------------|
| `battle-royale` | `battle-royale` | Battle Royale |
| `rpg` | `rpg` | RPG |
| `fps` | `first-person-shooter` | FPS |
| `coop` | `co-op` | Coopératif |
| `survival` | `survival` | Survie |

## Fonctionnement

### Comportement

1. La route charge le composant `SearchView` existant
2. Le filtre correspondant au slug est automatiquement appliqué via `initialFilters`
3. Les résultats sont triés par note (comportement par défaut de SearchView avec filtre)
4. Aucune modification du design ou des cartes de jeu

### SEO dynamique

Chaque page génère automatiquement :

**Title**
```
Meilleurs jeux {TagName} | Classement et avis joueurs
```

**Meta Description**
```
Découvrez les meilleurs jeux {TagName} selon les notes et critiques des joueurs.
Comparez les titres populaires et trouvez votre prochain jeu.
```

**Intro affichée**
```
Les jeux {TagName} regroupent des expériences appréciées par la communauté.
Voici le classement basé sur les notes et critiques des joueurs.
```

### Open Graph et Twitter Cards

Les pages incluent automatiquement les méta-données pour le partage sur les réseaux sociaux :
- `og:title`
- `og:description`
- `og:type`
- `twitter:card`
- `twitter:title`
- `twitter:description`

## Structure technique

### Fichiers modifiés

1. **SearchView.tsx** - Ajout du prop `initialFilters`
   - Permet de pré-remplir les filtres au chargement
   - Fusionne avec `defaultFilters`

2. **TopCategoryPage.tsx** (nouveau)
   - Mapping des slugs vers les tags
   - Génération des métadonnées SEO
   - Affichage de l'intro contextuelle
   - Intégration de SearchView

3. **App.tsx** - Nouvelle route
   - Route `/top/:tagSlug` ajoutée
   - Redirection automatique vers `/search` si slug invalide

## Ajout de nouvelles catégories

Pour ajouter une nouvelle catégorie SEO :

1. Ouvrir `src/pages/TopCategoryPage.tsx`
2. Ajouter une entrée dans `TAG_MAPPING` :

```typescript
'nouveau-slug': {
  tag: 'tag-api-rawg',      // Tag utilisé dans l'API RAWG
  name: 'Display Name',     // Nom en anglais
  nameFr: 'Nom Français'    // Nom en français
}
```

3. La route sera automatiquement disponible sur `/top/nouveau-slug`

## Exemple d'utilisation

```typescript
// Accès direct à une catégorie
<Link to="/top/battle-royale">Top Battle Royale</Link>

// Dans un menu de navigation
<nav>
  <a href="/top/rpg">Meilleurs RPG</a>
  <a href="/top/fps">Meilleurs FPS</a>
  <a href="/top/survival">Meilleurs Survival</a>
</nav>
```

## Notes importantes

- **Aucune modification de l'UX** : Les pages utilisent 100% du composant SearchView existant
- **Pas de nouvelle mise en page** : Seule une intro contextuelle est ajoutée au-dessus
- **Réutilisation complète** : Les cartes de jeu, filtres et pagination sont identiques à la page de recherche
- **Navigation fluide** : L'utilisateur peut continuer à utiliser tous les filtres et la recherche normalement

## Indexation SEO

Les pages sont optimisées pour l'indexation :
- Titres uniques et descriptifs
- Meta descriptions contextuelles
- Structure sémantique HTML5
- Open Graph pour le partage social
- URLs propres et descriptives
- Contenu textuel avant les résultats

## Performance

- Réutilise le cache existant de SearchView
- Pas de requête supplémentaire
- Charge uniquement les jeux correspondant au tag
- Tri côté client optimisé avec `useMemo`
