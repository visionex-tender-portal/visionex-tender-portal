const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const { getRecentTenders, getTendersByState, getTenderCount } = require('./database');
const { fetchAusTender } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.get('/api/tenders', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const state = req.query.state;
  
  try {
    let tenders;
    if (state && state !== 'ALL') {
      tenders = getTendersByState.all(state, limit);
    } else {
      tenders = getRecentTenders.all(limit);
    }
    
    res.json({
      success: true,
      count: tenders.length,
      tenders: tenders.map(t => ({
        ...t,
        value_amount: parseFloat(t.value_amount)
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const { count } = getTenderCount.get();
    res.json({
      success: true,
      total_construction_tenders: count
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/scrape', async (req, res) => {
  try {
    const result = await fetchAusTender();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Run initial scrape on startup
console.log('🚀 Starting Visionex Tender Portal...');
fetchAusTender()
  .then(result => console.log('✅ Initial scrape complete:', result))
  .catch(e => console.error('❌ Initial scrape failed:', e.message));

// Schedule scraping every 30 minutes
cron.schedule('*/30 * * * *', () => {
  console.log(`[${new Date().toISOString()}] Running scheduled scrape...`);
  fetchAusTender()
    .then(result => console.log('✅ Scheduled scrape complete:', result))
    .catch(e => console.error('❌ Scheduled scrape failed:', e.message));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔄 Auto-scraping every 30 minutes`);
});
