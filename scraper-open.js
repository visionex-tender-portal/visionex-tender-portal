const https = require('https');
const { upsertOpenTender } = require('./database');

// Construction-related keywords
const CONSTRUCTION_KEYWORDS = [
  'construction', 'building', 'infrastructure', 'road', 'bridge',
  'civil works', 'demolition', 'renovation', 'refurbishment',
  'fit-out', 'fitout', 'structural', 'architectural', 'site works',
  'earthworks', 'concrete', 'steel', 'fabrication', 'installation',
  'engineering', 'design', 'project management'
];

function isConstructionRelated(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return CONSTRUCTION_KEYWORDS.some(keyword => lower.includes(keyword));
}

// Fetch OPEN tenders (Contract Notices)
function fetchOpenTenders() {
  return new Promise((resolve, reject) => {
    // AusTender CN search endpoint - gets OPEN tenders
    const url = 'https://api.tenders.gov.au/ocds/search';
    
    const postData = JSON.stringify({
      "status": "active",
      "publicationDateFrom": "2026-01-01",
      "publicationDateTo": "2026-12-31",
      "keyword": "construction OR building OR infrastructure"
    });
    
    console.log(`[${new Date().toISOString()}] Fetching OPEN tenders from AusTender...`);
    
    const options = {
      hostname: 'api.tenders.gov.au',
      path: '/ocds/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        'User-Agent': 'VisionexTenderPortal/1.0'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          processOpenTenders(json);
          resolve({ success: true, message: 'Open tenders processed' });
        } catch (e) {
          // API might not support this endpoint, fall back to scraping
          console.log('OCDS search failed, using alternative approach...');
          fallbackScrapeOpenTenders()
            .then(resolve)
            .catch(reject);
        }
      });
    });
    
    req.on('error', (e) => {
      console.log('Primary API failed, trying alternative...');
      fallbackScrapeOpenTenders()
        .then(resolve)
        .catch(reject);
    });
    
    req.write(postData);
    req.end();
  });
}

// Alternative: Use AusTender RSS or simpler approach
function fallbackScrapeOpenTenders() {
  return new Promise((resolve, reject) => {
    // Try the CN published endpoint which might have recent postings
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days
    
    const url = `https://api.tenders.gov.au/ocds/findByDates/contractNoticePublished/${startDate.toISOString().split('.')[0]}Z/${endDate.toISOString().split('.')[0]}Z`;
    
    console.log(`[${new Date().toISOString()}] Trying Contract Notice endpoint...`);
    
    https.get(url, {
      headers: { 'User-Agent': 'VisionexTenderPortal/1.0' }
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const releases = json.releases || [];
          
          console.log(`Found ${releases.length} contract notices`);
          
          let constructionCount = 0;
          let processedCount = 0;
          
          releases.forEach(release => {
            const tender = release.tender;
            if (!tender) return;
            
            const buyer = release.parties?.find(p => p.roles?.includes('procuringEntity') || p.roles?.includes('buyer'));
            
            const title = tender.title || '';
            const description = tender.description || '';
            const isConstruction = isConstructionRelated(title) || isConstructionRelated(description);
            
            if (!isConstruction) return;
            constructionCount++;
            
            // Get tender details
            const tenderPeriod = tender.tenderPeriod || {};
            const closingDate = tenderPeriod.endDate || null;
            const value = tender.value?.amount ? parseFloat(tender.value.amount) : null;
            
            // State from buyer address
            const state = buyer?.address?.region || null;
            
            // Category
            let category = 'General Construction';
            const desc = description.toLowerCase();
            if (desc.includes('road') || desc.includes('highway')) category = 'Roads & Transport';
            else if (desc.includes('building') || desc.includes('facility')) category = 'Buildings & Facilities';
            else if (desc.includes('bridge') || desc.includes('infrastructure')) category = 'Infrastructure';
            else if (desc.includes('water') || desc.includes('sewer')) category = 'Water & Utilities';
            else if (desc.includes('rail')) category = 'Rail';
            
            try {
              // Store as open tender with proper schema
              const tenderId = release.ocid || tender.id || `CN-${Date.now()}-${processedCount}`;
              const cnId = tender.id || tenderId;
              const tenderUrl = `https://www.tenders.gov.au/Cn/Show/${cnId}`;
              
              upsertOpenTender.run(
                tenderId,
                title,
                description,
                buyer?.name || 'Unknown Agency',
                null, // supplier_name (not applicable for open tenders)
                value,
                tender.value?.currency || 'AUD',
                closingDate,
                state,
                'AusTender',
                category,
                1, // is_construction
                cnId,
                tenderUrl
              );
              processedCount++;
            } catch (e) {
              // Duplicate or error
              console.error('Error inserting tender:', e.message);
            }
          });
          
          console.log(`✅ Processed ${processedCount} OPEN construction tenders`);
          resolve({ 
            total: processedCount, 
            construction: constructionCount,
            message: 'Open tenders scraped successfully' 
          });
          
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function processOpenTenders(json) {
  // Process search results if API works
  console.log('Processing open tender search results...');
  // Implementation based on actual API response structure
}

// Combined scraper - gets both open and awarded
async function fetchAllTenders() {
  console.log('=== FETCHING TENDER DATA ===\n');
  
  // 1. Fetch open tenders (opportunities)
  console.log('📋 Fetching OPEN tenders...');
  const openResult = await fetchOpenTenders();
  console.log(`✅ Open tenders: ${openResult.total || 0}\n`);
  
  // 2. Fetch awarded contracts (for market intelligence)
  console.log('📊 Fetching AWARDED contracts...');
  const { fetchAusTender } = require('./scraper');
  const awardedResult = await fetchAusTender();
  console.log(`✅ Awarded contracts: ${awardedResult.total || 0}\n`);
  
  return {
    open: openResult.total || 0,
    awarded: awardedResult.total || 0,
    total: (openResult.total || 0) + (awardedResult.total || 0)
  };
}

// Run if called directly
if (require.main === module) {
  fetchAllTenders()
    .then(result => {
      console.log('\n=== SCRAPE COMPLETE ===');
      console.log(`Total: ${result.total} (${result.open} open, ${result.awarded} awarded)`);
      process.exit(0);
    })
    .catch(e => {
      console.error('❌ Scrape failed:', e.message);
      process.exit(1);
    });
}

module.exports = { fetchOpenTenders, fetchAllTenders };
