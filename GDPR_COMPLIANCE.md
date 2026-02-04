# Conformité RGPD - Google Analytics avec Tarteaucitron

## Modifications apportées

### 1. Retrait du chargement direct de GA4 (index.html)
- Suppression du script GA4 qui chargeait `gtag.js` directement
- Suppression de l'initialisation automatique de GA sans consentement
- Le script n'est plus présent dans le HTML, Tarteaucitron gère tout

### 2. Configuration Tarteaucitron (src/privacy/tarteaucitron.ts)
- **Déclaration GA4 comme service Tarteaucitron** avec l'ID `G-4STQ07LK46`
- Configuration de la bannière :
  - `showAlertSmall: false` - Bannière complète, pas mini
  - `highPrivacy: true` - Mode haute confidentialité (opt-in)
  - `AcceptAllCta: true` - Bouton "Tout accepter"
  - `DenyAllCta: true` - Bouton "Tout refuser"
  - `orientation: 'bottom'` - Bannière en bas de l'écran
  - `mandatory: true` - La bannière s'affiche obligatoirement

### 3. Vérification du consentement (src/lib/analytics.ts)
- Nouvelle fonction `hasAnalyticsConsent()` qui vérifie :
  - État du service `gtag` dans `tarteaucitron.state`
  - Présence des cookies GA4
  - Contenu du cookie `tarteaucitron`
- Blocage de tous les appels GA (`trackPageView`, `trackEvent`) sans consentement
- Logs en mode dev pour tracer les appels bloqués

## Comment tester

### Test 1 : Vérification de la bannière
1. Ouvrir le site en **navigation privée** (sans cookies)
2. **Résultat attendu** : Une bannière Tarteaucitron s'affiche en bas de l'écran
3. Vérifier la présence des boutons :
   - "Tout accepter"
   - "Tout refuser"
   - "Personnaliser"

### Test 2 : Blocage AVANT consentement
1. Ouvrir les **DevTools** (F12)
2. Aller dans l'onglet **Network**
3. Filtrer par "google" ou "analytics"
4. Recharger la page **SANS accepter** les cookies
5. **Résultat attendu** :
   - Aucune requête vers `google-analytics.com`
   - Aucune requête vers `googletagmanager.com`
   - Aucun script `gtag.js` chargé
6. Vérifier la console : `[GA] page_view blocked - no consent or GA not ready`

### Test 3 : Autorisation APRÈS consentement
1. Cliquer sur "Tout accepter" dans la bannière
2. Vérifier dans l'onglet **Network** :
   - Requête vers `googletagmanager.com/gtag/js?id=G-4STQ07LK46`
   - Requêtes vers `google-analytics.com/g/collect`
3. Naviguer vers une autre page
4. Vérifier que les `page_view` sont bien envoyés
5. Console : `[GA] page_view /chemin`

### Test 4 : Refus du consentement
1. Supprimer les cookies / Navigation privée
2. Cliquer sur "Tout refuser"
3. Naviguer dans l'application
4. **Résultat attendu** :
   - Aucune requête GA
   - Console : `[GA] page_view blocked - no consent or GA not ready`

### Test 5 : Persistance du choix
1. Accepter les cookies
2. Fermer et rouvrir le navigateur (même session)
3. **Résultat attendu** :
   - Pas de nouvelle bannière
   - GA fonctionne directement
4. Refuser les cookies (nouveau test)
5. Fermer et rouvrir
6. **Résultat attendu** :
   - Pas de nouvelle bannière
   - GA reste bloqué

## Vérification technique

### Cookie Tarteaucitron
Après acceptation, vérifier la présence du cookie `tarteaucitron` :
```
tarteaucitron=!gtag=true!
```

### État du service
En console JavaScript :
```javascript
window.tarteaucitron.state.gtag
// Doit retourner true si accepté, false sinon
```

### Variables d'environnement requises
Le fichier `.env` doit contenir :
```
VITE_GA_MEASUREMENT_ID=G-4STQ07LK46
```

## Conformité RGPD

- ✅ **Consentement préalable** : Aucune donnée envoyée avant acceptation
- ✅ **Opt-in** : Mode haute confidentialité activé
- ✅ **Choix granulaire** : L'utilisateur peut accepter/refuser
- ✅ **Anonymisation IP** : `anonymize_ip: true` dans les configs GA
- ✅ **Révocabilité** : Icône Tarteaucitron en bas à droite pour modifier
- ✅ **Transparence** : Lien vers politique de confidentialité

## En cas de problème

### La bannière ne s'affiche pas
- Vérifier que `tarteaucitron.js` est bien chargé dans index.html
- Vérifier la console : message d'initialisation de Tarteaucitron
- Supprimer le cookie `tarteaucitron` pour réinitialiser

### GA s'active quand même
- Vérifier qu'il n'y a plus de script GA dans index.html
- Vérifier la fonction `hasAnalyticsConsent()` dans analytics.ts
- Console : chercher les logs `[GA] blocked`

### GA ne s'active jamais
- Vérifier `VITE_GA_MEASUREMENT_ID` dans .env
- Console : `window.tarteaucitron.user.gtagUa` doit contenir l'ID GA
- Console : `window.tarteaucitron.state.gtag` doit être `true`
