# Australia's Largest Tender Database - Roadmap

## Vision
Build the most comprehensive construction tender database in Australia by aggregating:
- **Federal contracts** (AusTender)
- **8 state/territory government portals**  
- **560+ local councils**
- **Both awarded and live/open tenders**

## Current Status

### ✅ Phase 1: Foundation (COMPLETE)
- Enterprise-grade dashboard UI
- Multi-source scraper architecture
- AusTender integration (33 construction projects from last 12 months)
- Smart categorization (Defence, Hospitals, Schools, Roads, etc.)
- Advanced filtering (category, state, value range, search)
- CSV export
- Analytics dashboard

### 🔄 Phase 2: State Government Sources (IN PROGRESS)

#### Priority States (Highest Volume):
1. **NSW eTendering** - tenders.nsw.gov.au
   - Status: Framework ready, needs browser automation (Puppeteer)
   - Estimated yield: 500+ construction tenders/year
   
2. **VIC Buying for Victoria** - tenders.vic.gov.au
   - Status: Not started
   - Estimated yield: 400+ construction tenders/year
   
3. **QLD QTenders** - qtenders.hpw.qld.gov.au
   - Status: Not started
   - Estimated yield: 300+ construction tenders/year

4. **SA, WA, TAS, ACT, NT** - Various portals
   - Status: Not started
   - Combined yield: 200+ construction tenders/year

**Technical Requirements:**
- Puppeteer for browser automation (most portals don't have public APIs)
- Session management and authentication
- Anti-bot detection handling
- Rate limiting and respectful scraping

**Estimated Timeline:** 2-3 weeks for all 8 states

### 📋 Phase 3: Local Councils (NEXT)

#### Approach 1: Platform Aggregators
- **Vendor Panel** (vendorpanel.com) - 200+ councils
- **TenderLink** (tenderlink.com) - 100+ councils
- Both require registration but give access to hundreds of councils at once

#### Approach 2: Top 50 Individual Councils
Focus on highest-spend metros:
- Sydney councils (Parramatta, Blacktown, etc.)
- Melbourne councils (Melbourne City, Yarra, etc.)
- Brisbane, Gold Coast, Perth, Adelaide metros

**Estimated Timeline:** 4-6 weeks

### 🚀 Phase 4: Advanced Features

#### Market Intelligence
- **Spending trends** by region, category, time
- **Top contractors** win/loss tracking
- **Price benchmarking** ($/sqm, $/km for roads, etc.)
- **Buyer profiles** (which agencies spend the most)
- **Forecast predictions** based on historical patterns

#### Alert System
- **Email/SMS alerts** for new matching tenders
- **Closing date reminders** (7 days, 3 days, 1 day)
- **Custom saved searches** per user
- **Daily/weekly digest emails**

#### Document Management
- **Auto-download** tender PDFs and documents
- **Organized by closing date** and category
- **Full-text search** within documents
- **Attachment extraction** (drawings, specs)

#### Competitive Intelligence
- **Track competitors** - see who's bidding/winning
- **Win rate analysis** by contractor
- **Territory mapping** - who dominates which region
- **Value band analysis** - sweet spot pricing

## Technical Stack

### Current:
- **Backend:** Node.js + Express
- **Database:** SQLite (better-sqlite3)
- **Frontend:** React (via CDN)
- **Scraping:** Native HTTPS + multi-source orchestrator
- **Hosting:** Railway

### Required Additions:
- **Puppeteer** - Browser automation for state portals
- **Redis** - Caching and rate limiting
- **PostgreSQL** - Scale beyond SQLite (>100k records)
- **Bull Queue** - Job scheduling for scrapers
- **Elasticsearch** - Full-text search at scale

## Commercial Model

### Pricing Tiers:

**Free Tier**
- View last 30 days of awarded contracts
- Basic search and filtering
- Limited to 10 exports/month

**Professional ($199/month)**
- Full historical data (12+ months)
- Live/open tender alerts
- Unlimited exports
- Email notifications
- 5 saved searches

**Enterprise ($499/month)**
- Everything in Professional
- Competitor tracking
- Custom reports
- API access
- Priority support
- White-label option

**Estimated Market:**
- 50,000+ construction companies in Australia
- Target: 1% conversion = 500 paying customers
- Revenue @ 50/50 split Pro/Enterprise: $175,000/month

## Competitive Advantage

**vs. Existing Platforms:**
- **Wider coverage** - We aggregate ALL sources, not just one
- **Better UX** - Modern, fast, intuitive interface
- **Smarter categorization** - AI-powered project classification
- **Market intelligence** - Not just listings, but insights
- **Price point** - More affordable than Cordell/ConstructionOnline

## Next Immediate Steps

1. ✅ **Deploy multi-source framework** (DONE)
2. **Add Puppeteer** to project dependencies
3. **Build NSW scraper** (highest volume, prove the pattern)
4. **Test with real data** (100+ NSW tenders)
5. **Replicate pattern** for VIC, QLD, SA, WA
6. **Add council aggregators** (Vendor Panel, TenderLink)
7. **Build alert system** (email notifications)
8. **Launch beta** with paying customers

**Estimated Time to MVP:** 4-6 weeks  
**Estimated Time to Full Product:** 8-12 weeks

## Success Metrics

**Month 1:**
- 1,000+ tenders in database
- 3+ data sources integrated
- 50+ users signed up

**Month 3:**
- 10,000+ tenders in database
- 8 state sources + top 50 councils
- 200+ users, 20 paying customers ($4,000 MRR)

**Month 6:**
- 50,000+ tenders in database
- All major sources integrated
- 1,000+ users, 200 paying customers ($40,000 MRR)

**Month 12:**
- 200,000+ tenders in database
- Comprehensive Australian coverage
- 5,000+ users, 500 paying customers ($175,000 MRR)

---

**Current Status:** Foundation complete, ready to scale.  
**Bottleneck:** Browser automation implementation for state portals.  
**Time Investment Required:** 10-15 hours/week for 8-12 weeks to reach full product.
