const https = require('https');

// Fetch recent contracts from AusTender
function fetchTenders() {
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const url = `https://api.tenders.gov.au/ocds/findByDates/contractPublished/${startDate}/${endDate}`;
  
  console.log('Fetching from:', url);
  
  https.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  }, (res) => {
    let data = '';
    
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log('\nTotal contracts:', json.releases?.length || 0);
        
        // Show first 5 construction-related
        const construction = json.releases?.filter(r => {
          const desc = (r.contracts?.[0]?.description || '').toLowerCase();
          const title = (r.contracts?.[0]?.title || '').toLowerCase();
          return desc.includes('construction') || 
                 desc.includes('building') || 
                 title.includes('construction') ||
                 desc.includes('infrastructure');
        }).slice(0, 5);
        
        console.log('\nConstruction-related tenders:');
        construction?.forEach(t => {
          const contract = t.contracts?.[0];
          console.log('\n---');
          console.log('Title:', contract?.title);
          console.log('Description:', contract?.description);
          console.log('Value: $', contract?.value?.amount);
          console.log('Buyer:', t.parties?.find(p => p.roles.includes('procuringEntity'))?.name);
          console.log('Supplier:', t.parties?.find(p => p.roles.includes('supplier'))?.name);
          console.log('Date:', contract?.dateSigned);
        });
        
      } catch (e) {
        console.error('Parse error:', e.message);
      }
    });
  }).on('error', e => console.error('Request error:', e.message));
}

fetchTenders();
