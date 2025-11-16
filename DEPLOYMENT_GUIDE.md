# Express Backend Deployment Guide

This guide explains how to deploy the Express.js backend server to solve the MarketData.app IP whitelisting issue.

## Problem Summary

MarketData.app API requires IP whitelisting for security. The previous architecture used Supabase Edge Functions, which run on cloud infrastructure with dynamic/rotating IP addresses that cannot be whitelisted. This caused 403 Forbidden errors.

**Solution:** Deploy the Express.js backend (`server.js`) to a server with a static IP address, whitelist that IP with MarketData.app, and route all market data API calls through the backend.

## Architecture Overview

```
Frontend (React/Vite)
  ↓
Express Backend (Static IP)
  ↓
MarketData.app API (IP whitelisted)
```

## Local Development Setup

### 1. Create Environment Variables

Create a `.env` file in the project root with your API keys:

```env
# MarketData.app API Token (Required)
MARKETDATA_API_TOKEN=your_marketdata_token_here

# Finnhub API Key (Required for symbol search)
FINNHUB_API_KEY=your_finnhub_key_here

# CoinGecko API Key (Optional - for crypto data)
COINGECKO_API_KEY=your_coingecko_key_here

# Alpha Vantage MCP URL (Optional)
ALPHA_VANTAGE_MCP_URL=http://localhost:3000/mcp

# Server Port (Optional - defaults to 3001)
PORT=3001

# Node Environment
NODE_ENV=development
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Servers

**Option A: Run both frontend and backend together (recommended)**
```bash
npm run dev:all
```

**Option B: Run separately**

Terminal 1 (Backend):
```bash
npm run dev:api
```

Terminal 2 (Frontend):
```bash
npm run dev
```

### 4. Verify Setup

- Backend: http://localhost:3001/api/health
- Frontend: http://localhost:5173

You should see the backend endpoints listed in the terminal output.

## Production Deployment

### Option 1: DigitalOcean Droplet (Recommended)

**Advantages:**
- Simple setup
- Static IP included
- Affordable ($6/month)
- Full control

**Steps:**

1. **Create Droplet:**
   - Create a DigitalOcean account
   - Create a new Droplet (Ubuntu 22.04 LTS)
   - Choose Basic plan ($6/month)
   - Note the static IP address

2. **SSH into Droplet:**
   ```bash
   ssh root@your_droplet_ip
   ```

3. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   apt-get install -y nodejs
   ```

4. **Install PM2 (Process Manager):**
   ```bash
   npm install -g pm2
   ```

5. **Clone Your Repository:**
   ```bash
   git clone https://github.com/yourusername/strikepointv4.git
   cd strikepointv4
   ```

6. **Create Production .env File:**
   ```bash
   nano .env
   ```

   Add your production environment variables:
   ```env
   MARKETDATA_API_TOKEN=your_production_token
   FINNHUB_API_KEY=your_production_key
   COINGECKO_API_KEY=your_production_key
   PORT=3001
   NODE_ENV=production
   ```

7. **Install Dependencies:**
   ```bash
   npm install --production
   ```

8. **Start Server with PM2:**
   ```bash
   pm2 start server.js --name "strikepoint-api"
   pm2 save
   pm2 startup
   ```

9. **Setup Nginx Reverse Proxy (Optional but recommended):**
   ```bash
   apt-get install -y nginx
   ```

   Create Nginx config:
   ```bash
   nano /etc/nginx/sites-available/strikepoint-api
   ```

   Add configuration:
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;  # Or use your IP

       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

   Enable site:
   ```bash
   ln -s /etc/nginx/sites-available/strikepoint-api /etc/nginx/sites-enabled/
   nginx -t
   systemctl restart nginx
   ```

10. **Setup Firewall:**
    ```bash
    ufw allow 22    # SSH
    ufw allow 80    # HTTP
    ufw allow 443   # HTTPS (if using SSL)
    ufw enable
    ```

11. **Whitelist Droplet IP with MarketData.app:**
    - Log in to MarketData.app dashboard
    - Go to API settings
    - Add your Droplet's static IP address to the whitelist

12. **Update Frontend Environment Variable:**

    In your frontend `.env` or `.env.production`:
    ```env
    VITE_API_URL=http://your_droplet_ip/api
    # Or with domain: VITE_API_URL=https://api.yourdomain.com/api
    ```

### Option 2: AWS EC2

**Advantages:**
- Elastic IP (static)
- Scalable
- Integrates with other AWS services

**Steps:**

1. **Launch EC2 Instance:**
   - Choose Amazon Linux 2 or Ubuntu
   - t2.micro (free tier eligible)
   - Configure security group (ports 22, 80, 3001)

