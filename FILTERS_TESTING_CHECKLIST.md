# Checklist de test du système de filtres

## Tests fonctionnels de base

### 1. Test du panneau de filtres
- [ ] Cliquer sur le bouton "Filtres" ouvre le panneau
- [ ] Le panneau affiche tous les champs (Année, Plateforme, Tags, Multijoueur)
- [ ] Modifier un filtre affiche le message "⚠️ Modifications non appliquées"
- [ ] Le bouton "Appliquer" est désactivé quand aucun changement n'a été fait
- [ ] Le bouton "Appliquer" est activé quand des changements sont faits

### 2. Test d'application des filtres
- [ ] Entrer une année (ex: 2023) → Cliquer "Appliquer" → Les résultats changent
- [ ] Sélectionner une plateforme → Cliquer "Appliquer" → Les résultats changent
- [ ] Sélectionner un tag → Cliquer "Appliquer" → Les résultats changent
- [ ] Cocher "Multijoueur uniquement" → Cliquer "Appliquer" → Les résultats changent
- [ ] Le panneau se ferme automatiquement après avoir cliqué "Appliquer"

### 3. Test des chips de filtres actifs
- [ ] Après avoir appliqué un filtre, une chip apparaît au-dessus des résultats
- [ ] La chip affiche le nom du filtre et sa valeur (ex: "Année: 2023")
- [ ] Cliquer sur le "x" d'une chip retire ce filtre et met à jour les résultats
- [ ] Le bouton "Effacer tous les filtres" apparaît quand il y a des filtres actifs
- [ ] Cliquer "Effacer tous les filtres" retire tous les filtres et met à jour les résultats

### 4. Test du bouton Réinitialiser
- [ ] Modifier plusieurs filtres sans appliquer
- [ ] Cliquer "Réinitialiser" → Tous les filtres reviennent aux valeurs par défaut
- [ ] Cliquer "Réinitialiser" quand des filtres sont appliqués → Les résultats reviennent à l'état initial

### 5. Test de combinaisons de filtres
- [ ] Appliquer Année + Plateforme → Les résultats respectent les deux filtres
- [ ] Appliquer Année + Tag + Multijoueur → Les résultats respectent tous les filtres
- [ ] Retirer un filtre d'une combinaison via les chips → Les autres filtres restent actifs

### 6. Test avec recherche texte
- [ ] Taper un terme de recherche → Résultats s'affichent
- [ ] Appliquer un filtre avec une recherche active → Les résultats sont filtrés
- [ ] Retirer le filtre → Les résultats de la recherche reviennent sans filtre
- [ ] Effacer la recherche avec des filtres actifs → Affiche les "jeux les plus joués" filtrés

### 7. Test du badge de comptage
- [ ] Le badge sur le bouton "Filtres" affiche le nombre correct de filtres actifs
- [ ] Le badge disparaît quand tous les filtres sont retirés
- [ ] Le badge se met à jour correctement lors de l'ajout/retrait de filtres

### 8. Test de la pagination
- [ ] Appliquer un filtre réinitialise la pagination (retour page 1)
- [ ] Retirer un filtre réinitialise la pagination
- [ ] Charger plus de résultats après avoir appliqué des filtres → Les résultats chargés respectent les filtres

### 9. Test des tags cliquables
- [ ] Cliquer sur un tag sous un jeu applique immédiatement ce filtre
- [ ] Le tag apparaît dans les chips de filtres actifs
- [ ] Les résultats sont filtrés selon ce tag

### 10. Test des cas limites
- [ ] Appliquer des filtres qui ne donnent aucun résultat → Message d'erreur approprié
- [ ] Modifier un filtre puis fermer le panneau sans appliquer → Le filtre n'est pas appliqué
- [ ] Rouvrir le panneau après avoir fermé sans appliquer → Les valeurs des champs correspondent aux filtres appliqués

## Tests de robustesse

### 11. Loader et états de chargement
- [ ] Un loader s'affiche pendant que les résultats se chargent
- [ ] Le loader apparaît lors de l'application de filtres
- [ ] Le loader apparaît lors du retrait de filtres

### 12. État synchronisé
- [ ] draftFilters = appliedFilters quand rien n'est modifié
- [ ] draftFilters ≠ appliedFilters quand des changements sont en cours
- [ ] Appliquer les filtres synchronise draftFilters et appliedFilters

## Notes de test

Date: [À remplir]
Testeur: [À remplir]
Version: [À remplir]

### Bugs trouvés
- [À remplir]

### Suggestions d'amélioration
- [À remplir]
