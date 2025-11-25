# Sentry Error Tracking Setup Guide

This guide explains how to set up and configure Sentry error tracking for StrikePoint.

## Quick Start

1. **Create a Sentry Account**
   - Go to https://sentry.io and sign up
   - Create a new organization (or use existing)

2. **Create a New Project**
   - Click "Create Project"
   - Select **React** as the platform
   - Give it a name (e.g., "strikepoint-frontend")
   - Click "Create Project"

3. **Get Your DSN**
   - After creating the project, you'll see your DSN
   - It looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`
   - Copy this DSN

4. **Set Environment Variable**

   **For Local Development:**
   - Create a `.env` file in the project root (if it doesn't exist)
   - Add the DSN:
   ```env
   VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```
   
   **For Production (Netlify):**
   - Go to Netlify Dashboard → Your Site → Site Settings → Environment Variables
   - Click "Add variable"
   - Key: `VITE_SENTRY_DSN`
   - Value: `https://your-dsn@sentry.io/project-id`
   - Click "Save"
   
   **For Production (Vercel):**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Click "Add New"
   - Key: `VITE_SENTRY_DSN`
   - Value: `https://your-dsn@sentry.io/project-id`
   - Select environments (Production, Preview, Development)
   - Click "Save"

5. **Deploy**
   - Sentry will automatically start tracking errors after deployment

## Optional: Source Maps Upload

For better error tracking with readable stack traces, upload source maps:

1. **Get Sentry Auth Token**
   - Go to Sentry → Settings → Auth Tokens
   - Click "Create New Token"
   - Name: "Source Maps Upload"
   - Scopes: Select `project:releases`
   - Click "Create Token"
   - **Copy the token immediately** (you won't see it again)

2. **Get Your Org and Project Slugs**
   - Org slug: Found in Sentry URL or Settings → Organization Settings
   - Project slug: Found in Project Settings → Client Keys (DSN)

3. **Set Build-Time Environment Variables**
   
   **For Netlify:**
   - Go to Site Settings → Build & Deploy → Environment
   - Add these variables:
   ```env
   SENTRY_AUTH_TOKEN=your-auth-token-here
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=your-project-slug
   ```

   **For Vercel:**
   - Go to Project Settings → Environment Variables
   - Add the same variables

   **For Local Builds:**
   - Add to `.env.local` (don't commit this file):
   ```env
   SENTRY_AUTH_TOKEN=your-auth-token-here
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=your-project-slug
   ```

4. **Build and Deploy**
   - Source maps will be automatically uploaded during build
   - Errors will now show original source code in Sentry

## Features Enabled

✅ **Error Tracking**
- All errors logged via `logger.error()` are sent to Sentry
- React Error Boundaries automatically capture errors
- Unhandled promise rejections are captured

✅ **Performance Monitoring**
- 10% of transactions sampled in production
- 100% in development (when enabled)
- Tracks API calls to Supabase
- Tracks React Router navigation

✅ **User Context**
- Automatically sets user ID, email, and name when logged in
- Clears user context on logout

✅ **Session Replay** (Optional)
- 10% of error sessions recorded
- Can be enabled for more sessions if needed

✅ **Filtering**
- Ignores browser extension errors
- Ignores known non-critical errors (ResizeObserver, etc.)
- Filters out non-app URLs

## Development Mode

By default, Sentry is **disabled in development** to avoid noise.

To enable in development:
```env
VITE_SENTRY_ENABLE_DEV=true
```

## Testing Sentry

1. **Test Error Tracking:**
   ```typescript
   import { logger } from '@/shared/utils/logger';
   
   // This will be sent to Sentry in production
   logger.error('Test error', new Error('This is a test'));
   ```

2. **Test Error Boundary:**
   - Trigger a React error in a component
   - It will be automatically captured

3. **Check Sentry Dashboard:**
   - Go to your Sentry project
   - Check "Issues" tab
   - You should see the test errors

## Monitoring

After setup, monitor:

- **Issues**: All errors and exceptions
- **Performance**: Transaction traces and slow operations
- **Releases**: Track which version introduced errors
- **Users**: See which users are affected

## Troubleshooting

**Sentry not capturing errors:**
- Check that `VITE_SENTRY_DSN` is set correctly
- Check browser console for Sentry initialization errors
- Verify DSN format is correct

**Source maps not working:**
- Check that `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are set
- Check build logs for Sentry upload messages
- Verify source maps are generated (`sourcemap: 'hidden'` in vite.config.ts)

**Too many errors in development:**
- Sentry is disabled in dev by default
- Set `VITE_SENTRY_ENABLE_DEV=true` only when needed

## Cost

Sentry offers a **free tier** with:
- 5,000 errors/month
- 10,000 performance units/month
- 1 project
- 1 team member

This is usually sufficient for small to medium applications.

## Next Steps

1. Set up alerts for critical errors
2. Configure release tracking
3. Set up performance budgets
4. Add custom tags for better filtering

