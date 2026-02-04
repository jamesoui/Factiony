# Système de Modération de Contenu

## Vue d'ensemble

Le système de modération permet aux utilisateurs de :
- **Suivre/Ne plus suivre** les auteurs de contenu
- **Signaler** les contenus inappropriés (critiques, sujets de forum, réponses)

Les signalements sont envoyés automatiquement par email à l'équipe de modération via Resend.

## Architecture

### 1. Base de données

#### Table `content_reports`
Stocke tous les signalements de contenu :
- `reporter_user_id` : ID de l'utilisateur qui signale
- `reported_user_id` : ID de l'auteur du contenu signalé
- `content_type` : Type de contenu (`review`, `forum_post`, `forum_reply`)
- `content_id` : ID du contenu signalé
- `reason` : Raison du signalement (spam, harassment, hate, illegal, nsfw, impersonation, other)
- `message` : Message optionnel (max 800 caractères)
- `status` : Statut (`open`, `in_review`, `resolved`, `rejected`)

**Sécurité RLS :**
- Les utilisateurs peuvent uniquement créer des signalements
- La lecture/modification est réservée au service role (admins)

#### Table `follows` (existante)
Gère les relations de suivi entre utilisateurs :
- `user_id` : Utilisateur qui suit
- `friend_id` : Utilisateur suivi

### 2. Composants Frontend

#### `ContentActionsMenu`
Composant réutilisable qui affiche un menu kebab (⋯) avec :
- Option de suivre/ne plus suivre l'auteur
- Option de signaler le contenu

**Props :**
```typescript
interface ContentActionsMenuProps {
  authorUserId: string;
  authorUsername?: string;
  contentType: 'review' | 'forum_post' | 'forum_reply';
  contentId: string;
  contentUrl: string;
  contentExcerpt?: string;
}
```

**Intégrations :**
- ✅ Reviews dans GameDetailModal
- ✅ Sujets de forum (threads)
- ✅ Réponses de forum (posts)

### 3. Edge Function `report-content`

**Endpoint :** `/functions/v1/report-content`

**Fonctionnalités :**
- Vérifie l'authentification de l'utilisateur
- Valide les données du signalement
- Rate limiting : empêche les signalements en double dans les 60 dernières secondes
- Insère le signalement dans la base de données
- Envoie un email de notification via Resend

**Anti-abus :**
- Rate limit serveur : 60 secondes entre deux signalements du même contenu
- Cooldown client : 30 secondes (dans le localStorage)

## Configuration

### Secrets Supabase (automatiquement configurés)

Les secrets suivants sont automatiquement disponibles dans l'edge function :

```
RESEND_API_KEY         # Clé API Resend
REPORTS_TO_EMAIL       # Email de destination (moderation@factiony.com)
REPORTS_FROM_EMAIL     # Email expéditeur (Factiony <no-reply@factiony.com>)
```

### Configuration Email

Le domaine `factiony.com` est déjà vérifié dans Resend avec :
- ✅ SPF configuré
- ✅ DKIM configuré

Les emails sont envoyés depuis `no-reply@factiony.com` et reçus sur `moderation@factiony.com` (redirection OVH configurée).

## Utilisation

### Pour les utilisateurs

1. **Suivre un auteur :**
   - Cliquer sur le menu ⋯ à côté du contenu
   - Sélectionner "Suivre @username"

2. **Signaler un contenu :**
   - Cliquer sur le menu ⋯ à côté du contenu
   - Sélectionner "Signaler"
   - Choisir une raison
   - (Optionnel) Ajouter des détails
   - Cliquer sur "Envoyer"

### Pour les modérateurs

Les signalements arrivent par email à `moderation@factiony.com` avec :
- ID du signalement
- Type de contenu
- Raison du signalement
- Informations sur le rapporteur
- Informations sur l'auteur signalé
- Extrait du contenu
- Lien vers le contenu

Les modérateurs peuvent ensuite gérer les signalements via le panneau Supabase.

## Tests

### Test du système de follow

```typescript
// 1. Se connecter
// 2. Aller sur une review/post d'un autre utilisateur
// 3. Cliquer sur le menu ⋯
// 4. Cliquer sur "Suivre @username"
// 5. Vérifier que le bouton devient "Ne plus suivre @username"
```

### Test du système de signalement

```typescript
// 1. Se connecter
// 2. Aller sur une review/post
// 3. Cliquer sur le menu ⋯
// 4. Cliquer sur "Signaler"
// 5. Sélectionner une raison
// 6. Ajouter un message (optionnel)
// 7. Cliquer sur "Envoyer"
// 8. Vérifier le toast de succès
// 9. Vérifier la réception de l'email sur moderation@factiony.com
```

## Maintenance

### Vérifier les signalements en base

```sql
-- Voir tous les signalements ouverts
SELECT * FROM content_reports WHERE status = 'open' ORDER BY created_at DESC;

-- Statistiques par raison
SELECT reason, COUNT(*) as count
FROM content_reports
GROUP BY reason
ORDER BY count DESC;
```

### Mettre à jour le statut d'un signalement

```sql
UPDATE content_reports
SET
  status = 'resolved',
  admin_notes = 'Contenu supprimé'
WHERE id = '<report_id>';
```

## Notes importantes

- ❌ Ne PAS exposer `RESEND_API_KEY` dans le code frontend
- ✅ Tous les emails passent par l'edge function sécurisée
- ✅ Les utilisateurs ne peuvent pas voir les signalements des autres
- ✅ Anti-spam intégré côté serveur et client
- ✅ Les secrets sont automatiquement configurés (ne pas les configurer manuellement)
