# Refactorisation du système de filtres de recherche

## Vue d'ensemble

Le système de filtres a été complètement refactoré pour offrir une expérience utilisateur explicite et fiable. Les filtres ne sont plus appliqués automatiquement lors de la modification - l'utilisateur doit maintenant cliquer sur un bouton "Appliquer" pour les activer.

## Changements principaux

### 1. Séparation de l'état : draftFilters vs appliedFilters

**Avant :**
- Un seul état `filters` qui était appliqué immédiatement via useEffect
- Pas de contrôle sur quand les filtres sont appliqués
- Confus pour l'utilisateur

**Après :**
- `draftFilters` : Ce que l'utilisateur modifie dans le panneau (brouillon)
- `appliedFilters` : Ce qui est réellement utilisé dans la requête API
- Séparation claire entre édition et application

### 2. Nouveau composant ActiveFiltersChips

**Fichier :** `src/components/ActiveFiltersChips.tsx`

Ce composant affiche les filtres actifs sous forme de chips avec :
- Label descriptif (ex: "Année: 2023", "Plateforme: PlayStation 5")
- Bouton "x" pour retirer individuellement chaque filtre
- Bouton "Effacer tous les filtres" pour tout réinitialiser
- Mapping des IDs techniques vers des noms lisibles

### 3. Panneau de filtres amélioré

**Ajouts :**
- Bouton "Appliquer les filtres" (bleu, primaire)
- Bouton "Réinitialiser" (gris, secondaire)
- Message "⚠️ Modifications non appliquées" quand des changements sont en cours
- Désactivation du bouton "Appliquer" quand aucun changement n'a été fait
- Barre sticky avec les boutons en bas du panneau

**Comportement :**
- Les filtres ne s'appliquent QUE quand on clique sur "Appliquer"
- Le panneau se ferme automatiquement après l'application
- "Réinitialiser" remet tout aux valeurs par défaut

### 4. Fonctions de gestion des filtres

#### `applyFilters()`
- Copie `draftFilters` vers `appliedFilters`
- Ferme le panneau de filtres
- Réinitialise la pagination (page 1)

#### `resetFilters()`
- Remet `draftFilters` et `appliedFilters` aux valeurs par défaut
- Réinitialise la pagination
- Relance la recherche avec les valeurs par défaut

#### `removeAppliedFilter(filterKey)`
- Retire un filtre spécifique via les chips
- Synchronise `draftFilters` et `appliedFilters`
- Réinitialise la pagination
- Relance la recherche

### 5. Intégration dans la requête API

Les filtres `appliedFilters` sont maintenant utilisés dans la fonction `fetchGames` :

```typescript
if (appliedFilters.year) {
  params.append('dates', `${appliedFilters.year}-01-01,${appliedFilters.year}-12-31`);
}

if (appliedFilters.platform) {
  params.append('platforms', appliedFilters.platform);
}

if (appliedFilters.tag) {
  params.append('tags', appliedFilters.tag);
}

if (appliedFilters.multiplayer) {
  params.append('tags', 'multiplayer');
}
```

### 6. Gestion de la pagination

Chaque modification de filtres réinitialise la pagination :
- Application de filtres → page 1
- Retrait de filtre → page 1
- Réinitialisation → page 1

Cela garantit que l'utilisateur voit toujours les premiers résultats du nouveau filtre.

## Valeurs par défaut

```typescript
const defaultFilters = {
  year: '',
  platform: '',
  tag: '',
  multiplayer: false
};
```

## UX améliorée

### Badge de comptage
- Le bouton "Filtres" affiche un badge avec le nombre de filtres actifs
- Le bouton devient bleu quand des filtres sont appliqués

### Feedback visuel
- Message orange "Modifications non appliquées"
- Bouton "Appliquer" désactivé (gris) quand pas de changements
- Chips de filtres actifs visibles au-dessus des résultats
- Animation de fermeture du panneau après application

### Tags cliquables
Les tags sous les jeux peuvent être cliqués pour filtrer immédiatement :
- Applique directement le tag (pas besoin de passer par le panneau)
- Synchronise `draftFilters` et `appliedFilters`
- Affiche la chip du filtre actif

## Cas d'usage

### Scénario 1 : Recherche avec filtres
1. L'utilisateur tape "Zelda"
2. Ouvre les filtres
3. Sélectionne "Nintendo Switch"
4. Clique "Appliquer"
5. → Voit uniquement les jeux Zelda sur Switch
6. Une chip "Plateforme: Nintendo Switch" apparaît

### Scénario 2 : Modification sans application
1. L'utilisateur ouvre les filtres
2. Sélectionne "2023" pour l'année
3. Ferme le panneau sans cliquer "Appliquer"
4. → Les résultats ne changent pas
5. Rouvre le panneau → Le champ "Année" est vide (revient à appliedFilters)

### Scénario 3 : Retrait rapide via chips
1. L'utilisateur a appliqué "Année: 2023" et "Plateforme: PS5"
2. Clique sur "x" de la chip "Année: 2023"
3. → Le filtre année est retiré immédiatement
4. → Les résultats montrent les jeux PS5 de toutes les années

## Tests

Une checklist complète de tests est disponible dans `FILTERS_TESTING_CHECKLIST.md`.

## Architecture technique

```
SearchView.tsx
├── État
│   ├── draftFilters (en cours d'édition)
│   └── appliedFilters (appliqués dans l'API)
├── Panneau de filtres
│   ├── Inputs → modifient draftFilters
│   ├── Bouton Appliquer → draftFilters → appliedFilters
│   └── Bouton Réinitialiser → tout à zéro
├── ActiveFiltersChips
│   ├── Affiche appliedFilters
│   └── Permet de retirer des filtres
└── fetchGames()
    └── Utilise appliedFilters dans la requête API
```

## Fichiers modifiés

1. **`src/components/views/SearchView.tsx`** (principal)
   - Ajout de `draftFilters` et `appliedFilters`
   - Nouvelles fonctions `applyFilters()`, `resetFilters()`, `removeAppliedFilter()`
   - Modification des inputs pour utiliser `draftFilters`
   - Ajout des boutons Appliquer et Réinitialiser
   - Intégration du composant ActiveFiltersChips

2. **`src/components/ActiveFiltersChips.tsx`** (nouveau)
   - Composant réutilisable pour afficher les filtres actifs
   - Gestion des chips avec boutons de retrait
   - Mapping des valeurs techniques vers noms lisibles

## Améliorations futures possibles

1. **Sauvegarde des filtres dans l'URL**
   - Permettre le partage de recherches filtrées
   - Retour arrière dans le navigateur

2. **Filtres avancés**
   - Range de dates (début-fin)
   - Multiple sélection pour plateformes/tags
   - Filtres par note/métascore

3. **Présets de filtres**
   - Sauvegarder des combinaisons favorites
   - "Mes jeux Nintendo Switch de 2023"

4. **Suggestions de filtres**
   - "Beaucoup de résultats, essayez de filtrer par année"
   - Auto-suggestions basées sur les résultats

## Conclusion

Le système de filtres est maintenant **explicite, prévisible et fiable**. L'utilisateur a un contrôle total sur quand les filtres sont appliqués, avec un feedback visuel clair à chaque étape.
