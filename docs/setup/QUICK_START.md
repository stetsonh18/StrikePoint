# Quick Start Guide

## Local Development Setup

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase project (create one at https://app.supabase.com)
- Git (optional, for cloning)

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Required - Get these from your Supabase project settings
# https://app.supabase.com/project/_/settings/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Optional - Sentry Error Tracking (Recommended for Production)
# Get this from: https://sentry.io/settings/projects/your-project/keys/
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

**Where to find these values:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **Project URL** → `VITE_SUPABASE_URL`
4. Copy the **anon/public** key → `VITE_SUPABASE_ANON_KEY`

### 4. Run Development Server

```bash
npm run dev
```

This starts the Vite development server at **http://localhost:5173**

### 5. Verify Setup

1. Open http://localhost:5173 in your browser
2. You should see the login/landing page
3. Create an account or sign in to test the application

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Application Architecture              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Browser (React/Vite Frontend)                         │
│         │                                               │
│         │ Direct API calls                             │
│         ↓                                               │
│  Supabase Client                                        │
│         │                                               │
│         ├─→ Supabase Database (PostgreSQL)             │
│         ├─→ Supabase Auth                              │
│         ├─→ Supabase Storage                           │
│         └─→ Supabase Edge Functions                    │
│                 │                                       │
│                 ├─→ MarketData.app API                  │
│                 ├─→ Finnhub API                        │
│                 ├─→ CoinGecko API                      │
│                 ├─→ Tradier API                        │
│                 └─→ OpenAI API (for AI Insights)       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## API Keys & Secrets

**Important:** API keys for external services (MarketData, Finnhub, CoinGecko, etc.) are stored in **Supabase Secrets**, not in your `.env` file.

### Setting Up Supabase Secrets

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions** → **Secrets**
3. Add the following secrets:
   - `MARKETDATA_API_TOKEN` - Your MarketData.app API token
   - `FINNHUB_API_KEY` - Your Finnhub API key
   - `COINGECKO_API_KEY` - Your CoinGecko API key (optional)
   - `TRADIER_API_KEY` - Your Tradier API key (optional)
   - `OPENAI_API_KEY` - Your OpenAI API key (for AI Insights)
   - `OPENAI_MODEL` - Model to use (default: `gpt-4o-mini`)

### Edge Functions

The application uses Supabase Edge Functions to securely access external APIs. These functions:
- Keep API keys server-side (never exposed to frontend)
- Handle authentication and rate limiting
- Provide a unified API interface

Edge Functions are located in `supabase/functions/`:
- `marketdata-quote` - Stock quotes
- `marketdata-options-chain` - Options chain data
- `marketdata-options-quote` - Options quotes
- `finnhub-symbol-search` - Symbol search
- `finnhub-news` - Market news
- `coingecko-search` - Crypto symbol search
- `coingecko-markets` - Crypto market data
- `generate-insights` - AI-powered insights

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run type checking
npm run typecheck

# Run linter
npm run lint

# Setup stock transaction codes in database
npm run setup:stock-codes
```

## Database Setup

### Initial Schema

Run the consolidated schema file in your Supabase SQL Editor:

1. Open `database/schema/consolidated_schema.sql`
2. Copy and paste the entire file into the Supabase SQL Editor
3. Execute the script

This single file contains all 11 tables, indexes, RLS policies, triggers, functions, and views in the correct dependency order. All statements use `IF NOT EXISTS`, so it's safe to run multiple times.

**Note:** Stock transaction codes (BUY, SELL, etc.) are also set up using the `npm run setup:stock-codes` command. See `database/schema/README.md` for more details.

### Additional Tables

If you need to add additional tables, check the schema files for:
- AI Insights table (if using AI features)
- Portfolio Snapshots table (if using portfolio history)
- Early adopter preferences (if using early adopter features)

## Troubleshooting

### "Missing Supabase environment variables" error

- Verify `.env` file exists in project root
- Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart the dev server after changing `.env`

### API calls failing (403, 401 errors)

- Verify API keys are set in Supabase Secrets
- Check Edge Functions are deployed: `supabase functions list`
- Review Edge Function logs in Supabase dashboard

### Database connection issues

- Verify Supabase project is active (not paused)
- Check Row Level Security (RLS) policies are set up
- Ensure user is authenticated before accessing data

### Build errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

## Next Steps

1. **Set up database schema** - Run `database/schema/consolidated_schema.sql` in Supabase SQL Editor
2. **Configure Supabase Secrets** - Add API keys for external services
3. **Deploy Edge Functions** - See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
4. **Test the application** - Create an account and add some test data

## Learn More

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production deployment instructions
- [README.md](./README.md) - Project overview
- [Supabase Documentation](https://supabase.com/docs) - Supabase platform docs

## Summary

✅ **Simple Setup**: Just 2 environment variables needed  
✅ **Secure**: API keys stored in Supabase Secrets  
✅ **Fast Development**: Hot module replacement with Vite  
✅ **Production Ready**: Deploy to Netlify, Vercel, or any static host  

Happy trading! 📈
