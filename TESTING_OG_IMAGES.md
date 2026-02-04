# Testing OG Image Generation

## Quick Test Guide

### Prerequisites
1. Deploy to Netlify (Edge Functions only work in production/deploy previews)
2. Set environment variables (see [NETLIFY_ENV_SETUP.md](./NETLIFY_ENV_SETUP.md))
3. Have a review ID to test with

## Step 1: Deploy to Netlify

```bash
# Commit changes
git add .
git commit -m "Add dynamic OG image generation"
git push

# Wait for Netlify to deploy
# Check: https://app.netlify.com/sites/YOUR-SITE/deploys
```

## Step 2: Get a Review ID

You need a valid review ID from your database. Options:

### A. From Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/ffcocumtwoyydgsuhwxi/editor
2. Open `game_ratings` table
3. Copy any `id` value (UUID format)

### B. From your app
1. Go to https://factiony.com
2. Create or view a review
3. Click "Share" button
4. Copy the review ID from the share URL

### C. SQL Query
```sql
SELECT id, rating, review_text, game_id, user_id
FROM game_ratings
LIMIT 5;
```

## Step 3: Test the OG Image Endpoint

### Browser Test
Open in browser:
```
https://factiony.com/og/review/YOUR-REVIEW-ID.png
```

**Expected result:**
- PNG image displays (1200x630px)
- Shows game name, rating, review text
- Has game cover as background

**Troubleshooting:**
- 404 → Review ID doesn't exist
- 500 → Check environment variables
- Blank/error → Check Netlify function logs

### cURL Test
```bash
# Download image
curl "https://factiony.com/og/review/YOUR-REVIEW-ID.png" -o test.png

# Check file size
ls -lh test.png

# Open image
open test.png  # macOS
xdg-open test.png  # Linux
start test.png  # Windows
```

**Expected result:**
- File size: 100-300KB
- Valid PNG image
- 1200x630 dimensions

### Check Logs
```bash
# Via Netlify Dashboard
https://app.netlify.com/sites/YOUR-SITE/functions/og-review

# Look for:
✅ [og-review] Generating OG image for review: abc-123
✅ [og-review] Found game slug: witcher-3
❌ [og-review] Error fetching review: ...
```

## Step 4: Test Social Media Sharing

### A. Test with Facebook Debugger
1. Go to https://developers.facebook.com/tools/debug/
2. Enter URL: `https://factiony.com/share/review/YOUR-REVIEW-ID`
3. Click "Debug"
4. Check:
   - ✅ Image loads (1200x630)
   - ✅ Title shows game name + username
   - ✅ Description shows review excerpt

**If image doesn't load:**
- Click "Scrape Again"
- Check "See exactly what our scraper sees"
- Verify meta tags are present

### B. Test with Twitter Card Validator
1. Go to https://cards-dev.twitter.com/validator
2. Enter URL: `https://factiony.com/share/review/YOUR-REVIEW-ID`
3. Click "Preview card"
4. Check:
   - ✅ Summary Card with Large Image
   - ✅ Image displays correctly

### C. Test with LinkedIn Post Inspector
1. Go to https://www.linkedin.com/post-inspector/
2. Enter URL: `https://factiony.com/share/review/YOUR-REVIEW-ID`
3. Click "Inspect"
4. Check image preview

### D. Test Real Sharing
1. Post the link on your social media (private test post)
2. Verify image shows in preview
3. Click through to verify redirect works

## Step 5: Verify Complete Flow

### End-to-End Test
1. Create a review on Factiony
2. Click "Share" button
3. Select "Copy Link"
4. Paste link into Facebook/Twitter
5. Verify:
   - ✅ OG image shows in preview
   - ✅ Clicking link redirects to game page
   - ✅ Review is highlighted on arrival

## Common Issues & Solutions

### Issue: Image shows placeholder/generic
**Cause:** Old system using `/og-placeholder.png`
**Solution:**
- Verify edge function deployed
- Check Netlify config has edge function registered
- Clear CDN cache

