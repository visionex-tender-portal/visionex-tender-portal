# Multi-Source Tender Scraper Architecture

## Goal
Build Australia's most comprehensive construction tender database by aggregating:
- Federal contracts (AusTender)
- All 8 state/territory government portals
- 560+ local council tenders
- Both awarded contracts and live/open tenders

## Data Sources

### Federal
- **AusTender** - api.tenders.gov.au (OCDS API)

### State Governments
1. NSW eTendering - tenders.nsw.gov.au
2. VIC Buying for Victoria - tenders.vic.gov.au  
3. QLD QTenders - qtenders.hpw.qld.gov.au
4. SA Tenders - tenders.sa.gov.au
5. WA Tenders - tenders.wa.gov.au
6. TAS Tenders - tenders.tas.gov.au
7. ACT Tenders - tenders.act.gov.au
8. NT Contracts - nt.gov.au/industry/tenders

### Local Councils (via platforms)
- **Vendor Panel** - vendorpanel.com (200+ councils)
- **TenderLink** - tenderlink.com (100+ councils)
- Individual council portals (top 50 by spend)

## Scraper Strategy

Each source gets its own module:
- `austender.js` - Federal (done)
- `nsw.js` - NSW state tenders
- `vic.js` - Victoria state tenders
- `qld.js` - Queensland state tenders
- etc.

Plus aggregators:
- `vendor-panel.js` - Multi-council platform
- `tenderlink.js` - Multi-council platform

## Data Normalization

All sources feed into unified schema:
- Tender ID (source-specific)
- Title
- Description
- Organization (buyer)
- Value (estimated or actual)
- Status (open/awarded/closed)
- Opening date
- Closing date (for open tenders)
- Award date (for awarded)
- Category (auto-categorized)
- Location (state + council/region)
- Source (which portal)
- Documents (PDFs, links)

## Execution Plan

1. Build state scrapers (NSW, VIC, QLD first - highest volume)
2. Test and validate data quality
3. Add council aggregators
4. Schedule automated runs (hourly for open, daily for awarded)
5. Build deduplication logic (same tender on multiple portals)
