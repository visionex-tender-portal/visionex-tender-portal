const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const { 
  getRecentTenders, 
  getOpenTenders,
  getAwardedTenders,
  getTendersByState, 
  getTenderCount,
  getOpenTenderCount
} = require('./database');
const { fetchAusTender } = require('./scraper');
const { fetchAllTenders } = require('./scraper-open');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes

// Get all tenders (mixed open + awarded)
app.get('/api/tenders', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const state = req.query.state;
  const status = req.query.status; // 'open', 'awarded', or 'all'
  const category = req.query.category;
  
  try {
    let tenders;
    
    if (status === 'open') {
      tenders = getOpenTenders.all(limit);
    } else if (status === 'awarded') {
      tenders = getAwardedTenders.all(limit);
    } else if (state && state !== 'ALL') {
      tenders = getTendersByState.all(state, limit);
    } else {
      tenders = getRecentTenders.all(limit);
    }
    
    // Filter by category if specified
    if (category && category !== 'ALL') {
      tenders = tenders.filter(t => t.category === category);
    }
    
    res.json({
      success: true,
      count: tenders.length,
      tenders: tenders.map(t => ({
        ...t,
        value_amount: parseFloat(t.value_amount),
        is_open: t.tender_status === 'open',
        days_until_close: t.closing_date ? 
          Math.ceil((new Date(t.closing_date) - new Date()) / (1000 * 60 * 60 * 24)) : null
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get statistics
app.get('/api/stats', (req, res) => {
  try {
    const { count: totalCount } = getTenderCount.get();
    const { count: openCount } = getOpenTenderCount.get();
    const awardedCount = totalCount - openCount;
    
    res.json({
      success: true,
      total_construction_tenders: totalCount,
      open_tenders: openCount,
      awarded_contracts: awardedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available categories
app.get('/api/categories', (req, res) => {
  try {
    const { db } = require('./database');
    const categories = db.prepare(`
      SELECT DISTINCT category, COUNT(*) as count 
      FROM tenders 
      WHERE is_construction = 1 AND category IS NOT NULL
      GROUP BY category 
      ORDER BY count DESC
    `).all();
    
    res.json({
      success: true,
      categories: categories
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual scrape trigger
app.post('/api/scrape', async (req, res) => {
  try {
    const result = await fetchAllTenders();
    res.json({ 
      success: true, 
      total: result.total,
      open: result.open,
      awarded: result.awarded,
      construction: result.total
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Run initial scrape on startup
console.log('🚀 Starting Visionex Tender Portal...');
fetchAllTenders()
  .then(result => console.log(`✅ Initial scrape complete:`, result))
  .catch(e => console.error('❌ Initial scrape failed:', e.message));

// Schedule scraping every 30 minutes
cron.schedule('*/30 * * * *', () => {
  console.log(`[${new Date().toISOString()}] Running scheduled scrape...`);
  fetchAllTenders()
    .then(result => console.log('✅ Scheduled scrape complete:', result))
    .catch(e => console.error('❌ Scheduled scrape failed:', e.message));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔄 Auto-scraping every 30 minutes`);
});
