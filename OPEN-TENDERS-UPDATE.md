# Open Tenders Feature Update

## What Changed

The platform now tracks **TWO types** of data:

1. **OPEN TENDERS** (Future opportunities - bid now!)
   - Shows closing dates
   - Urgency indicators (closing soon)
   - Direct links to tender documents
   - Status: "Open for Tender"

2. **AWARDED CONTRACTS** (Past wins - market intelligence)
   - Shows signed date
   - Supplier information
   - Contract values
   - Status: "Awarded"

## Database Schema Updates

Added fields:
- `tender_status` ('open' or 'awarded')
- `closing_date` (for open tenders)
- `cn_id` (Contract Notice ID)
- `tender_url` (direct link to AusTender page)

## API Updates

### `/api/tenders?status=open`
Returns only OPEN tenders sorted by closing date (soonest first)

### `/api/tenders?status=awarded`
Returns only AWARDED contracts sorted by signed date

### `/api/stats`
Now returns:
- `total_construction_tenders`
- `open_tenders`
- `awarded_contracts`

## Scraper Updates

New file: `scraper-open.js`
- Fetches Contract Notices from AusTender
- Gets tender opportunities currently open for bidding
- Extracts closing dates, buyer info, estimated values

Combined scraper: `fetchAllTenders()`
- Runs both open + awarded scrapers
- Scheduled every 30 minutes

## Frontend Updates Needed

Add to ControlsPanel:
```javascript
<select onChange={e => setFilters({...filters, status: e.target.value})}>
  <option value="all">All Tenders</option>
  <option value="open">Open for Tender</option>
  <option value="awarded">Awarded Contracts</option>
</select>
```

Update TenderCard to show closing dates for open tenders and highlight urgency.

## Next Steps

1. Test the open tender scraper
2. Update UI to show closing dates prominently
3. Add urgency badges (closing < 7 days)
4. Add "Days Remaining" counters
5. Consider adding email alerts for new matching tenders
