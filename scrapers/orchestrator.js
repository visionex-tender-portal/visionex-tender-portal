/**
 * Multi-Source Tender Scraper Orchestrator
 * Coordinates scraping from all Australian tender sources
 */

const { fetchAusTender } = require('./austender');
const { fetchNSWTenders } = require('./nsw');
// More sources will be added as they're implemented

const ALL_SOURCES = [
  { name: 'AusTender', module: fetchAusTender, enabled: true, priority: 1, type: 'api' },
  { name: 'NSW eTendering', module: fetchNSWTenders, enabled: false, priority: 2, type: 'browser' }, // Ready for testing (node scrapers/nsw.js)
  // { name: 'VIC Tenders', module: fetchVICTenders, enabled: false, priority: 3, type: 'browser' },
  // { name: 'QLD QTenders', module: fetchQLDTenders, enabled: false, priority: 4, type: 'browser' },
  // etc.
];

async function scrapeAll(options = {}) {
  const {
    sources = ALL_SOURCES.filter(s => s.enabled),
    parallel = false
  } = options;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('MULTI-SOURCE TENDER SCRAPER');
  console.log(`${'='.repeat(60)}\n`);
  console.log(`Enabled sources: ${sources.length}`);
  console.log(`Mode: ${parallel ? 'Parallel' : 'Sequential'}\n`);
  
  const results = [];
  const startTime = Date.now();
  
  if (parallel) {
    // Run all scrapers in parallel
    const promises = sources.map(source => 
      source.module()
        .then(result => ({ ...result, source: source.name, success: true }))
        .catch(error => ({ source: source.name, success: false, error: error.message }))
    );
    
    results.push(...await Promise.all(promises));
  } else {
    // Run scrapers sequentially (safer, avoids rate limiting)
    for (const source of sources.sort((a, b) => a.priority - b.priority)) {
      console.log(`\n--- ${source.name} ---`);
      try {
        const result = await source.module();
        results.push({ ...result, source: source.name, success: true });
      } catch (error) {
        console.error(`[${source.name}] Failed:`, error.message);
        results.push({ source: source.name, success: false, error: error.message });
      }
      
      // Small delay between sources
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('SCRAPE SUMMARY');
  console.log(`${'='.repeat(60)}\n`);
  
  const totalStats = {
    sources: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    totalTenders: results.reduce((sum, r) => sum + (r.total || 0), 0),
    openTenders: results.reduce((sum, r) => sum + (r.open || 0), 0),
    awardedContracts: results.reduce((sum, r) => sum + (r.awarded || 0), 0),
    duration: `${duration}s`
  };
  
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const details = r.success 
      ? `${r.total || 0} total (${r.open || 0} open, ${r.awarded || 0} awarded)`
      : `Error: ${r.error}`;
    console.log(`${status} ${r.source}: ${details}`);
  });
  
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Total: ${totalStats.totalTenders} tenders from ${totalStats.successful}/${totalStats.sources} sources`);
  console.log(`Open: ${totalStats.openTenders} | Awarded: ${totalStats.awardedContracts}`);
  console.log(`Duration: ${totalStats.duration}`);
  console.log(`${'='.repeat(60)}\n`);
  
  return {
    results,
    stats: totalStats
  };
}

module.exports = {
  scrapeAll,
  ALL_SOURCES
};

// Run if called directly
if (require.main === module) {
  const parallel = process.argv.includes('--parallel');
  
  scrapeAll({ parallel })
    .then(({ stats }) => {
      process.exit(stats.failed > 0 ? 1 : 0);
    })
    .catch(e => {
      console.error('Fatal error:', e.message);
      process.exit(1);
    });
}