### Issue: 500 Internal Server Error
**Causes:**
1. Missing `SUPABASE_SERVICE_ROLE_KEY`
2. Wrong Supabase URL
3. Database tables don't exist

**Debug:**
```bash
# Check Netlify env vars
netlify env:list

# Check function logs
# Go to: Netlify Dashboard → Functions → og-review → Recent logs
```

### Issue: 404 Not Found
**Causes:**
1. Review ID is invalid/doesn't exist
2. Review was deleted
3. Database connection failed

**Debug:**
```sql
-- Check if review exists
SELECT * FROM game_ratings WHERE id = 'YOUR-UUID';

-- Check if game data exists
SELECT * FROM games WHERE id = (
  SELECT game_id FROM game_ratings WHERE id = 'YOUR-UUID'
);

-- Check if user exists
SELECT * FROM users WHERE id = (
  SELECT user_id FROM game_ratings WHERE id = 'YOUR-UUID'
);
```

### Issue: Image loads but looks broken
**Causes:**
1. Game cover URL is broken
2. Satori/Resvg error (check logs)
3. Missing font rendering

**Check:**
```bash
# Test cover URL directly
curl -I "COVER-URL"

# Check Netlify function logs for errors
```

### Issue: Social media shows old image
**Cause:** CDN/social media cache

**Solution:**
```bash
# Force refresh in validators:
# Facebook: Click "Scrape Again"
# Twitter: Add ?v=2 to URL and re-validate
# LinkedIn: Clear cache in Inspector

# If still cached, wait 24-48 hours
# Or change the review ID to force new URL
```

## Performance Benchmarks

Expected timings:

| Metric | Target | Acceptable | Slow |
|--------|--------|------------|------|
| First load (cold) | 1-2s | 2-3s | >3s |
| Cached load | <100ms | 100-500ms | >500ms |
| Image size | 100-200KB | 200-300KB | >300KB |

**Check performance:**
```bash
# Test with timing
time curl -o /dev/null -s -w 'Total: %{time_total}s\n' \
  "https://factiony.com/og/review/YOUR-ID.png"

# Expected output:
# Total: 1.234s
```

## Automated Testing

### Create Test Script

```bash
#!/bin/bash
# test-og-images.sh

REVIEW_IDS=(
  "abc-123"
  "def-456"
  "ghi-789"
)

for ID in "${REVIEW_IDS[@]}"; do
  echo "Testing review: $ID"
  HTTP_CODE=$(curl -o /dev/null -s -w "%{http_code}" \
    "https://factiony.com/og/review/${ID}.png")

  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ $ID - OK"
  else
    echo "❌ $ID - Failed (HTTP $HTTP_CODE)"
  fi
done
```

### Run Tests
```bash
chmod +x test-og-images.sh
./test-og-images.sh
```

## Next Steps

After successful testing:

1. ✅ Verify in production with real reviews
2. ✅ Monitor Netlify function usage/costs
3. ✅ Set up alerts for function errors
4. ✅ Test on multiple social platforms
5. ✅ Document any edge cases found
6. ✅ Consider pre-generating images for popular reviews

## Monitoring

Keep an eye on:

- **Netlify Functions Dashboard**: Check execution time, errors, invocations
- **Social Media Analytics**: Track click-through rates on shared reviews
- **Sentry/Error Tracking**: Monitor for Satori/Resvg errors
- **Cache Hit Rate**: Verify CDN is caching effectively

## Support

If issues persist:

1. Check all documentation:
   - [OG_IMAGE_DYNAMIC_GENERATION.md](./OG_IMAGE_DYNAMIC_GENERATION.md)
   - [NETLIFY_ENV_SETUP.md](./NETLIFY_ENV_SETUP.md)
   - [REVIEW_SHARING_REDIRECT_FIX.md](./REVIEW_SHARING_REDIRECT_FIX.md)

2. Review Netlify function logs

3. Test with the validators above

4. Create a minimal reproduction case

5. Check Netlify Community Forums or Supabase Discord
