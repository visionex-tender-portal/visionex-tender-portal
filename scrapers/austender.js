const https = require('https');
const { upsertTender } = require('../database');
const { isConstructionRelated, categorizeProject } = require('./keywords');

function fetchDateRange(startDate, endDate) {
  return new Promise((resolve, reject) => {
    const url = `https://api.tenders.gov.au/ocds/findByDates/contractPublished/${startDate}/${endDate}`;
    
    https.get(url, {
      headers: { 'User-Agent': 'VisionexTenderPortal/1.0' }
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const releases = json.releases || [];
          resolve(releases);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchAusTender() {
  console.log(`[${new Date().toISOString()}] Fetching AusTender (multiple date ranges)...`);
  
  const endDate = new Date();
  const allReleases = [];
  
  // Fetch last 12 months in 2-month chunks
  for (let i = 0; i < 6; i++) {
    const chunkEnd = new Date(endDate);
    chunkEnd.setMonth(chunkEnd.getMonth() - (i * 2));
    
    const chunkStart = new Date(chunkEnd);
    chunkStart.setMonth(chunkStart.getMonth() - 2);
    
    const startStr = chunkStart.toISOString().split('.')[0] + 'Z';
    const endStr = chunkEnd.toISOString().split('.')[0] + 'Z';
    
    console.log(`  Fetching ${startStr} to ${endStr}...`);
    
    try {
      const releases = await fetchDateRange(startStr, endStr);
      console.log(`  Found ${releases.length} contracts`);
      allReleases.push(...releases);
    } catch (e) {
      console.error(`  Error fetching range: ${e.message}`);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`Total contracts fetched: ${allReleases.length}`);
  
  let newCount = 0;
  let constructionCount = 0;
  
  allReleases.forEach(release => {
    const contract = release.contracts?.[0];
    if (!contract) return;
    
    const buyer = release.parties?.find(p => p.roles?.includes('procuringEntity'));
    const supplier = release.parties?.find(p => p.roles?.includes('supplier'));
    
    const title = contract.title || '';
    const description = contract.description || '';
    const isConstruction = isConstructionRelated(title) || isConstructionRelated(description);
    
    if (!isConstruction) return; // Skip non-construction
    
    constructionCount++;
    
    // Determine state from buyer or supplier address
    const state = buyer?.address?.region || supplier?.address?.region || null;
    const locality = buyer?.address?.locality || supplier?.address?.locality || null;
    
    // Smart categorization
    const category = categorizeProject(title, description);
    
    try {
      upsertTender.run(
        contract.id,
        title,
        description,
        buyer?.name || null,
        supplier?.name || null,
        parseFloat(contract.value?.amount) || null,
        contract.value?.currency || 'AUD',
        contract.dateSigned || null,
        contract.period?.startDate || null,
        contract.period?.endDate || null,
        state,
        locality,
        'AusTender',
        category,
        isConstruction ? 1 : 0
      );
      newCount++;
    } catch (e) {
      // Duplicate or error - skip
    }
  });
  
  console.log(`Processed ${newCount} tenders (${constructionCount} construction-related)`);
  return { total: newCount, construction: constructionCount };
}

// Run scraper
if (require.main === module) {
  fetchAusTender()
    .then(result => {
      console.log('✅ Scrape complete:', result);
      process.exit(0);
    })
    .catch(e => {
      console.error('❌ Scrape failed:', e.message);
      process.exit(1);
    });
}

module.exports = { fetchAusTender };
