# StrikePoint v4.5

A comprehensive trading journal application built with React, TypeScript, and Supabase.

## Features

- 📊 **Portfolio Tracking** - Track stocks, options, crypto, and futures
- 📈 **Real-time Market Data** - Live quotes and market information
- 📝 **Trading Journal** - Detailed transaction logging and analysis
- 💰 **Cash Management** - Track cash balances and transactions
- 🔍 **Options Chain** - View and analyze options chains
- 📰 **Market News** - Stay updated with market news
- 🤖 **AI Insights** - Get AI-powered trading insights

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Express.js (for API proxy)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Fetching**: TanStack Query

## Quick Start

See [QUICK_START.md](./QUICK_START.md) for local development setup.

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
   VITE_API_URL=https://your_backend_url/api
   ```
4. **Deploy**: Netlify will automatically deploy on push to main branch

### Environment Variables

The app requires these environment variables in Netlify:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_API_URL` (optional) - Backend API URL (defaults to `/api` for development)

## Documentation

- [QUICK_START.md](./QUICK_START.md) - Local development guide
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Production deployment guide
- [DIGITALOCEAN_SETUP.md](./DIGITALOCEAN_SETUP.md) - Backend server setup guide

## License

Private project
