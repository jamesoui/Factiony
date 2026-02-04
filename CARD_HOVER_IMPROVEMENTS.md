# Amélioration de l'effet Hover sur les Cartes de Jeux

## Problème initial

L'effet hover sur les cartes de jeux présentait plusieurs problèmes :
- Seule l'image s'agrandissait (`hover:scale-105` sur l'`<img>`)
- Cela créait un débordement visuel où le bas de la carte ne suivait pas
- L'image empiétait sur la note en bas
- Le badge de note était repoussé ou recouvert
- Expérience utilisateur incohérente

## Solution implémentée

### 1. Transformation de la carte entière

**Avant :**
```tsx
<div className="rounded-2xl overflow-hidden shadow-lg hover:shadow-xl ...">
  <img className="... hover:scale-105" />
</div>
```

**Après :**
```tsx
<div className="group rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl
                transition-all duration-300 hover:scale-105 hover:z-10 relative ...">
  <img className="... transition-transform duration-500 ease-out group-hover:scale-110" />
</div>
```

### 2. Changements appliqués

#### Sur la carte principale :
- Ajout de `group` pour coordonner les effets hover
- `hover:scale-105` - Agrandissement de toute la carte
- `hover:shadow-2xl` - Ombre plus prononcée au hover
- `transition-all duration-300` - Transition fluide
- `hover:z-10` - Élève la carte au-dessus des voisines
- `relative` - Crée un contexte de positionnement

#### Sur le conteneur d'image :
- Ajout de `overflow-hidden` - Clippe l'image dans son conteneur
- L'image garde son aspect ratio correct

#### Sur l'image :
- Remplacement de `hover:scale-105` par `group-hover:scale-110`
- `duration-500` et `ease-out` - Animation plus lente et douce
- L'image zoome légèrement mais reste contenue

#### Sur le badge de note :
- **Position :** Déplacé de l'extérieur vers l'intérieur de la carte
- **Style :** `absolute top-2 right-2` - Positionné en haut à droite
- **Z-index :** `z-30` - Toujours au-dessus de l'image
- **Fond :** `bg-gray-900/80 backdrop-blur-sm` - Semi-transparent avec flou
- **Bordure :** `rounded-lg px-2 py-1` - Arrondi et padding pour lisibilité
- **Note :** Le badge de note et le badge "À venir" sont mutuellement exclusifs (ne s'affichent jamais en même temps)

## Composants modifiés

### 1. GameCard.tsx
- Mode normal (carte verticale)
- Mode compact (carte horizontale)
- Badge de note repositionné en position absolue
- Badges de statut avec `z-20` pour rester visibles

### 2. SimpleGameCard.tsx
- Structure identique à GameCard
- Badge de note repositionné
- Même comportement hover

## Hiérarchie des z-index

```
z-30 : Badge de note (⭐)
z-20 : Badges de statut et "À venir"
z-10 : Gradient de titre + carte au hover
z-0  : Image de fond
```

## Effets visuels au hover

1. **Carte entière** : Scale de 105% + ombre élevée
2. **Image** : Zoom subtil de 110% (contenu par overflow-hidden)
3. **Badge de note** : Reste lisible grâce au fond semi-transparent
4. **Élévation** : z-10 pour passer au-dessus des cartes voisines
5. **Transition** : 300ms pour la carte, 500ms pour l'image (effet parallaxe subtil)

## Mode compact

Pour le mode compact de GameCard :
- Scale plus léger : `hover:scale-[1.02]` (au lieu de 1.05)
- Même principe : carte entière + image avec group-hover
- Badge de note intégré dans le texte (pas d'overlay)

## Avantages

1. **Cohérence visuelle** : Toute la carte réagit ensemble
2. **Pas de débordement** : L'image reste clippée dans son conteneur
3. **Lisibilité** : La note reste toujours visible avec fond semi-transparent
4. **Performance** : Utilisation de transform et opacity (GPU accelerated)
5. **Accessibilité** : Transitions douces et prévisibles
6. **Réutilisabilité** : Même comportement partout dans l'application

## Localisation des composants

Les cartes sont utilisées dans :
- Homepage : Section "Les jeux en tendance" (TopGamesSection → SimpleGameCard)
- Homepage : Sections horizontales (HorizontalGameSection → GameCard)
- Page de recherche : Résultats (SearchView → GameCard ou SimpleGameCard)
- Listes de jeux : Partout (GameCard)
- Pages de catégories : Nouvelles pages SEO (SimpleGameCard)

## Notes techniques

- **Classe `group`** : Permet aux enfants de réagir au hover du parent via `group-hover:`
- **Valeur arbitraire** : `hover:scale-[1.02]` utilise la syntaxe Tailwind pour valeurs custom
- **Backdrop-blur** : Nécessite que l'arrière-plan soit visible (fond semi-transparent)
- **Z-index relatif** : Chaque carte crée son propre stacking context

## Testing

Pour tester l'effet hover :
1. Survoler une carte de jeu sur la homepage
2. Vérifier que toute la carte s'agrandit uniformément
3. Confirmer que l'image ne déborde pas
4. Vérifier que le badge de note reste lisible
5. Tester sur différentes tailles d'écran
6. Vérifier le mode compact dans les listes

## Performance

- Utilisation de `transform` et `box-shadow` (composited)
- `will-change` implicite via les transitions
- Images lazy-loaded pour optimiser le chargement initial
- Transitions GPU-accelerated pour fluidité à 60fps
