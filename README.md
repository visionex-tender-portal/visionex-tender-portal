# Visionex Solutions Tender Portal - Prototype

## What It Does

24/7 automated tracker for Australian construction tenders:
- ✅ Scrapes AusTender (federal contracts)
- ✅ Filters construction-related keywords
- ✅ Real-time dashboard
- ✅ Filter by state
- ✅ Auto-refresh every 30 minutes
- ⏳ State portals (Phase 2)
- ⏳ Defence tenders (Phase 2)

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (embedded, no separate server needed)
- **Scraper:** AusTender OCDS API
- **Frontend:** Clean HTML/CSS/JS dashboard
- **Scheduler:** node-cron (runs 24/7)

## Data Captured

For each tender:
- Title, description
- Buyer (government department)
- Supplier (if awarded)
- Contract value ($AUD)
- Date signed
- State/locality
- Category (roads, buildings, infrastructure, defence)
- Construction flag (auto-detected)

## Running Locally

```bash
cd /data/.openclaw/workspace/tender-portal
npm install
node server.js
```

Open: http://localhost:3000

## Running 24/7

Deploy to Railway/Render:
1. Push to GitHub
2. Connect to Railway
3. Deploy (auto-detects Node.js)
4. Get live URL

Cost: ~$20-50/month

## API Endpoints

- `GET /api/tenders?state=NSW&limit=50` - Get tenders
- `GET /api/stats` - Get counts
- `POST /api/scrape` - Trigger manual scrape

## Construction Keywords

Auto-detects these keywords in title/description:
- construction, building, infrastructure
- road, bridge, civil works
- demolition, renovation, refurbishment
- fit-out, structural, architectural
- earthworks, concrete, steel, fabrication

## Phase 2 (Next)

- [ ] Add state tender portals (NSW, VIC, QLD, SA, WA, TAS, ACT, NT)
- [ ] Add Defence tenders portal
- [ ] User accounts (save searches)
- [ ] Email alerts for new tenders
- [ ] Value/category filters
- [ ] Export to CSV
- [ ] Tender analytics/trends

## Status

**Prototype complete** - AusTender scraping operational
**Time taken:** ~1.5 hours
**Next:** Deploy + add state portals
