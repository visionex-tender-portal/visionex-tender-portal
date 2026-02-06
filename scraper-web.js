const https = require('https');
const { upsertOpenTender } = require('./database');

/**
 * Web scraper for AusTender search results page
 * Gets OPEN tenders that are currently accepting submissions
 */

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

/**
 * Scrape AusTender's public search interface
 * This uses the actual website's search functionality
 */
function scrapeAusTenderWeb() {
  return new Promise((resolve, reject) => {
    console.log(`[${new Date().toISOString()}] Scraping AusTender website for OPEN tenders...`);
    
    // AusTender CN search page
    const searchUrl = 'https://www.tenders.gov.au/Search/CnPublishedView';
    
    https.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml'
      }
    }, (res) => {
      let html = '';
      
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        try {
          // Parse HTML to extract tender listings
          // Note: This is a simplified parser - real scraper would use cheerio or similar
          const tenderMatches = html.match(/CN\d{7,}/g) || [];
          console.log(`Found ${tenderMatches.length} potential tenders on page`);
          
          // For now, return sample data structure
          // In production, you'd parse the actual HTML or use a proper scraping library
          
          resolve({
            total: 0,
            construction: 0,
            message: 'Web scraping requires additional setup (cheerio library)'
          });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Alternative: Use AusTender RSS feeds
 * They publish RSS feeds for new tenders by category
 */
function scrapeAusTenderRSS() {
  return new Promise((resolve, reject) => {
    console.log(`[${new Date().toISOString()}] Checking AusTender RSS feeds...`);
    
    // AusTender has category-specific RSS feeds
    const rssUrl = 'https://www.tenders.gov.au/Rss/FeedForCategory?categoryId=100'; // Construction category
    
    https.get(rssUrl, {
      headers: { 'User-Agent': 'VisionexTenderPortal/1.0' }
    }, (res) => {
      let xml = '';
      
      res.on('data', chunk => xml += chunk);
      res.on('end', () => {
        try {
          // Parse RSS XML
          // Extract <item> entries with title, link, pubDate, description
          const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
          
          console.log(`Found ${items.length} items in RSS feed`);
          
          let processedCount = 0;
          
          items.forEach((item, index) => {
            try {
              const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
              const linkMatch = item.match(/<link>(.*?)<\/link>/);
              const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
              const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
              
              if (!titleMatch || !linkMatch) return;
              
              const title = titleMatch[1];
              const link = linkMatch[1];
              const description = descMatch ? descMatch[1] : '';
              const pubDate = pubDateMatch ? pubDateMatch[1] : null;
              
              if (!isConstructionRelated(title) && !isConstructionRelated(description)) return;
              
              // Extract CN ID from link
              const cnIdMatch = link.match(/CN(\d+)/);
              const cnId = cnIdMatch ? cnIdMatch[0] : `RSS-${Date.now()}-${index}`;
              
              // Parse closing date from description if available
              const closingMatch = description.match(/closing[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
              const closingDate = closingMatch ? parseClosingDate(closingMatch[1]) : null;
              
              // Estimate value from description if mentioned
              const valueMatch = description.match(/\$([0-9,]+)/);
              const value = valueMatch ? parseFloat(valueMatch[1].replace(/,/g, '')) : null;
              
              // Extract state
              const stateMatch = description.match(/\b(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\b/);
              const state = stateMatch ? stateMatch[1] : null;
              
              // Category
              let category = 'General Construction';
              if (description.toLowerCase().includes('road')) category = 'Roads & Transport';
              else if (description.toLowerCase().includes('building')) category = 'Buildings';
              else if (description.toLowerCase().includes('bridge') || description.toLowerCase().includes('infrastructure')) 
                category = 'Infrastructure';
              
              try {
                upsertOpenTender.run(
                  cnId,
                  title,
                  description,
                  'Australian Government', // Generic buyer for RSS
                  null,
                  value,
                  'AUD',
                  closingDate,
                  state,
                  'AusTender-RSS',
                  category,
                  1,
                  cnId,
                  link
                );
                processedCount++;
              } catch (e) {
                // Duplicate or error
              }
            } catch (e) {
              console.error('Error parsing RSS item:', e.message);
            }
          });
          
          console.log(`✅ Processed ${processedCount} OPEN construction tenders from RSS`);
          resolve({
            total: processedCount,
            construction: processedCount,
            message: 'RSS feed scraped successfully'
          });
          
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function parseClosingDate(dateStr) {
  // Parse various date formats: DD/MM/YYYY, DD-MM-YYYY, etc.
  try {
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);
      const fullYear = year < 100 ? 2000 + year : year;
      return new Date(fullYear, month, day).toISOString();
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Export functions
module.exports = {
  scrapeAusTenderWeb,
  scrapeAusTenderRSS
};

// Test if run directly
if (require.main === module) {
  scrapeAusTenderRSS()
    .then(result => {
      console.log('✅ Scrape complete:', result);
      process.exit(0);
    })
    .catch(e => {
      console.error('❌ Scrape failed:', e.message);
      process.exit(1);
    });
}
