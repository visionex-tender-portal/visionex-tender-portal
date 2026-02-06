# NSW eTendering Scraper Notes

## Status: PROTOTYPE

The NSW scraper uses Puppeteer for browser automation since NSW eTendering doesn't provide a public API.

## Current Implementation

**Approach:** Headless browser automation
- Launches Chromium via Puppeteer
- Navigates to search results with "construction" keyword
- Extracts tender cards from paginated results
- Visits each detail page for full information
- Filters construction-related projects
- Stores in database

## Known Issues

1. **Selectors need verification** - The CSS selectors used (`.tender`, `.title`, etc.) are generic and will need adjustment based on actual NSW portal HTML structure
2. **Authentication may be required** - Some tender details might require login
3. **Rate limiting** - Need to be respectful of scraping frequency
4. **Cloudflare protection** - Portal may have bot detection

## Testing Strategy

### Manual Test (Visual):
```bash
cd tender-portal
node scrapers/nsw.js
```
This runs with `headless: false` so you can see what's happening.

### Automated Test:
```bash
node scrapers/orchestrator.js
```
Runs full suite including NSW.

## Next Steps

1. **Manual inspection** - Visit https://tenders.nsw.gov.au and inspect HTML structure
2. **Update selectors** - Adjust CSS selectors in nsw.js to match actual structure
3. **Handle authentication** - If required, implement login flow
4. **Add error recovery** - Handle cases where elements don't load
5. **Optimize speed** - Currently visits every detail page, could be optimized

## Alternative Approaches

If browser automation proves unreliable:

### Option A: NSW API (if available)
Check if NSW has undocumented API endpoints by inspecting network traffic

### Option B: RSS/Atom Feeds
Some portals provide feeds: https://tenders.nsw.gov.au/feed (check if exists)

### Option C: Third-party aggregator
Partner with existing tender aggregation services that already have NSW data

## Performance

**Expected:**
- ~50-100 tenders per run
- ~2-3 minutes per run (visiting detail pages is slow)
- Should run hourly for open tenders, daily for awarded

**Optimization ideas:**
- Cache known tender IDs to avoid re-visiting
- Parallel detail page visits (carefully)
- Extract more from listing page to avoid detail visits

## Legal/Ethical

✅ **Allowed:**
- Public tender information
- Respecting robots.txt
- Reasonable rate limits

❌ **Not allowed:**
- Circumventing authentication
- Overloading their servers
- Scraping personal information

Always check NSW Government terms of use for tender portal.
