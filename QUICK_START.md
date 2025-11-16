# Quick Start Guide

## The IP Address Problem & Solution

### Problem
You were getting 403 Forbidden errors from MarketData.app because:
- MarketData.app requires IP whitelisting for security
- Your app was using Supabase Edge Functions (cloud infrastructure with rotating IPs)
- Rotating IPs cannot be whitelisted

### Solution
Use an Express.js backend with a **static IP address** that can be whitelisted with MarketData.app.

## Local Development (Start Here!)

### 1. Create `.env` file

Create a `.env` file in the project root:

```env
MARKETDATA_API_TOKEN=your_marketdata_token
FINNHUB_API_KEY=your_finnhub_key
COINGECKO_API_KEY=your_coingecko_key
PORT=3001
NODE_ENV=development
```

### 2. Run Everything

```bash
npm run dev:all
```

This starts:
- ✅ Vite frontend dev server (http://localhost:5173)
- ✅ Express backend API server (http://localhost:3001)

### 3. Test It Works

Visit http://localhost:5173 - your app should load without 403 errors!

## What Changed?

### Before (Supabase Edge Functions)
```
Frontend → Supabase Edge Functions → MarketData.app
                ❌ Dynamic IP (403 Forbidden)
```

### After (Express Backend)
```
Frontend → Express Backend → MarketData.app
              ✅ Static IP (Whitelisted)
```

## Files Modified

1. **[server.js](./server.js)** - Removed deprecation warnings, added options endpoints
2. **[src/infrastructure/services/marketDataService.ts](./src/infrastructure/services/marketDataService.ts)** - Updated to use Express backend
3. **[src/infrastructure/services/optionsMarketDataService.ts](./src/infrastructure/services/optionsMarketDataService.ts)** - Updated to use Express backend
4. **[vite.config.ts](./vite.config.ts)** - Enabled proxy to route `/api` to backend
5. **[package.json](./package.json)** - Updated scripts to run Express server

## Development Commands

```bash
# Run both frontend + backend
npm run dev:all

# Run only frontend (Vite)
npm run dev

# Run only backend (Express)
npm run dev:api

# Build for production
npm run build
```

## Next Steps for Production

1. **Deploy Backend**: Follow [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
   - Recommended: DigitalOcean Droplet ($6/month, includes static IP)

2. **Whitelist Static IP**:
   - Log in to MarketData.app dashboard
   - Add your server's static IP to the whitelist

3. **Update Frontend**:
   ```env
   VITE_API_URL=http://your_server_ip/api
   ```

4. **Deploy Frontend**:
   - Build: `npm run build`
   - Deploy `dist/` folder to Netlify, Vercel, or any static host

## Troubleshooting

### Still getting 403 errors?
- ✅ Check `.env` has `MARKETDATA_API_TOKEN`
- ✅ Verify backend is running: http://localhost:3001/api/health
- ✅ Check backend logs for errors

### Backend won't start?
```bash
# Check if port 3001 is already in use
netstat -ano | findstr :3001

# Kill the process or change PORT in .env
```

### Frontend can't connect to backend?
- ✅ Verify backend is running on port 3001
- ✅ Check [vite.config.ts](./vite.config.ts) proxy settings
- ✅ Look for CORS errors in browser console

## API Endpoints

The Express backend exposes these endpoints:

### Health Check
```
GET /api/health
```

### Stock Data (MarketData.app)
```
GET /api/marketdata/quote/:symbol
```

### Options Data (MarketData.app)
```
GET /api/marketdata/options/chain?underlyingSymbol=AAPL
GET /api/marketdata/options/quote/:optionSymbol
```

### Symbol Search (Finnhub)
```
GET /api/finnhub/symbol-search?keywords=AAPL
GET /api/finnhub/news?category=general
```

### Crypto (CoinGecko)
```
GET /api/coingecko/search?query=bitcoin
GET /api/coingecko/markets?ids=bitcoin,ethereum
```

## Environment Variables

### Required for Local Development
```env
MARKETDATA_API_TOKEN=xxx  # MarketData.app token
FINNHUB_API_KEY=xxx       # Finnhub API key
```

### Optional
```env
COINGECKO_API_KEY=xxx          # For crypto data
ALPHA_VANTAGE_MCP_URL=xxx      # For alternative symbol search
PORT=3001                      # Backend port (default 3001)
NODE_ENV=development           # Environment
```

### Production (Frontend)
```env
VITE_API_URL=http://your_server_ip/api  # Backend API URL
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Development                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Browser (localhost:5173)                               │
│         │                                               │
│         │ /api/* (proxied by Vite)                     │
│         ↓                                               │
│  Express Backend (localhost:3001)                       │
│         │                                               │
│         ├─→ MarketData.app API (stock/options quotes)  │
│         ├─→ Finnhub API (symbol search, news)          │
│         └─→ CoinGecko API (crypto data)                │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    Production                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Static Host (Netlify/Vercel)                           │
│  https://yourapp.com                                    │
│         │                                               │
│         │ AJAX calls to VITE_API_URL                   │
│         ↓                                               │
│  DigitalOcean Droplet (Static IP: xxx.xxx.xxx.xxx)     │
│  Express Backend                                        │
│         │                                               │
│         ├─→ MarketData.app API ✅ IP Whitelisted       │
│         ├─→ Finnhub API                                │
│         └─→ CoinGecko API                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Learn More

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Detailed deployment instructions
- [server.js](./server.js) - Backend server implementation
- [ENV_SETUP.md](./ENV_SETUP.md) - Environment variables reference (if it exists)

## Summary

✅ **Problem Solved**: Express backend provides stable IP for MarketData.app whitelisting
✅ **Local Dev**: Run `npm run dev:all` to start everything
✅ **Production Ready**: Deploy backend to get static IP, whitelist it, done!

Happy trading! 📈
