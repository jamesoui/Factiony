# Netlify Environment Variables Setup

## Required Environment Variables for OG Images

The dynamic OG image generation system requires the following environment variables to be configured in your Netlify project.

## Setup Instructions

### 1. Go to Netlify Dashboard

1. Log in to [Netlify](https://app.netlify.com/)
2. Select your project (Factiony)
3. Go to **Site settings** → **Environment variables**

### 2. Add the Following Variables

#### SUPABASE_URL
- **Key**: `SUPABASE_URL`
- **Value**: `https://ffcocumtwoyydgsuhwxi.supabase.co`
- **Scope**: All scopes (Build time, Functions, Deploy Preview, Branch deploys)

#### SUPABASE_SERVICE_ROLE_KEY
- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: Get this from your Supabase dashboard:
  1. Go to https://supabase.com/dashboard/project/ffcocumtwoyydgsuhwxi/settings/api
  2. Copy the `service_role` key (NOT the anon key)
  3. ⚠️ **Keep this secret!** Never commit to Git or expose in client code
- **Scope**: Functions only (NOT build time - this is a secret key)

#### SUPABASE_ANON_KEY (if not already set)
- **Key**: `SUPABASE_ANON_KEY`
- **Value**: Get this from your Supabase dashboard:
  1. Go to https://supabase.com/dashboard/project/ffcocumtwoyydgsuhwxi/settings/api
  2. Copy the `anon` / `public` key
- **Scope**: All scopes

### 3. Verify Configuration

After adding the variables:

1. Go to **Deploys**
2. Click **Trigger deploy** → **Clear cache and deploy site**
3. Wait for deployment to complete
4. Test the OG image endpoint:
   ```bash
   curl https://factiony.com/og/review/YOUR-REVIEW-ID.png > test.png
   ```

## What Each Variable Does

### SUPABASE_URL
- Used by edge functions to connect to your Supabase database
- Required for fetching review, game, and user data
- Safe to expose (it's public anyway)

### SUPABASE_SERVICE_ROLE_KEY
- **SECRET KEY** - Bypasses Row Level Security (RLS)
- Required to read data from protected tables:
  - `game_ratings` (review data)
  - `games` (game info)
  - `users` (usernames)
- ⚠️ **NEVER expose this in client code or commit to Git**
- Only used server-side in Netlify Edge Functions

### SUPABASE_ANON_KEY
- Public key used by client-side code
- Already should be set for your frontend
- Respects RLS policies

## Security Notes

### ✅ Safe to Expose
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

These are meant to be used in client-side code and are safe to expose.

### 🔒 MUST Keep Secret
- `SUPABASE_SERVICE_ROLE_KEY`

This key has admin access and bypasses all security rules. Only use in:
- Netlify Edge Functions
- Supabase Edge Functions
- Secure backend services

**Never:**
- Commit to Git
- Use in client-side JavaScript
- Share publicly
- Log in error messages

## Troubleshooting

### OG images not generating
```bash
# Check Netlify function logs
# Go to: Netlify Dashboard → Functions → og-review
```

**Common issues:**
1. `SUPABASE_SERVICE_ROLE_KEY` not set → Returns 500 error
2. Wrong service role key → Returns "Configuration error"
3. Review ID doesn't exist → Returns 404
4. Tables don't exist → Check Supabase migrations

### Environment variables not working

**After changing variables:**
1. Clear cache and redeploy
2. Check that scope includes "Functions"
3. Verify key names match exactly (case-sensitive)

### How to test locally

Netlify Edge Functions can be tested locally with Netlify CLI:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Create .env file (DON'T COMMIT)
echo 'SUPABASE_URL=https://ffcocumtwoyydgsuhwxi.supabase.co' > .env
echo 'SUPABASE_SERVICE_ROLE_KEY=your-key-here' >> .env
echo 'SUPABASE_ANON_KEY=your-anon-key' >> .env

# Run dev server
netlify dev

# Test OG endpoint
curl http://localhost:8888/og/review/YOUR-REVIEW-ID.png > test.png
```

## Related Documentation

- [OG_IMAGE_DYNAMIC_GENERATION.md](./OG_IMAGE_DYNAMIC_GENERATION.md) - Full OG image system
- [REVIEW_SHARING_REDIRECT_FIX.md](./REVIEW_SHARING_REDIRECT_FIX.md) - Review sharing flow
- Netlify Edge Functions: https://docs.netlify.com/edge-functions/overview/
- Supabase Service Role: https://supabase.com/docs/guides/api/api-keys

## Quick Reference

| Variable | Type | Where to Use | Required For |
|----------|------|--------------|--------------|
| `SUPABASE_URL` | Public | Everywhere | All Supabase connections |
| `SUPABASE_ANON_KEY` | Public | Client + Functions | Frontend RLS-protected queries |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Functions only | OG image generation, admin operations |
