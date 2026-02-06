const https = require('https');
const { upsertTender } = require('./database');

// Specific infrastructure & construction keywords
const CONSTRUCTION_KEYWORDS = [
  // Infrastructure
  'infrastructure', 'civil works', 'civil engineering',
  
  // Roads & Transport
  'road', 'highway', 'motorway', 'bridge', 'tunnel', 'airport', 'runway',
  
  // Buildings
  'construction', 'building', 'hospital', 'school', 'university', 'education facility',
  'health facility', 'medical centre',
  
  // Defence
  'defence', 'defense', 'military', 'base', 'barracks',
  
  // Utilities & Services
  'drainage', 'stormwater', 'sewer', 'water treatment', 'wastewater',
  
  // Landscaping & Site
  'landscaping', 'earthworks', 'site works', 'ground works',
  
  // Structural
  'structural', 'demolition', 'renovation', 'refurbishment',
  'fit-out', 'fitout', 'architectural'
];

function isConstructionRelated(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return CONSTRUCTION_KEYWORDS.some(keyword => lower.includes(keyword));
}

function categorizeProject(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  
  // Priority categories (most specific first)
  if (text.match(/defence|defense|military|base|barracks/i)) 
    return 'Defence';
  
  if (text.match(/airport|runway|aviation/i)) 
    return 'Airports & Aviation';
  
  if (text.match(/hospital|health|medical centre|clinic/i)) 
    return 'Hospitals & Healthcare';
  
  if (text.match(/school|university|education|campus|college/i)) 
    return 'Schools & Education';
  
  if (text.match(/road|highway|motorway|street|pavement/i)) 
    return 'Roads & Highways';
  
  if (text.match(/bridge|tunnel|overpass/i)) 
    return 'Bridges & Tunnels';
  
  if (text.match(/drainage|stormwater|sewer|wastewater|water treatment/i)) 
    return 'Drainage & Water';
  
  if (text.match(/landscaping|park|garden|ground works/i)) 
    return 'Landscaping';
  
  if (text.match(/rail|train|metro|light rail/i)) 
    return 'Rail';
  
  if (text.match(/building|facility|construction/i)) 
    return 'Buildings & Facilities';
  
  if (text.match(/civil works|civil engineering|infrastructure/i)) 
    return 'Civil & Infrastructure';
  
  return 'General Construction';
}

function fetchAusTender() {
  return new Promise((resolve, reject) => {
    // Fetch last 60 days for more data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);
    
    const url = `https://api.tenders.gov.au/ocds/findByDates/contractPublished/${startDate.toISOString().split('.')[0]}Z/${endDate.toISOString().split('.')[0]}Z`;
    
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
