const https = require('https');
const { upsertTender } = require('./database');

// Construction-related keywords
const CONSTRUCTION_KEYWORDS = [
  'construction', 'building', 'infrastructure', 'road', 'bridge',
  'civil works', 'demolition', 'renovation', 'refurbishment',
  'fit-out', 'fitout', 'structural', 'architectural', 'site works',
  'earthworks', 'concrete', 'steel', 'fabrication', 'installation'
];

function isConstructionRelated(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return CONSTRUCTION_KEYWORDS.some(keyword => lower.includes(keyword));
}

function fetchAusTender() {
  return new Promise((resolve, reject) => {
    // Fetch last 21 days (AusTender has data)
    const endDate = '2026-02-06T23:59:59Z';
    const startDate = '2026-01-15T00:00:00Z';
    
    const url = `https://api.tenders.gov.au/ocds/findByDates/contractPublished/${startDate}/${endDate}`;
    
    console.log(`[${new Date().toISOString()}] Fetching AusTender...`);
    
    https.get(url, {
      headers: { 'User-Agent': 'VisionexTenderPortal/1.0' }
    }, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const releases = json.releases || [];
          
          console.log(`Found ${releases.length} total contracts`);
          
          let newCount = 0;
          let constructionCount = 0;
          
          releases.forEach(release => {
            const contract = release.contracts?.[0];
            if (!contract) return;
            
            const buyer = release.parties?.find(p => p.roles?.includes('procuringEntity'));
            const supplier = release.parties?.find(p => p.roles?.includes('supplier'));
            
            const title = contract.title || '';
            const description = contract.description || '';
            const isConstruction = isConstructionRelated(title) || isConstructionRelated(description);
            
            if (isConstruction) constructionCount++;
            
            // Determine state from buyer or supplier address
            const state = buyer?.address?.region || supplier?.address?.region || null;
            const locality = buyer?.address?.locality || supplier?.address?.locality || null;
            
            // Category based on description keywords
            let category = 'General';
            if (description.toLowerCase().includes('road')) category = 'Roads';
            else if (description.toLowerCase().includes('building')) category = 'Buildings';
            else if (description.toLowerCase().includes('bridge')) category = 'Infrastructure';
            else if (description.toLowerCase().includes('defence')) category = 'Defence';
            
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
          resolve({ total: newCount, construction: constructionCount });
          
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
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
