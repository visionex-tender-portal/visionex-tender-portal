const puppeteer = require('puppeteer');
const { upsertTender } = require('../database');
const { isConstructionRelated, categorizeProject } = require('./keywords');

/**
 * NSW eTendering Scraper
 * Source: https://tenders.nsw.gov.au
 * 
 * Uses Puppeteer to scrape NSW government tender portal
 * Fetches both open and awarded construction tenders
 */

async function fetchNSWTenders(options = {}) {
  const {
    headless = true,
    maxPages = 5,
    status = 'both' // 'open', 'awarded', 'both'
  } = options;
  
  console.log('[NSW] Starting NSW eTendering scraper...');
  console.log(`[NSW] Mode: ${status}, Max pages: ${maxPages}`);
  
  let browser;
  const results = {
    source: 'NSW eTendering',
    total: 0,
    open: 0,
    awarded: 0,
    tenders: []
  };
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // NSW eTendering search URL with construction filter
    const searchUrl = 'https://tenders.nsw.gov.au/?event=public.search.keyword&keyword=construction';
    
    console.log(`[NSW] Navigating to ${searchUrl}...`);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for results to load
    await page.waitForSelector('.search-results, .tender-list, .no-results', { timeout: 10000 });
    
    // Check if there are results
    const noResults = await page.$('.no-results');
    if (noResults) {
      console.log('[NSW] No results found');
      await browser.close();
      return results;
    }
    
    // Extract tender listings
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      console.log(`[NSW] Scraping page ${pageNum}...`);
      
      // Extract tender cards from current page
      const tenders = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('[class*="tender"], [class*="card"]'));
        
        return cards.map(card => {
          // Extract basic info (selectors will need adjustment based on actual HTML)
          const title = card.querySelector('[class*="title"], h2, h3')?.textContent?.trim();
          const link = card.querySelector('a')?.href;
          const agency = card.querySelector('[class*="agency"], [class*="buyer"]')?.textContent?.trim();
          const closingDate = card.querySelector('[class*="closing"], [class*="date"]')?.textContent?.trim();
          const value = card.querySelector('[class*="value"], [class*="price"]')?.textContent?.trim();
          const status = card.querySelector('[class*="status"]')?.textContent?.trim();
          
          return {
            title,
            link,
            agency,
            closingDate,
            value,
            status
          };
        }).filter(t => t.title && t.link);
      });
      
      console.log(`[NSW] Found ${tenders.length} tenders on page ${pageNum}`);
      results.tenders.push(...tenders);
      
      // Try to navigate to next page
      const nextButton = await page.$('[class*="next"], [rel="next"], button:contains("Next")');
      if (!nextButton || pageNum >= maxPages) {
        break;
      }
      
      await nextButton.click();
      await page.waitForTimeout(2000);
    }
    
    console.log(`[NSW] Total tenders found: ${results.tenders.length}`);
    
    // Process and store tenders
    for (const tender of results.tenders) {
      // Visit detail page for full info
      try {
        const detailPage = await browser.newPage();
        await detailPage.goto(tender.link, { waitUntil: 'networkidle2', timeout: 20000 });
        
        // Extract full details
        const details = await detailPage.evaluate(() => {
          const description = document.querySelector('[class*="description"], .content')?.textContent?.trim();
          const category = document.querySelector('[class*="category"]')?.textContent?.trim();
          const location = document.querySelector('[class*="location"], [class*="region"]')?.textContent?.trim();
          
          return { description, category, location };
        });
        
        await detailPage.close();
        
        // Check if construction-related
        const fullText = `${tender.title} ${details.description || ''}`;
        if (!isConstructionRelated(fullText)) {
          continue;
        }
        
        // Parse value
        let valueAmount = null;
        if (tender.value) {
          const match = tender.value.match(/\$?([0-9,]+(?:\.[0-9]{2})?)/);
          if (match) {
            valueAmount = parseFloat(match[1].replace(/,/g, ''));
          }
        }
        
        // Determine status
        const isOpen = tender.status?.toLowerCase().includes('open') || 
                       tender.status?.toLowerCase().includes('current');
        
        // Categorize
        const projectCategory = categorizeProject(tender.title, details.description || '');
        
        // Store in database
        try {
          const tenderId = `NSW-${tender.link.split('/').pop()}`;
          
          upsertTender.run(
            tenderId,
            tender.title,
            details.description || '',
            tender.agency || 'NSW Government',
            isOpen ? null : 'Awarded',
            valueAmount,
            'AUD',
            isOpen ? null : new Date().toISOString(),
            null,
            tender.closingDate || null,
            'NSW',
            details.location || null,
            'NSW eTendering',
            projectCategory,
            1 // is_construction
          );
          
          results.total++;
          if (isOpen) {
            results.open++;
          } else {
            results.awarded++;
          }
          
        } catch (e) {
          console.error(`[NSW] Error storing tender: ${e.message}`);
        }
        
      } catch (e) {
        console.error(`[NSW] Error processing tender ${tender.link}: ${e.message}`);
      }
      
      // Small delay to be respectful
      await page.waitForTimeout(500);
    }
    
    console.log(`[NSW] Processed ${results.total} construction tenders (${results.open} open, ${results.awarded} awarded)`);
    
  } catch (error) {
    console.error('[NSW] Scraper error:', error.message);
    results.error = error.message;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return results;
}

module.exports = { fetchNSWTenders };

// Test if run directly
if (require.main === module) {
  fetchNSWTenders({ headless: false, maxPages: 2 })
    .then(result => {
      console.log('\n=== NSW Scraper Result ===');
      console.log(`Total: ${result.total}`);
      console.log(`Open: ${result.open}`);
      console.log(`Awarded: ${result.awarded}`);
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      process.exit(result.error ? 1 : 0);
    })
    .catch(e => {
      console.error('Fatal error:', e.message);
      process.exit(1);
    });
}
