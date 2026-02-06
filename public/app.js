const { useState, useEffect, useMemo } = React;

// Utility Functions
const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return '$' + parseFloat(amount).toLocaleString('en-AU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
};

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-AU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const exportToCSV = (tenders) => {
    const headers = ['Title', 'Value', 'Buyer', 'Supplier', 'State', 'Category', 'Date Signed', 'Description'];
    const rows = tenders.map(t => [
        t.title || '',
        t.value_amount || '',
        t.buyer_name || '',
        t.supplier_name || '',
        t.state || '',
        t.category || '',
        t.date_signed || '',
        (t.description || '').replace(/,/g, ';')
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visionex-tenders-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

// API Functions
const api = {
    async getTenders(filters = {}) {
        const params = new URLSearchParams();
        if (filters.state && filters.state !== 'ALL') params.set('state', filters.state);
        params.set('limit', filters.limit || 100);
        
        const response = await fetch(`/api/tenders?${params}`);
        const data = await response.json();
        return data;
    },
    
    async getStats() {
        const response = await fetch('/api/stats');
        const data = await response.json();
        return data;
    },
    
    async triggerScrape() {
        const response = await fetch('/api/scrape', { method: 'POST' });
        const data = await response.json();
        return data;
    }
};

// Components
function Header({ activeTab, setActiveTab }) {
    return (
        <header className="header">
            <div className="header-content">
                <div className="logo">
                    <span className="logo-icon mdi mdi-office-building-outline"></span>
                    <div>
                        <div>Visionex Solutions</div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--gray-600)' }}>
                            Tender Intelligence Platform
                        </div>
                    </div>
                </div>
                <nav className="nav">
                    <a 
                        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        <span className="mdi mdi-view-dashboard"></span> Dashboard
                    </a>
                    <a 
                        className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analytics')}
                    >
                        <span className="mdi mdi-chart-line"></span> Analytics
                    </a>
                </nav>
            </div>
        </header>
    );
}

function StatsGrid({ tenders, loading }) {
    const stats = useMemo(() => {
        if (!tenders.length) return {
            total: 0,
            totalValue: 0,
            avgValue: 0,
            activeStates: 0
        };
        
        const totalValue = tenders.reduce((sum, t) => sum + (parseFloat(t.value_amount) || 0), 0);
        const uniqueStates = new Set(tenders.filter(t => t.state).map(t => t.state));
        
        return {
            total: tenders.length,
            totalValue,
            avgValue: totalValue / tenders.length,
            activeStates: uniqueStates.size
        };
    }, [tenders]);
    
    return (
        <div className="stats-grid">
            <div className="stat-card">
                <div className="stat-header">
                    <div>
                        <div className="stat-label">Total Tenders</div>
                        <div className="stat-value">{loading ? '...' : stats.total}</div>
                    </div>
                    <div className="stat-icon blue">
                        <span className="mdi mdi-file-document-multiple"></span>
                    </div>
                </div>
            </div>
            
            <div className="stat-card">
                <div className="stat-header">
                    <div>
                        <div className="stat-label">Total Value</div>
                        <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                            {loading ? '...' : formatCurrency(stats.totalValue)}
                        </div>
                    </div>
                    <div className="stat-icon green">
                        <span className="mdi mdi-currency-usd"></span>
                    </div>
                </div>
            </div>
            
            <div className="stat-card">
                <div className="stat-header">
                    <div>
                        <div className="stat-label">Average Value</div>
                        <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                            {loading ? '...' : formatCurrency(stats.avgValue)}
                        </div>
                    </div>
                    <div className="stat-icon purple">
                        <span className="mdi mdi-chart-box"></span>
                    </div>
                </div>
            </div>
            
            <div className="stat-card">
                <div className="stat-header">
                    <div>
                        <div className="stat-label">Active States</div>
                        <div className="stat-value">{loading ? '...' : stats.activeStates}</div>
                    </div>
                    <div className="stat-icon orange">
                        <span className="mdi mdi-map-marker-multiple"></span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ControlsPanel({ filters, setFilters, onRefresh, onScrape, onExport, loading, tendersCount }) {
    const [scraping, setScraping] = useState(false);
    
    const handleScrape = async () => {
        if (!confirm('Manually trigger a scrape now? This will fetch fresh data from AusTender.')) return;
        
        setScraping(true);
        try {
            const result = await onScrape();
            alert(`✅ Scraped ${result.total} tenders (${result.construction} construction-related)`);
        } catch (error) {
            alert('❌ Scrape failed: ' + error.message);
        }
        setScraping(false);
    };
    
    return (
        <div className="controls-panel">
            <div className="controls-header">
                <div className="controls-title">
                    <span className="mdi mdi-filter"></span> Search & Filters
                </div>
                <div className="btn-group">
                    <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
                        <span className="mdi mdi-refresh"></span>
                        Refresh
                    </button>
                    <button className="btn btn-success" onClick={onExport} disabled={!tendersCount}>
                        <span className="mdi mdi-download"></span>
                        Export CSV
                    </button>
                    <button className="btn btn-primary" onClick={handleScrape} disabled={scraping}>
                        <span className="mdi mdi-cloud-download"></span>
                        {scraping ? 'Scraping...' : 'Scrape Now'}
                    </button>
                </div>
            </div>
            
            <div className="controls-grid">
                <div className="control-group">
                    <label className="control-label">Search</label>
                    <div className="search-box">
                        <span className="search-icon mdi mdi-magnify"></span>
                        <input
                            type="text"
                            className="control-input search-input"
                            placeholder="Search tenders..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                </div>
                
                <div className="control-group">
                    <label className="control-label">State</label>
                    <select
                        className="control-select"
                        value={filters.state}
                        onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                    >
                        <option value="ALL">All States</option>
                        <option value="NSW">NSW</option>
                        <option value="VIC">VIC</option>
                        <option value="QLD">QLD</option>
                        <option value="SA">SA</option>
                        <option value="WA">WA</option>
                        <option value="TAS">TAS</option>
                        <option value="ACT">ACT</option>
                        <option value="NT">NT</option>
                    </select>
                </div>
                
                <div className="control-group">
                    <label className="control-label">Min Value</label>
                    <input
                        type="number"
                        className="control-input"
                        placeholder="$0"
                        value={filters.minValue}
                        onChange={(e) => setFilters({ ...filters, minValue: e.target.value })}
                    />
                </div>
                
                <div className="control-group">
                    <label className="control-label">Max Value</label>
                    <input
                        type="number"
                        className="control-input"
                        placeholder="No limit"
                        value={filters.maxValue}
                        onChange={(e) => setFilters({ ...filters, maxValue: e.target.value })}
                    />
                </div>
            </div>
        </div>
    );
}

function TenderCard({ tender, onClick }) {
    const getAusTenderUrl = (tender) => {
        // Try to construct AusTender URL - this is a best-effort approach
        if (tender.cn_id) {
            return `https://www.tenders.gov.au/Cn/Show/${tender.cn_id}`;
        }
        return 'https://www.tenders.gov.au/';
    };
    
    return (
        <div className="tender-card" onClick={onClick}>
            <div className="tender-header">
                <div className="tender-title">{tender.title || 'Untitled Tender'}</div>
                <div className="tender-value">{formatCurrency(tender.value_amount)}</div>
            </div>
            
            {tender.description && (
                <div className="tender-description">
                    {tender.description.length > 200 
                        ? tender.description.substring(0, 200) + '...' 
                        : tender.description
                    }
                </div>
            )}
            
            <div className="tender-meta">
                {tender.buyer_name && (
                    <div className="tender-meta-item">
                        <span className="mdi mdi-office-building"></span>
                        {tender.buyer_name}
                    </div>
                )}
                {tender.supplier_name && (
                    <div className="tender-meta-item">
                        <span className="mdi mdi-tools"></span>
                        {tender.supplier_name}
                    </div>
                )}
                {tender.date_signed && (
                    <div className="tender-meta-item">
                        <span className="mdi mdi-calendar"></span>
                        {formatDate(tender.date_signed)}
                    </div>
                )}
            </div>
            
            <div className="tender-footer">
                <div className="tender-badges">
                    {tender.state && <span className="badge badge-state">{tender.state}</span>}
                    {tender.category && <span className="badge badge-category">{tender.category}</span>}
                    <span className="badge badge-construction">Construction</span>
                </div>
                <a 
                    href={getAusTenderUrl(tender)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="mdi mdi-open-in-new"></span>
                    View on AusTender
                </a>
            </div>
        </div>
    );
}

function TenderModal({ tender, onClose }) {
    if (!tender) return null;
    
    const getAusTenderUrl = (tender) => {
        if (tender.cn_id) {
            return `https://www.tenders.gov.au/Cn/Show/${tender.cn_id}`;
        }
        return 'https://www.tenders.gov.au/';
    };
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{tender.title || 'Untitled Tender'}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <span className="mdi mdi-close"></span>
                    </button>
                </div>
                
                <div className="modal-body">
                    <div className="detail-grid">
                        <div className="detail-section">
                            <div className="detail-label">Contract Value</div>
                            <div className="detail-value" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                                {formatCurrency(tender.value_amount)}
                            </div>
                        </div>
                        
                        <div className="detail-section">
                            <div className="detail-label">Date Signed</div>
                            <div className="detail-value">{formatDate(tender.date_signed)}</div>
                        </div>
                        
                        {tender.state && (
                            <div className="detail-section">
                                <div className="detail-label">State</div>
                                <div className="detail-value">{tender.state}</div>
                            </div>
                        )}
                        
                        {tender.category && (
                            <div className="detail-section">
                                <div className="detail-label">Category</div>
                                <div className="detail-value">{tender.category}</div>
                            </div>
                        )}
                    </div>
                    
                    {tender.description && (
                        <div className="detail-section" style={{ marginTop: '2rem' }}>
                            <div className="detail-label">Description</div>
                            <div className="detail-value">{tender.description}</div>
                        </div>
                    )}
                    
                    {tender.buyer_name && (
                        <div className="detail-section">
                            <div className="detail-label">Buyer Organization</div>
                            <div className="detail-value">{tender.buyer_name}</div>
                        </div>
                    )}
                    
                    {tender.supplier_name && (
                        <div className="detail-section">
                            <div className="detail-label">Supplier</div>
                            <div className="detail-value">{tender.supplier_name}</div>
                        </div>
                    )}
                    
                    <div className="detail-section" style={{ marginTop: '2rem' }}>
                        <a 
                            href={getAusTenderUrl(tender)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center' }}
                        >
                            <span className="mdi mdi-open-in-new"></span>
                            View Full Details on AusTender
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TenderList({ tenders, loading, onTenderClick }) {
    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p style={{ marginTop: '1rem' }}>Loading tenders...</p>
            </div>
        );
    }
    
    if (!tenders.length) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <span className="mdi mdi-file-document-outline"></span>
                </div>
                <h3 className="empty-state-title">No tenders found</h3>
                <p>Try adjusting your filters or refresh the data</p>
            </div>
        );
    }
    
    return (
        <div className="tender-list">
            {tenders.map((tender, index) => (
                <TenderCard 
                    key={index} 
                    tender={tender} 
                    onClick={() => onTenderClick(tender)}
                />
            ))}
        </div>
    );
}

function AnalyticsTab({ tenders }) {
    const analytics = useMemo(() => {
        if (!tenders.length) return null;
        
        // By State
        const byState = {};
        tenders.forEach(t => {
            const state = t.state || 'Unknown';
            if (!byState[state]) byState[state] = { count: 0, value: 0 };
            byState[state].count++;
            byState[state].value += parseFloat(t.value_amount) || 0;
        });
        
        // By Category
        const byCategory = {};
        tenders.forEach(t => {
            const category = t.category || 'Uncategorized';
            if (!byCategory[category]) byCategory[category] = { count: 0, value: 0 };
            byCategory[category].count++;
            byCategory[category].value += parseFloat(t.value_amount) || 0;
        });
        
        // Top Buyers
        const byBuyer = {};
        tenders.forEach(t => {
            const buyer = t.buyer_name || 'Unknown';
            if (!byBuyer[buyer]) byBuyer[buyer] = { count: 0, value: 0 };
            byBuyer[buyer].count++;
            byBuyer[buyer].value += parseFloat(t.value_amount) || 0;
        });
        
        // Value Distribution
        const ranges = [
            { label: 'Under $100K', min: 0, max: 100000, count: 0 },
            { label: '$100K - $500K', min: 100000, max: 500000, count: 0 },
            { label: '$500K - $1M', min: 500000, max: 1000000, count: 0 },
            { label: '$1M - $5M', min: 1000000, max: 5000000, count: 0 },
            { label: 'Over $5M', min: 5000000, max: Infinity, count: 0 }
        ];
        
        tenders.forEach(t => {
            const value = parseFloat(t.value_amount) || 0;
            const range = ranges.find(r => value >= r.min && value < r.max);
            if (range) range.count++;
        });
        
        return {
            byState: Object.entries(byState).sort((a, b) => b[1].value - a[1].value).slice(0, 10),
            byCategory: Object.entries(byCategory).sort((a, b) => b[1].value - a[1].value).slice(0, 10),
            byBuyer: Object.entries(byBuyer).sort((a, b) => b[1].value - a[1].value).slice(0, 10),
            valueRanges: ranges.filter(r => r.count > 0)
        };
    }, [tenders]);
    
    if (!analytics) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <span className="mdi mdi-chart-line"></span>
                </div>
                <h3 className="empty-state-title">No data available</h3>
                <p>Load some tenders to see analytics</p>
            </div>
        );
    }
    
    return (
        <div>
            <div className="analytics-grid">
                <div className="chart-card">
                    <h3 className="chart-title">
                        <span className="mdi mdi-map-marker"></span> Top States by Value
                    </h3>
                    <div className="chart-list">
                        {analytics.byState.map(([state, data]) => (
                            <div key={state} className="chart-item">
                                <span className="chart-item-label">
                                    {state} ({data.count} tenders)
                                </span>
                                <span className="chart-item-value">{formatCurrency(data.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="chart-card">
                    <h3 className="chart-title">
                        <span className="mdi mdi-shape"></span> Top Categories
                    </h3>
                    <div className="chart-list">
                        {analytics.byCategory.map(([category, data]) => (
                            <div key={category} className="chart-item">
                                <span className="chart-item-label">
                                    {category} ({data.count})
                                </span>
                                <span className="chart-item-value">{formatCurrency(data.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="chart-card">
                    <h3 className="chart-title">
                        <span className="mdi mdi-office-building"></span> Top Buyers
                    </h3>
                    <div className="chart-list">
                        {analytics.byBuyer.slice(0, 8).map(([buyer, data]) => (
                            <div key={buyer} className="chart-item">
                                <span className="chart-item-label" style={{ 
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '200px'
                                }}>
                                    {buyer} ({data.count})
                                </span>
                                <span className="chart-item-value">{formatCurrency(data.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="chart-card">
                    <h3 className="chart-title">
                        <span className="mdi mdi-chart-bar"></span> Value Distribution
                    </h3>
                    <div className="chart-list">
                        {analytics.valueRanges.map((range) => (
                            <div key={range.label} className="chart-item">
                                <span className="chart-item-label">{range.label}</span>
                                <span className="chart-item-value">{range.count} tenders</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Dashboard() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [tenders, setTenders] = useState([]);
    const [filteredTenders, setFilteredTenders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTender, setSelectedTender] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        state: 'ALL',
        minValue: '',
        maxValue: ''
    });
    
    const loadTenders = async () => {
        setLoading(true);
        try {
            const data = await api.getTenders({ state: filters.state, limit: 100 });
            if (data.success) {
                setTenders(data.tenders);
            }
        } catch (error) {
            console.error('Error loading tenders:', error);
        }
        setLoading(false);
    };
    
    useEffect(() => {
        loadTenders();
    }, []);
    
    useEffect(() => {
        let filtered = [...tenders];
        
        // Search filter
        if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(t => 
                (t.title && t.title.toLowerCase().includes(search)) ||
                (t.description && t.description.toLowerCase().includes(search)) ||
                (t.buyer_name && t.buyer_name.toLowerCase().includes(search)) ||
                (t.supplier_name && t.supplier_name.toLowerCase().includes(search))
            );
        }
        
        // Value filters
        if (filters.minValue) {
            const min = parseFloat(filters.minValue);
            filtered = filtered.filter(t => parseFloat(t.value_amount) >= min);
        }
        
        if (filters.maxValue) {
            const max = parseFloat(filters.maxValue);
            filtered = filtered.filter(t => parseFloat(t.value_amount) <= max);
        }
        
        setFilteredTenders(filtered);
    }, [tenders, filters]);
    
    const handleScrape = async () => {
        const result = await api.triggerScrape();
        if (result.success) {
            await loadTenders();
        }
        return result;
    };
    
    const handleExport = () => {
        exportToCSV(filteredTenders);
    };
    
    return (
        <div>
            <Header activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <div className="container">
                {activeTab === 'dashboard' ? (
                    <>
                        <StatsGrid tenders={filteredTenders} loading={loading} />
                        
                        <ControlsPanel
                            filters={filters}
                            setFilters={setFilters}
                            onRefresh={loadTenders}
                            onScrape={handleScrape}
                            onExport={handleExport}
                            loading={loading}
                            tendersCount={filteredTenders.length}
                        />
                        
                        <TenderList
                            tenders={filteredTenders}
                            loading={loading}
                            onTenderClick={setSelectedTender}
                        />
                    </>
                ) : (
                    <AnalyticsTab tenders={tenders} />
                )}
            </div>
            
            {selectedTender && (
                <TenderModal
                    tender={selectedTender}
                    onClose={() => setSelectedTender(null)}
                />
            )}
        </div>
    );
}

// Render App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Dashboard />);