2. **Allocate Elastic IP:**
   - AWS Console → EC2 → Elastic IPs
   - Allocate new address
   - Associate with your instance

3. **Follow similar setup steps as DigitalOcean** (SSH, install Node.js, PM2, etc.)

4. **Whitelist Elastic IP with MarketData.app**

### Option 3: Railway.app

**Advantages:**
- Simple deployment from GitHub
- Free tier available
- Automatic HTTPS

**Limitations:**
- Dynamic IP on free tier (need paid plan for static IP)

**Steps:**

1. **Connect GitHub Repository:**
   - Sign up at Railway.app
   - Create new project from GitHub repo

2. **Configure Environment Variables:**
   - Add all required API keys in Railway dashboard

3. **Configure Start Command:**
   ```
   node server.js
   ```

4. **Deploy:**
   - Railway will auto-deploy on git push

5. **Get Static IP (Paid plan required):**
   - Upgrade to Pro plan
   - Request static IP from Railway support

### Option 4: Heroku

**Note:** Heroku requires a paid plan for static IPs via "Static IP" add-on.

**Steps:**

1. **Install Heroku CLI:**
   ```bash
   npm install -g heroku
   ```

2. **Create Heroku App:**
   ```bash
   heroku create your-app-name
   ```

3. **Set Environment Variables:**
   ```bash
   heroku config:set MARKETDATA_API_TOKEN=your_token
   heroku config:set FINNHUB_API_KEY=your_key
   ```

4. **Create Procfile:**
   ```
   web: node server.js
   ```

5. **Deploy:**
   ```bash
   git push heroku main
   ```

6. **Add Static IP Add-on:**
   - Requires paid Heroku plan
   - Install QuotaGuard Static add-on
   - Whitelist the provided IP with MarketData.app

## Frontend Configuration

### Development
No configuration needed - Vite proxy automatically routes `/api` to `http://localhost:3001`

### Production
Set environment variable:
```env
VITE_API_URL=https://your-backend-domain.com/api
```

Or if using IP directly:
```env
VITE_API_URL=http://your_static_ip/api
```

## Monitoring and Maintenance

### Check Server Status (PM2)
```bash
pm2 status
pm2 logs strikepoint-api
pm2 monit
```

### Restart Server
```bash
pm2 restart strikepoint-api
```

### Update Code
```bash
cd strikepointv4
git pull origin main
npm install
pm2 restart strikepoint-api
```

### View Logs
```bash
pm2 logs strikepoint-api --lines 100
```

## Troubleshooting

### 403 Forbidden Errors
- Verify your server's IP is whitelisted with MarketData.app
- Check if your server's IP has changed (use `curl ifconfig.me`)
- Verify `MARKETDATA_API_TOKEN` is correct in `.env`

### CORS Errors
- Backend already has CORS configured
- If issues persist, check Nginx configuration (if using)

### Connection Refused
- Verify backend is running: `pm2 status`
- Check firewall: `ufw status`
- Verify port is open: `netstat -tuln | grep 3001`

### API Key Issues
- Check `.env` file exists and has correct values
- Restart server after updating `.env`: `pm2 restart strikepoint-api`
- Check logs for missing key warnings: `pm2 logs strikepoint-api`

## Security Best Practices

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use HTTPS in production** - Setup SSL certificate with Let's Encrypt
3. **Implement rate limiting** - Consider adding express-rate-limit
4. **Keep dependencies updated** - Run `npm audit` regularly
5. **Monitor logs** - Set up log rotation and monitoring
6. **Backup environment variables** - Store securely in password manager

## Cost Estimates

| Platform | Plan | Cost/Month | Static IP | Notes |
|----------|------|------------|-----------|-------|
| DigitalOcean | Basic Droplet | $6 | ✅ Included | Recommended |
| AWS EC2 | t2.micro | $0-10 | ✅ Free Elastic IP | Free tier available |
| Railway | Pro | $5 | ❌ Contact support | Simple deployment |
| Heroku | Basic | $7 + add-on | ❌ Add-on required | Easy to use |
| Render | Starter | $7 | ❌ Contact support | Auto-deploy from Git |

## Next Steps

1. Choose your deployment platform
2. Deploy the backend server
3. Whitelist the static IP with MarketData.app
4. Update frontend `VITE_API_URL` environment variable
5. Test the integration
6. Monitor for any issues

## Support

For issues or questions:
- Check server logs: `pm2 logs strikepoint-api`
- Review [server.js](./server.js) endpoints documentation
- Verify MarketData.app API status
- Check firewall and network settings
