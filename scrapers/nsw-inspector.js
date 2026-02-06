const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

// Use stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());

/**
 * NSW Portal Inspector
 * Captures actual page structure to inform scraper
 */

async function inspectNSW() {
  console.log('Launching browser...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    console.log('Navigating to buy.nsw...');
    await page.goto('https://buy.nsw.gov.au/search?query=construction', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('Waiting for page to render...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take screenshot
    await page.screenshot({ path: '/tmp/nsw-screenshot.png', fullPage: true });
    console.log('Screenshot saved: /tmp/nsw-screenshot.png');
    
    // Get page HTML
    const html = await page.content();
    fs.writeFileSync('/tmp/nsw-page.html', html);
    console.log('HTML saved: /tmp/nsw-page.html');
    
    // Extract visible text
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n=== PAGE TEXT (first 2000 chars) ===');
    console.log(bodyText.substring(0, 2000));
    
    // Find main content containers
    const containers = await page.evaluate(() => {
      const results = [];
      const divs = document.querySelectorAll('div[class]');
      const classNames = new Set();
      
      divs.forEach(div => {
        if (div.className && div.innerText.toLowerCase().includes('result')) {
          classNames.add(div.className);
        }
      });
      
      return Array.from(classNames).slice(0, 20);
    });
    
    console.log('\n=== RELEVANT CLASS NAMES ===');
    containers.forEach(c => console.log(c));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

inspectNSW().then(() => {
  console.log('\nInspection complete!');
  process.exit(0);
}).catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
