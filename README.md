# StrikePoint v4.5

A comprehensive trading journal application built with React, TypeScript, and Supabase.

**🚀 Production Ready** - All critical production features implemented including error tracking, performance monitoring, analytics, and security headers.

## Features

- 📊 **Portfolio Tracking** - Track stocks, options, crypto, and futures
- 📈 **Real-time Market Data** - Live quotes and market information
- 📝 **Trading Journal** - Detailed transaction logging and analysis
- 💰 **Cash Management** - Track cash balances and transactions
- 🔍 **Options Chain** - View and analyze options chains
- 📰 **Market News** - Stay updated with market news
- 🤖 **AI Insights** - Get AI-powered trading insights
- 🧭 **Strategy Hub** - Craft AI-assisted playbooks per asset type and monitor alignment

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Supabase (Backend-as-a-Service)
  - Database: PostgreSQL
  - Authentication
  - Storage
  - Edge Functions (API Gateway)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query

## Quick Start

See [QUICK_START.md](./docs/setup/QUICK_START.md) for local development setup.

## Deployment

### Netlify Deployment

1. **Connect Repository**: Link your GitHub repository to Netlify
2. **Build Settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Environment Variables** (Required):
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   
   **Optional (Recommended for Production):**
   ```
   VITE_SENTRY_DSN=your_sentry_dsn
   ```
4. **Deploy**: Netlify will automatically deploy on push to main branch

### Environment Variables

The app requires these environment variables:

**Frontend (Netlify/Vercel/etc.):**
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_SENTRY_DSN` - (Optional) Sentry DSN for error tracking
- `VITE_SENTRY_ENABLE_DEV` - (Optional) Set to `true` to enable Sentry in development
- `VITE_ANALYTICS_ENABLED` - (Optional) Set to `true` to enable analytics in development
- `VITE_GA4_MEASUREMENT_ID` - (Optional) Google Analytics 4 Measurement ID

**Backend (Supabase Secrets):**
API keys for external services are stored in Supabase Secrets (not in frontend env vars):
- `MARKETDATA_API_TOKEN` - MarketData.app API token
- `FINNHUB_API_KEY` - Finnhub API key
- `COINGECKO_API_KEY` - CoinGecko API key (optional)
- `OPENAI_API_KEY` - OpenAI API key (for AI Insights)

## Testing

### E2E Tests

E2E tests are located in the `e2e/` directory using Playwright.

#### Environment Variables

The E2E tests require test credentials to be set via environment variables for security.

**Setup:**

1. Copy `.env.test.example` to `.env.test`:
   ```bash
   cp .env.test.example .env.test
   ```

2. Edit `.env.test` and add your test credentials:
   ```
   TEST_EMAIL=your-test-email@example.com
   TEST_PASSWORD=your-test-password
   ```

3. The `.env.test` file is gitignored and will not be committed.

#### Running Tests

Tests will automatically read from environment variables. You can set them in several ways:

**Option 1: Using .env.test file (recommended)**
```bash
# Load .env.test and run tests
export $(cat .env.test | xargs) && npx playwright test
```

**Option 2: Set environment variables directly**
```bash
TEST_EMAIL=your-email@example.com TEST_PASSWORD=your-password npx playwright test
```

**Option 3: Use a shell script**
Create a `run-tests.sh` script:
```bash
#!/bin/bash
set -a
source .env.test
set +a
npx playwright test
```

#### Security Note

- Never commit `.env.test` to version control
- Use a dedicated test account, not your production account
- The `.env.test` file is already in `.gitignore`

## Documentation

### Setup Guides
- [Quick Start](./docs/setup/QUICK_START.md) - Local development guide
- [Deployment Guide](./docs/setup/DEPLOYMENT_GUIDE.md) - Production deployment guide
- [Stripe Setup](./docs/setup/STRIPE_SETUP.md) - Payment integration setup
- [Sentry Setup](./docs/setup/SENTRY_SETUP.md) - Error tracking setup
- [Free Trial Explanation](./docs/setup/FREE_TRIAL_EXPLANATION.md) - How free trials work
- [Futures Contract Specs](./docs/setup/FUTURES_CONTRACT_SPECS_USAGE.md) - Futures table documentation

## License

Private project
