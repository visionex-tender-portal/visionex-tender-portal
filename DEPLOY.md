# Deploy Visionex Tender Portal

## Option 1: Railway (Recommended - Easiest)

### Step 1: Push to GitHub

```bash
# Create new repo on GitHub: github.com/new
# Name it: visionex-tender-portal

cd /data/.openclaw/workspace/tender-portal
git remote add origin https://github.com/YOUR_USERNAME/visionex-tender-portal.git
git push -u origin master
```

### Step 2: Deploy to Railway

1. Go to: https://railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose: `visionex-tender-portal`
6. Railway auto-detects Node.js and deploys

**That's it!** Railway will:
- Install dependencies
- Start the server
- Give you a URL like: `visionex-tender-portal.up.railway.app`
- Auto-deploy on git push

### Step 3: Custom Domain (Optional)

1. In Railway project → Settings → Domains
2. Add custom domain: `tenders.visionexsolutions.com.au`
3. Point DNS CNAME to Railway URL

**Cost:** $5-20/month (Railway)

---

## Option 2: Render

### Step 1: Push to GitHub (same as above)

### Step 2: Deploy to Render

1. Go to: https://render.com
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect GitHub repo: `visionex-tender-portal`
5. Settings:
   - **Name:** visionex-tender-portal
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Click "Create Web Service"

**URL:** `visionex-tender-portal.onrender.com`

**Cost:** $7/month (Render)

---

## Option 3: Self-Host (VPS)

If you have a server (DigitalOcean, Vultr, etc.):

```bash
# SSH into server
ssh your-server

# Clone repo
git clone https://github.com/YOUR_USERNAME/visionex-tender-portal.git
cd visionex-tender-portal

# Install dependencies
npm install

# Install PM2 (process manager)
npm install -g pm2

# Start server (runs 24/7)
pm2 start server.js --name tender-portal
pm2 save
pm2 startup

# Setup Nginx reverse proxy (optional)
# Point domain to server
```

**Cost:** $5-10/month (VPS)

---

## Environment Variables (Production)

For production, you might want to add:

```env
PORT=8080
NODE_ENV=production
```

(Railway/Render handle PORT automatically)

---

## Post-Deployment

1. Visit your live URL
2. Test scraping: Click "Scrape Now" button
3. Verify data appears
4. Set up monitoring (optional)

---

## What You'll Have

✅ Public URL accessible from anywhere
✅ 24/7 uptime
✅ Auto-scraping every 30 minutes
✅ SSL certificate (automatic on Railway/Render)
✅ Auto-deploy on git push

---

## Next Steps After Deploy

1. **Custom Domain:** Point `tenders.visionexsolutions.com.au` to it
2. **Add State Portals:** Extend scraping to NSW, VIC, QLD, etc.
3. **User Accounts:** Login system to save searches
4. **Email Alerts:** Notify when matching tenders appear
5. **API:** Expose data for other apps

---

## Need Help?

If you want me to do the deployment, I need:

1. **GitHub account username** (to create the repo)
2. **Railway or Render account** (or I can guide you through signup)
3. **Access token** (if you want me to push directly)

Or just follow the steps above - takes 5 minutes!
