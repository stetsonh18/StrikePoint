# Deployment Guide

This guide explains how to deploy StrikePoint to production.

## Architecture

The application uses a **serverless architecture** with Supabase:

```
Frontend (Static Site)
  ↓
Supabase (Backend-as-a-Service)
  ├─→ Database (PostgreSQL)
  ├─→ Authentication
  ├─→ Storage
  └─→ Edge Functions (API Gateway)
       └─→ External APIs (MarketData, Finnhub, etc.)
```

## Frontend Deployment

### Option 1: Netlify (Recommended)

**Advantages:**
- Free tier available
- Automatic deployments from Git
- Built-in CI/CD
- Easy environment variable management

**Steps:**

1. **Connect Repository:**
   - Sign up at https://netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub/GitLab repository

2. **Configure Build Settings:**
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 18 (or higher)

3. **Set Environment Variables:**
   In Netlify dashboard → Site settings → Environment variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```
   
   **Note:** `VITE_SENTRY_DSN` is optional but recommended for production error tracking.

4. **Deploy:**
   - Netlify will automatically deploy on push to main branch
   - Or click "Deploy site" to deploy immediately

5. **Configure Redirects:**
   The `public/_redirects` file is already configured for SPA routing:
   ```
   /*    /index.html   200
   ```

### Option 2: Vercel

**Steps:**

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Set Environment Variables:**
   In Vercel dashboard → Project settings → Environment variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```
   
   **Note:** `VITE_SENTRY_DSN` is optional but recommended for production error tracking.

4. **Configure:**
   - Framework preset: Vite
   - Build command: `npm run build`
   - Output directory: `dist`

### Option 3: GitHub Pages

**Steps:**

1. **Install gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Add to package.json:**
   ```json
   {
     "scripts": {
       "deploy": "npm run build && gh-pages -d dist"
     }
   }
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   ```

**Note:** GitHub Pages requires environment variables to be set in GitHub Actions or use a different approach for secrets.

## Supabase Configuration

### 1. Deploy Edge Functions

Edge Functions handle API calls to external services. Deploy them to Supabase:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy generate-insights
```

### 2. Configure Edge Function Secrets

Set API keys in Supabase Secrets (these are server-side only):

```bash
# Set secrets via CLI
supabase secrets set MARKETDATA_API_TOKEN=your_token
supabase secrets set FINNHUB_API_KEY=your_key
supabase secrets set COINGECKO_API_KEY=your_key
supabase secrets set OPENAI_API_KEY=your_key
supabase secrets set OPENAI_MODEL=gpt-4o-mini
```

Or via Supabase Dashboard:
1. Go to **Settings** → **Edge Functions** → **Secrets**
2. Add each secret key-value pair

### 3. Database Setup

1. **Run Schema File:**
   - Open Supabase SQL Editor
   - Run `database/schema/consolidated_schema.sql`
   - This single file contains all tables, indexes, RLS policies, and views

2. **Verify RLS Policies:**
   - All tables should have Row Level Security enabled
   - Policies should allow users to access only their own data

3. **Set Up Indexes:**
   - Indexes are included in schema files
   - Verify they're created for performance

## Environment Variables

### Required for Frontend

These must be set in your hosting platform (Netlify, Vercel, etc.):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

**Optional:**
- `VITE_SENTRY_ENABLE_DEV` - Set to `true` to enable Sentry in development (default: disabled)
- `VITE_APP_VERSION` - App version for release tracking (e.g., `1.0.0`)
- `VITE_ANALYTICS_ENABLED` - Set to `true` to enable analytics in development (default: disabled)
- `VITE_GA4_MEASUREMENT_ID` - Google Analytics 4 Measurement ID (e.g., `G-XXXXXXXXXX`)
- `VITE_PLAUSIBLE_DOMAIN` - Plausible domain for privacy-focused analytics

### Required for Edge Functions

These are set in Supabase Secrets (not in frontend):

- `MARKETDATA_API_TOKEN` - MarketData.app API token
- `FINNHUB_API_KEY` - Finnhub API key
- `COINGECKO_API_KEY` - CoinGecko API key (optional)
- `TRADIER_API_KEY` - Tradier API key (optional)
- `OPENAI_API_KEY` - OpenAI API key (for AI Insights)
- `OPENAI_MODEL` - Model name (default: `gpt-4o-mini`)
- `SUPABASE_URL` - Auto-set by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-set by Supabase

## Custom Domain Setup

### Netlify

1. Go to **Domain settings** → **Add custom domain**
2. Follow DNS configuration instructions
3. SSL certificate is automatically provisioned

### Vercel

1. Go to **Settings** → **Domains**
2. Add your domain
3. Configure DNS as instructed
4. SSL is automatic

## Monitoring & Maintenance

### Check Edge Function Logs

```bash
# View logs for specific function
supabase functions logs generate-insights

# View all function logs
supabase functions logs
```

Or via Supabase Dashboard:
- Go to **Edge Functions** → Select function → **Logs**

### Database Monitoring

- Use Supabase Dashboard → **Database** → **Logs**
- Monitor query performance
- Check for slow queries

### Error Tracking

**Sentry Integration (Recommended)**

Sentry is already integrated in the codebase. To enable:

1. **Create a Sentry account** at https://sentry.io
2. **Create a new project** (select React)
3. **Get your DSN** from project settings
4. **Set environment variable:**
   ```env
   VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```

**For Source Maps Upload (Optional):**

To upload source maps for better error tracking:

1. **Get Sentry Auth Token:**
   - Go to Sentry → Settings → Auth Tokens
   - Create a new token with `project:releases` scope

2. **Set build-time environment variables:**
   ```env
   SENTRY_AUTH_TOKEN=your-auth-token
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=your-project-slug
   ```

3. **Source maps will be automatically uploaded** during build

**Other Options:**
- **LogRocket** - Session replay
- **Supabase Logs** - Built-in logging

## Security Checklist

- [ ] Environment variables set in hosting platform
- [ ] Supabase Secrets configured for Edge Functions
- [ ] RLS policies enabled on all tables
- [ ] API keys never exposed to frontend
- [ ] HTTPS enabled (automatic on Netlify/Vercel)
- [ ] CORS configured correctly
- [ ] Rate limiting on Edge Functions (if needed)

## Cost Estimates

| Service | Plan | Cost/Month | Notes |
|---------|------|------------|-------|
| Netlify | Free | $0 | 100GB bandwidth, 300 build minutes |
| Vercel | Free | $0 | 100GB bandwidth, unlimited builds |
| Supabase | Free | $0 | 500MB database, 2GB bandwidth |
| Supabase | Pro | $25 | 8GB database, 50GB bandwidth |

**Total for small projects:** $0/month (free tiers)

## Troubleshooting

### Build Failures

- Check Node.js version (should be 18+)
- Verify all dependencies install correctly
- Check build logs for specific errors

### Environment Variables Not Working

- Restart build after adding variables
- Verify variable names start with `VITE_`
- Check for typos in variable names

### Edge Functions Not Working

- Verify functions are deployed: `supabase functions list`
- Check secrets are set: `supabase secrets list`
- Review function logs for errors

### Database Connection Issues

- Verify Supabase project is active
- Check RLS policies allow access
- Ensure user is authenticated

## Next Steps

1. Deploy frontend to Netlify/Vercel
2. Deploy Edge Functions to Supabase
3. Configure Supabase Secrets
4. Test all functionality
5. Set up monitoring
6. Configure custom domain (optional)

## Support

For issues:
- Check Supabase Dashboard logs
- Review Edge Function logs
- Verify environment variables
- Check [Supabase Status](https://status.supabase.com)
