# Review Sharing System - Redirect Fix

## Problem
The route `/review/:id` was causing infinite loading (spinner) and breaking social media previews when used as a public page.

## Solution
Changed the review sharing flow to redirect to the game page with a review parameter instead of using a dedicated review page.

## Changes Made

### 1. Edge Function: `netlify/edge-functions/share-review.ts`
**Before:** Redirected to `/review/:id`
**After:** Fetches the game slug from Supabase and redirects to `/game/:slug?review=:id`

Key changes:
- Added Supabase REST API call to fetch `game_slug` from `game_ratings` table
- Changed redirect URL to use game page with query parameter
- Falls back to homepage if game slug is not found

### 2. Frontend: `src/components/GameDetailModal.tsx`
Enhanced the existing review detection logic to:
- Automatically switch to the "reviews" tab when `?review=:id` parameter is present
- Scroll to the specific review using `getElementById('review-${reviewId}')`
- Add a temporary orange ring highlight (3 seconds) to the target review
- Increased scroll delay to 800ms to ensure content is loaded

### 3. Review Links: `src/components/GameDetailModal.tsx`
Changed the review URL in `ContentActionsMenu` from:
- `/review/:id` → `/share/review/:id`

This ensures the share functionality uses the proper edge function route.

### 4. Legacy Route: `src/pages/PublicReview.tsx`
**Transformed from:** Full review display page
**To:** Simple redirect component

The page now:
1. Fetches the review to get the `game_slug`
2. Immediately redirects to `/game/:slug?review=:id` using `navigate(..., { replace: true })`
3. Shows a loading spinner during the redirect
4. Falls back to homepage if review is not found

This ensures backward compatibility for old `/review/:id` links.

## Flow Diagram

### Old Flow (Broken)
```
Social Media Share → /share/review/:id → /review/:id → [SPINNER FOREVER]
```

### New Flow (Fixed)
```
Social Media Share → /share/review/:id → /game/:slug?review=:id → Game page with highlighted review
```

### Legacy Links Flow
```
Old Link: /review/:id → Redirect to /game/:slug?review=:id → Game page with highlighted review
```

## User Experience

When a user clicks a shared review link:
1. Social platforms show the OG image from `/og/review/:id.png` (unchanged)
2. User is redirected to the game page
3. The modal/page automatically opens to the "Reviews" tab
4. The specific review is scrolled into view and highlighted with an orange ring
5. After 3 seconds, the highlight fades away

## Technical Notes

- The `/og/review/:id.png` endpoint remains unchanged and continues to serve placeholder images
- The `game_slug` field must exist in the `game_ratings` table for the redirect to work
- If a review or game slug is missing, users are safely redirected to the homepage
- The highlight effect uses Tailwind CSS classes: `ring-2 ring-orange-500 ring-offset-2 ring-offset-gray-800`

## Testing Checklist

- [x] TypeScript compilation passes
- [ ] Share button generates correct `/share/review/:id` URLs
- [ ] Edge function correctly fetches game slug from Supabase
- [ ] Redirect goes to correct `/game/:slug?review=:id` URL
- [ ] Game page detects `review` parameter and switches to reviews tab
- [ ] Review is scrolled into view and highlighted
- [ ] Old `/review/:id` links redirect properly
- [ ] Social media previews still show OG images correctly

## Environment Variables Required

The edge function uses these environment variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

These should be configured in Netlify's environment settings.
