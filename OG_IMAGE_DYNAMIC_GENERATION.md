# Dynamic OG Image Generation for Reviews

## Overview

The system now generates dynamic Open Graph (OG) images for review sharing. Instead of using a static placeholder, each review gets a custom 1200x630px image with:
- Game cover as background (blurred and darkened)
- Game name in large text
- Star rating with visual stars (★★★★☆)
- Review excerpt (up to 140 characters)
- Username
- Factiony branding

## Implementation

### Edge Function: `netlify/edge-functions/og-review.ts`

This Netlify Edge Function runs on Deno runtime and generates PNG images on-the-fly.

#### Key Features

1. **Route**: `/og/review/:id.png`
2. **Libraries**:
   - `satori@0.10.11` - Converts React-like JSX to SVG
   - `@resvg/resvg-js@2.4.0` - Converts SVG to PNG

3. **Data Sources**:
   - `game_ratings` table - Review data (rating, review_text, user_id, game_id)
   - `games` table - Game info (name, cover, background_image)
   - `users` table - Username

4. **Image Processing**:
   - Downloads game cover from external URL
   - Converts to base64 data URI for embedding
   - Applies blur and brightness filters for readability

#### Flow

```
Request: /og/review/abc-123.png
    ↓
Fetch review from Supabase (game_ratings)
    ↓
Fetch game + user data in parallel
    ↓
Download & convert cover image to base64
    ↓
Generate SVG layout with satori
    ↓
Convert SVG to PNG with resvg
    ↓
Return PNG with cache headers
```

#### Layout Structure

```
┌─────────────────────────────────────┐
│  [Blurred Game Cover Background]    │
│  [Gradient Overlay]                 │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Game Name (48px bold)       │   │
│  │                             │   │
│  │ ★★★★☆ 4/5 (rating badge)   │   │
│  │                             │   │
│  │ Review excerpt (24px)       │   │
│  │ (max 140 chars)             │   │
│  │                             │   │
│  │ Par Username    FACTIONY    │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
    1200x630px
```

#### Styling Details

- **Background**: Game cover with `brightness(0.4) blur(2px)`
- **Overlay**: Linear gradient from 30% black to 80% black
- **Bottom Card**: `rgba(0,0,0,0.6)` with backdrop blur
- **Rating Badge**: Orange border with semi-transparent background
- **Stars**: Gold color (#FFD700)
- **Typography**: system-ui font stack

#### Error Handling

If any error occurs during generation (missing data, failed image download, etc.):
- Returns a fallback image with just "Critique sur Factiony" text
- Logs error to console for debugging
- Always returns 200 status with PNG content

#### Caching Strategy

**Success Response**:
```
Cache-Control: public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800
```

- Client cache: 1 hour
- CDN cache: 24 hours
- Stale-while-revalidate: 7 days

**Error Response**:
```
Cache-Control: public, max-age=60
```

- Short 60-second cache for errors to allow retry

## Environment Variables

Required in Netlify:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key is needed to:
- Read from `game_ratings` table (protected by RLS)
- Read from `games` table
- Read from `users` table

## Database Schema Requirements

### game_ratings table
```sql
- id (uuid)
- rating (numeric 0-5)
- review_text (text)
- user_id (uuid)
- game_id (text)
- game_slug (text)
```

### games table
```sql
- id (text)
- name (text)
- cover (text, nullable)
- background_image (text, nullable)
```

### users table
```sql
- id (uuid)
- username (text)
```

## Usage in Social Media Meta Tags

```html
<meta property="og:image" content="https://factiony.com/og/review/abc-123.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

These tags are automatically included in:
- `/share/review/:id` (redirect page)
- Share buttons throughout the app

## Testing

### Manual Test
```bash
curl https://factiony.com/og/review/YOUR-REVIEW-ID.png > test.png
open test.png
```

### Social Media Validators
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- Twitter Card Validator: https://cards-dev.twitter.com/validator
- LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/

### Common Issues

**Image not showing in social media:**
1. Check that review ID exists in database
2. Verify environment variables are set in Netlify
3. Clear social media cache (use validators above)
4. Check Netlify Function logs for errors

**Cover image not appearing:**
1. Game might not have `cover` or `background_image` set
2. External image URL might be broken or require auth
3. Check console logs for image download errors
4. Fallback: black background will be used

**Text cut off:**
1. Game names longer than ~40 chars will be truncated
2. Review text is limited to 140 characters
3. Layout is fixed-size for OG image requirements

## Performance

- **Cold start**: ~2-3 seconds (Deno runtime + satori compilation)
- **Warm**: ~500ms-1s (image download + SVG/PNG conversion)
- **Image size**: ~100-300KB (depending on cover complexity)

Images are cached at multiple layers:
1. Browser cache (1 hour)
2. Netlify CDN (24 hours)
3. Social media platforms (variable, usually 7+ days)

## Future Improvements

Possible enhancements:
- [ ] Cache generated images in Supabase Storage
- [ ] Pre-generate images for popular reviews
- [ ] Support multiple languages
- [ ] Add user avatar to the image
- [ ] Include game genre tags
- [ ] Add Factiony logo (requires custom font embedding)
- [ ] Optimize image compression
- [ ] A/B test different layouts

## Technical Notes

### Why data URIs for images?

Satori requires all images to be embedded as data URIs. External URLs won't work because:
1. Satori doesn't fetch external resources
2. Network requests would block rendering
3. CORS restrictions

### Why Resvg?

Alternative SVG-to-PNG converters (sharp, puppeteer) don't work in Deno edge runtime:
- `sharp` requires native Node.js bindings
- `puppeteer` requires full Chrome/Chromium
- `resvg` is pure Rust + WASM, works in Deno

### ESM.sh vs deno.land/x

We use `esm.sh` instead of `deno.land/x` because:
- More reliable CDN
- Better TypeScript support
- Automatic polyfills for Node.js modules
- Faster updates for npm packages

## Monitoring

Key metrics to track:
- Function execution time (Netlify Analytics)
- Error rate (check logs for failed image generations)
- Cache hit rate (CloudFlare/Netlify CDN stats)
- Social share clicks (Google Analytics)

## Related Files

- `/netlify/edge-functions/share-review.ts` - Redirect handler with OG tags
- `/src/components/ShareReviewButton.tsx` - Share UI component
- `REVIEW_SHARING_REDIRECT_FIX.md` - Overall sharing system docs
