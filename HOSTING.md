# ONE Platform — Hosting Guide
## Three options: Free Student, Cheap Production, Full Scale

---

## OPTION A — Free (Perfect for hackathon / student)

### Database: Neon (free PostgreSQL)
1. Go to **https://neon.tech** → Sign up free
2. Create project → name it `one-platform`
3. Copy the connection string — looks like:
   `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/one_platform?sslmode=require`
4. Paste it as `DATABASE_URL` in your `.env`

### Backend + Frontend: Railway (free tier)
1. Go to **https://railway.app** → Sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Connect your repo
4. Add environment variables:
   - `DATABASE_URL` = your Neon connection string
   - `ANTHROPIC_API_KEY` = your key
   - `NODE_ENV` = production
   - `PORT` = 3001
5. Railway auto-detects Node.js and deploys

Your app is live at: `https://one-platform-xxxx.railway.app`

**Cost: $0** (free tier gives 500 hours/month)

---

## OPTION B — Cheap production (~$7/month total)

### Database: Neon Pro or Supabase ($0–5/month)
- **Neon**: https://neon.tech — $0 free, $19/mo pro
- **Supabase**: https://supabase.com — $0 free, $25/mo pro
- Both give you a PostgreSQL URL to paste in `.env`

### Backend: Render ($7/month)
1. Go to **https://render.com** → Sign up
2. New → **Web Service** → connect GitHub repo
3. Settings:
   - **Build Command**: `npm install && cd client && npm install && npm run build`
   - **Start Command**: `node server/index.js`
   - **Environment**: Node
4. Add environment variables (same as Railway above)
5. Deploy

### Frontend: Vercel (free)
For even better performance, deploy the frontend separately:
1. Go to **https://vercel.com** → Import GitHub repo
2. Set **Root Directory** to `client`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add env var: `VITE_API_URL=https://your-render-backend.onrender.com`

Then in `client/vite.config.js`, update the proxy or use the env var for API calls.

---

## OPTION C — Full production scale (VPS + nginx + PM2)

### Step 1 — Get a server
- **DigitalOcean Droplet**: $6/month (1GB RAM, 1 CPU) — https://digitalocean.com
- **AWS EC2**: t3.micro free tier for 12 months
- **Hetzner**: €4/month (cheapest, EU-based) — https://hetzner.com

Recommended: Ubuntu 22.04 LTS

### Step 2 — Server initial setup
SSH into your server then run:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install nginx
sudo apt install -y nginx

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install certbot for free SSL
sudo apt install -y certbot python3-certbot-nginx
```

### Step 3 — Set up PostgreSQL on the server
```bash
sudo -u postgres psql

# Inside psql:
CREATE USER oneuser WITH PASSWORD 'your-strong-password-here';
CREATE DATABASE one_platform OWNER oneuser;
GRANT ALL PRIVILEGES ON DATABASE one_platform TO oneuser;
\q
```

Your DATABASE_URL will be:
`postgresql://oneuser:your-strong-password-here@localhost:5432/one_platform`

### Step 4 — Deploy the code
```bash
# On your server:
cd /home/ubuntu
git clone https://github.com/yourusername/one-platform.git
cd one-platform

# Create .env file
nano .env
# Paste your environment variables

# Install dependencies
npm install
cd client && npm install && npm run build && cd ..

# Create logs directory
mkdir -p logs
```

### Step 5 — Start with PM2 (cluster mode)
```bash
# Start 4 Node.js processes (one per CPU core)
pm2 start ecosystem.config.js --env production

# Check it's running
pm2 status
pm2 logs

# Auto-start on server reboot
pm2 save
pm2 startup
# Copy and run the command it gives you
```

### Step 6 — Configure nginx
```bash
# Point your domain to the server IP in your DNS provider first
# Then:

sudo cp nginx.conf /etc/nginx/sites-available/one-platform
sudo ln -s /etc/nginx/sites-available/one-platform /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Edit the file to replace "one.yourdomain.com" with your actual domain
sudo nano /etc/nginx/sites-available/one-platform

# Test config
sudo nginx -t

# Get free SSL certificate (replace with your domain)
sudo certbot --nginx -d one.yourdomain.com

# Reload nginx
sudo systemctl reload nginx
```

### Step 7 — Zero-downtime deploys (after first setup)
```bash
# Pull latest code and reload without dropping connections
git pull origin main
npm install
cd client && npm run build && cd ..
pm2 reload one-platform
```

---

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `ANTHROPIC_API_KEY` | Your Claude API key | `sk-ant-api03-...` |
| `PORT` | Backend port | `3001` |
| `NODE_ENV` | Environment | `production` |
| `CORS_ORIGIN` | Allowed frontend origin | `https://one.yourdomain.com` |

---

## CI/CD Setup (GitHub Actions)

1. Push code to GitHub
2. Go to repo → **Settings** → **Secrets and variables** → **Actions**
3. Add these secrets:
   - `RAILWAY_TOKEN` — from Railway dashboard → Account Settings → Tokens
   - `RAILWAY_URL` — your Railway app URL
4. Every push to `main` now auto-deploys

The `.github/workflows/ci.yml` file handles:
- ✅ Syntax checking all server files
- ✅ Running all Jest tests
- ✅ Building the React frontend
- ✅ Auto-deploying to Railway on merge to main

---

## Quick comparison

| | Railway Free | Render $7 | VPS $6 |
|--|--|--|--|
| Setup time | 5 minutes | 10 minutes | 1 hour |
| Custom domain | ✅ | ✅ | ✅ |
| SSL | Auto | Auto | Manual (certbot) |
| Load balancing | ❌ | ❌ | ✅ nginx + PM2 |
| Control | Low | Medium | Full |
| Best for | Hackathon | Small production | Real deployment |
