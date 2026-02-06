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
    const headers = ['Tender ID', 'Title', 'Contract Value', 'Buyer Organization', 'Supplier', 'State', 'Category', 'Date Signed', 'Description'];
    const rows = tenders.map((t, i) => [
        `TND-${String(i + 1).padStart(6, '0')}`,
        t.title || '',
        t.value_amount || '',
        t.buyer_name || '',
        t.supplier_name || '',
        t.state || '',
        t.category || '',
        t.date_signed || '',
        (t.description || '').replace(/,/g, ';').replace(/\n/g, ' ')
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visionex-tenders-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// API Functions
const api = {
    async getTenders(filters = {}) {
        const params = new URLSearchParams();
        if (filters.state && filters.state !== 'ALL') params.set('state', filters.state);
        params.set('limit', filters.limit || 200);
        
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

// Toast Notification Component
function Toast({ message, type, onClose }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);
    
    return (
        <div className={`toast toast-${type}`}>
            <span className="toast-icon mdi mdi-${type === 'success' ? 'check-circle' : 'alert-circle'}"></span>
            <span>{message}</span>
        </div>
    );
}

// Components
function Header({ activeTab, setActiveTab, onScrape, lastUpdate }) {
    const [scraping, setScraping] = useState(false);
    
    const handleScrape = async () => {
        setScraping(true);
        await onScrape();
        setScraping(false);
    };
    
    return (
        <header className="header">
            <div className="header-top">
                <div>
                    <span className="mdi mdi-clock-outline"></span> Last Updated: {lastUpdate || 'Loading...'}
                </div>
                <div className="header-badge">
                    <span className="mdi mdi-shield-check"></span> Government Certified Platform
                </div>
            </div>
            <div className="header-main">
                <div className="logo">
                    <div className="logo-icon">
                        <span className="mdi mdi-domain"></span>
                    </div>
                    <div className="logo-text">
                        <div className="logo-title">Visionex Solutions</div>
                        <div className="logo-subtitle">Tender Intelligence Platform</div>
                    </div>
                </div>
                <div className="header-actions">
                    <button 
                        className="header-btn"
                        onClick={handleScrape}
                        disabled={scraping}
                    >
                        <span className="mdi mdi-cloud-sync"></span>
                        {scraping ? 'Syncing...' : 'Sync Data'}
                    </button>
                    <button className="header-btn-primary header-btn">
                        <span className="mdi mdi-bell-outline"></span>
                        Alerts
                    </button>
                </div>
            </div>
            <nav className="nav">
                <div className="nav-content">
                    <a 
                        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        <span className="mdi mdi-view-dashboard-outline"></span>
                        Dashboard
                    </a>
                    <a 
                        className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analytics')}
                    >
                        <span className="mdi mdi-chart-bar"></span>
                        Analytics
                    </a>
                    <a 
                        className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reports')}
                    >
                        <span className="mdi mdi-file-document-outline"></span>
                        Reports
                    </a>
                </div>
            </nav>
        </header>
    );
}

function StatsGrid({ tenders, loading }) {
    const stats = useMemo(() => {
        if (!tenders.length) return {
            total: 0,
            totalValue: 0,
            avgValue: 0,
            activeStates: 0,
            thisMonth: 0,
            highValue: 0
        };
        
        const totalValue = tenders.reduce((sum, t) => sum + (parseFloat(t.value_amount) || 0), 0);
        const uniqueStates = new Set(tenders.filter(t => t.state).map(t => t.state));
        
        // Tenders this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonth = tenders.filter(t => {
            if (!t.date_signed) return false;
            const date = new Date(t.date_signed);
            return date >= startOfMonth;
        }).length;
        
        // High value count (over $1M)
        const highValue = tenders.filter(t => parseFloat(t.value_amount) > 1000000).length;
        
        return {
            total: tenders.length,
            totalValue,
            avgValue: totalValue / tenders.length,
            activeStates: uniqueStates.size,
            thisMonth,
            highValue
        };
    }, [tenders]);
    
    return (
        <div className="stats-grid">
            <div className="stat-card blue">
                <div className="stat-header">
                    <div className="stat-content">
                        <div className="stat-label">Total Tenders</div>
                        <div className="stat-value">{loading ? '...' : stats.total}</div>
                    </div>
                    <div className="stat-icon blue">
                        <span className="mdi mdi-file-document-multiple"></span>
                    </div>
                </div>
                <div className="stat-footer">
                    <span className="stat-trend up">
                        <span className="mdi mdi-trending-up"></span>
                        {stats.thisMonth} this month
                    </span>
                    <span className="stat-period">Construction only</span>
                </div>
            </div>
            
            <div className="stat-card green">
                <div className="stat-header">
                    <div className="stat-content">
                        <div className="stat-label">Total Value</div>
                        <div className="stat-value" style={{ fontSize: '1.75rem' }}>
                            {loading ? '...' : formatCurrency(stats.totalValue)}
                        </div>
                    </div>
                    <div className="stat-icon green">
                        <span className="mdi mdi-currency-usd"></span>
                    </div>
                </div>
                <div className="stat-footer">
                    <span className="stat-trend up">
                        <span className="mdi mdi-trending-up"></span>
                        {stats.highValue} over $1M
                    </span>
                    <span className="stat-period">All tenders</span>
                </div>
            </div>
            
            <div className="stat-card purple">
                <div className="stat-header">
                    <div className="stat-content">
                        <div className="stat-label">Average Value</div>
                        <div className="stat-value" style={{ fontSize: '1.75rem' }}>
                            {loading ? '...' : formatCurrency(stats.avgValue)}
                        </div>
                    </div>
                    <div className="stat-icon purple">
                        <span className="mdi mdi-chart-line"></span>
                    </div>
                </div>
                <div className="stat-footer">
                    <span className="stat-trend">
                        <span className="mdi mdi-calculator"></span>
                        Per tender
                    </span>
                    <span className="stat-period">Median value</span>
                </div>
            </div>
            
            <div className="stat-card orange">
                <div className="stat-header">
                    <div className="stat-content">
                        <div className="stat-label">Active Regions</div>
                        <div className="stat-value">{loading ? '...' : stats.activeStates}</div>
                    </div>
                    <div className="stat-icon orange">
                        <span className="mdi mdi-map-marker-radius"></span>
                    </div>
                </div>
                <div className="stat-footer">
                    <span className="stat-trend">
                        <span className="mdi mdi-map"></span>
                        States/Territories
                    </span>
                    <span className="stat-period">Australia-wide</span>
                </div>
            </div>
        </div>
    );
}

function ControlsPanel({ filters, setFilters, onRefresh, onExport, loading, tendersCount }) {
    return (
        <div className="controls-panel">
            <div className="controls-header">
                <div className="controls-title">
                    <div className="title-icon">
                        <span className="mdi mdi-filter-variant"></span>
                    </div>
                    Advanced Search & Filters
                </div>
                <div className="btn-group">
                    <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
                        <span className="mdi mdi-refresh"></span>
                        Refresh
                    </button>
                    <button className="btn btn-success" onClick={onExport} disabled={!tendersCount}>
                        <span className="mdi mdi-microsoft-excel"></span>
                        Export to CSV
                    </button>
                </div>
            </div>
            
            <div className="controls-grid">
                <div className="control-group">
                    <label className="control-label">
                        <span className="mdi mdi-magnify"></span> Search Keywords
                    </label>
                    <div className="search-box">
                        <span className="search-icon mdi mdi-magnify"></span>
                        <input
                            type="text"
                            className="control-input search-input"
                            placeholder="Search titles, descriptions, organizations..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                    </div>
                </div>
                
                <div className="control-group">
                    <label className="control-label">
                        <span className="mdi mdi-map-marker"></span> State/Territory
                    </label>
                    <select
                        className="control-select"
                        value={filters.state}
                        onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                    >
                        <option value="ALL">All States & Territories</option>
                        <option value="NSW">New South Wales</option>
                        <option value="VIC">Victoria</option>
                        <option value="QLD">Queensland</option>
                        <option value="SA">South Australia</option>
                        <option value="WA">Western Australia</option>
                        <option value="TAS">Tasmania</option>
                        <option value="ACT">Australian Capital Territory</option>
                        <option value="NT">Northern Territory</option>
                    </select>
                </div>
                
                <div className="control-group">
                    <label className="control-label">
                        <span className="mdi mdi-currency-usd"></span> Minimum Value
                    </label>
                    <input
                        type="number"
                        className="control-input"
                        placeholder="$0"
                        value={filters.minValue}
                        onChange={(e) => setFilters({ ...filters, minValue: e.target.value })}
                    />
                </div>
                
                <div className="control-group">
                    <label className="control-label">
                        <span className="mdi mdi-currency-usd"></span> Maximum Value
                    </label>
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

function TenderCard({ tender, onClick, index }) {
    const tenderId = `TND-${String(index + 1).padStart(6, '0')}`;
    
    const getAusTenderUrl = (tender) => {
        if (tender.cn_id) {
            return `https://www.tenders.gov.au/Cn/Show/${tender.cn_id}`;
        }
        return 'https://www.tenders.gov.au/';
    };
    
    const isPriority = parseFloat(tender.value_amount) > 5000000;
    
    return (
        <div className="tender-card" onClick={onClick}>
            <div className="tender-header">
                <div className="tender-title-section">
                    <div className="tender-id">{tenderId}</div>
                    <div className="tender-title">{tender.title || 'Untitled Tender'}</div>
                </div>
                <div className="tender-value-section">
                    <div className="tender-value-label">Contract Value</div>
                    <div className="tender-value">{formatCurrency(tender.value_amount)}</div>
                </div>
            </div>
            
            {tender.description && (
                <div className="tender-description">
                    {tender.description.length > 250 
                        ? tender.description.substring(0, 250) + '...' 
                        : tender.description
                    }
                </div>
            )}
            
            <div className="tender-meta">
                {tender.buyer_name && (
                    <div className="tender-meta-item">
                        <span className="meta-icon mdi mdi-office-building"></span>
                        <span className="meta-label">Buyer:</span>
                        <span className="meta-value">{tender.buyer_name}</span>
                    </div>
                )}
                {tender.supplier_name && (
                    <div className="tender-meta-item">
                        <span className="meta-icon mdi mdi-account-hard-hat"></span>
                        <span className="meta-label">Supplier:</span>
                        <span className="meta-value">{tender.supplier_name}</span>
                    </div>
                )}
                {tender.date_signed && (
                    <div className="tender-meta-item">
                        <span className="meta-icon mdi mdi-calendar-check"></span>
                        <span className="meta-label">Signed:</span>
                        <span className="meta-value">{formatDate(tender.date_signed)}</span>
                    </div>
                )}
                {tender.state && (
                    <div className="tender-meta-item">
                        <span className="meta-icon mdi mdi-map-marker"></span>
                        <span className="meta-label">Location:</span>
                        <span className="meta-value">{tender.state}</span>
                    </div>
                )}
            </div>
            
            <div className="tender-footer">
                <div className="tender-badges">
                    {tender.state && (
                        <span className="badge badge-state">
                            <span className="mdi mdi-map-marker"></span>
                            {tender.state}
                        </span>
                    )}
                    {tender.category && (
                        <span className="badge badge-category">
                            <span className="mdi mdi-shape"></span>
                            {tender.category}
                        </span>
                    )}
                    <span className="badge badge-construction">
                        <span className="mdi mdi-hammer-wrench"></span>
                        Construction
                    </span>
                    {isPriority && (
                        <span className="badge badge-priority">
                            <span className="mdi mdi-star"></span>
                            High Value
                        </span>
                    )}
                </div>
                <a 
                    href={getAusTenderUrl(tender)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="mdi mdi-open-in-new"></span>
                    View on AusTender
                </a>
            </div>
        </div>
    );
}

function TenderModal({ tender, onClose, index }) {
    if (!tender) return null;
    
    const tenderId = `TND-${String(index + 1).padStart(6, '0')}`;
    
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
                    <div className="modal-title-section">
                        <div className="modal-id">{tenderId}</div>
                        <h2 className="modal-title">{tender.title || 'Untitled Tender'}</h2>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <span className="mdi mdi-close"></span>
                    </button>
                </div>
                
                <div className="modal-body">
                    <div className="detail-grid">
                        <div className="detail-section detail-highlight">
                            <div className="detail-label">
                                <span className="mdi mdi-currency-usd"></span>
                                Contract Value
                            </div>
                            <div className="detail-value">{formatCurrency(tender.value_amount)}</div>
                        </div>
                        
                        <div className="detail-section">
                            <div className="detail-label">
                                <span className="mdi mdi-calendar-check"></span>
                                Date Signed
                            </div>
                            <div className="detail-value">{formatDate(tender.date_signed)}</div>
                        </div>
                        
                        {tender.state && (
                            <div className="detail-section">
                                <div className="detail-label">
                                    <span className="mdi mdi-map-marker"></span>
                                    State/Territory
                                </div>
                                <div className="detail-value">{tender.state}</div>
                            </div>
                        )}
                        
                        {tender.category && (
                            <div className="detail-section">
                                <div className="detail-label">
                                    <span className="mdi mdi-shape"></span>
                                    Category
                                </div>
                                <div className="detail-value">{tender.category}</div>
                            </div>
                        )}
                    </div>
                    
                    {tender.description && (
                        <div className="detail-section" style={{ marginTop: '2rem' }}>
                            <div className="detail-label">
                                <span className="mdi mdi-text"></span>
                                Description
                            </div>
                            <div className="detail-value">{tender.description}</div>
                        </div>
                    )}
                    
                    {tender.buyer_name && (
                        <div className="detail-section">
                            <div className="detail-label">
                                <span className="mdi mdi-office-building"></span>
                                Buyer Organization
                            </div>
                            <div className="detail-value">{tender.buyer_name}</div>
                        </div>
                    )}
                    
                    {tender.supplier_name && (
                        <div className="detail-section">
                            <div className="detail-label">
                                <span className="mdi mdi-account-hard-hat"></span>
                                Supplier
                            </div>
                            <div className="detail-value">{tender.supplier_name}</div>
                        </div>
                    )}
                    
                    <div className="detail-section" style={{ marginTop: '2rem' }}>
                        <a 
                            href={getAusTenderUrl(tender)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center', padding: '1rem' }}
                        >
                            <span className="mdi mdi-open-in-new"></span>
                            View Complete Tender Details on AusTender
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TenderList({ tenders, loading, onTenderClick }) {
    const [page, setPage] = useState(1);
    const itemsPerPage = 20;
    
    const paginatedTenders = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return tenders.slice(start, end);
    }, [tenders, page]);
    
    const totalPages = Math.ceil(tenders.length / itemsPerPage);
    
    useEffect(() => {
        setPage(1);
    }, [tenders]);
    
    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p className="loading-text">Loading tender data...</p>
            </div>
        );
    }
    
    if (!tenders.length) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <span className="mdi mdi-file-document-alert-outline"></span>
                </div>
                <h3 className="empty-state-title">No tenders found</h3>
                <p className="empty-state-description">Try adjusting your search criteria or refresh the data</p>
            </div>
        );
    }
    
    return (
        <>
            <div className="tender-list">
                {paginatedTenders.map((tender, index) => (
                    <TenderCard 
                        key={index}
                        tender={tender}
                        index={(page - 1) * itemsPerPage + index}
                        onClick={() => onTenderClick(tender, (page - 1) * itemsPerPage + index)}
                    />
                ))}
            </div>
            
            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="pagination-btn"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        <span className="mdi mdi-chevron-left"></span>
                        Previous
                    </button>
                    
                    <span className="pagination-info">
                        Page {page} of {totalPages} ({tenders.length} tenders)
                    </span>
                    
                    <button
                        className="pagination-btn"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        Next
                        <span className="mdi mdi-chevron-right"></span>
                    </button>
                </div>
            )}
        </>
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
            byState: Object.entries(byState).sort((a, b) => b[1].value - a[1].value),
            byCategory: Object.entries(byCategory).sort((a, b) => b[1].value - a[1].value),
            byBuyer: Object.entries(byBuyer).sort((a, b) => b[1].value - a[1].value).slice(0, 12),
            valueRanges: ranges.filter(r => r.count > 0)
        };
    }, [tenders]);
    
    if (!analytics) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <span className="mdi mdi-chart-line"></span>
                </div>
                <h3 className="empty-state-title">No analytics available</h3>
                <p className="empty-state-description">Load tender data to see insights and trends</p>
            </div>
        );
    }
    
    return (
        <div>
            <div className="analytics-header">
                <h2 className="analytics-title">Market Intelligence & Insights</h2>
                <p className="analytics-subtitle">Comprehensive analysis of Australian construction tender market</p>
            </div>
            
            <div className="analytics-grid">
                <div className="chart-card">
                    <div className="chart-header">
                        <div className="chart-icon">
                            <span className="mdi mdi-map-marker-multiple"></span>
                        </div>
                        <h3 className="chart-title">Regional Distribution</h3>
                    </div>
                    <div className="chart-list">
                        {analytics.byState.map(([state, data]) => (
                            <div key={state} className="chart-item">
                                <div>
                                    <div className="chart-item-label">{state}</div>
                                    <div className="chart-item-count">{data.count} tenders</div>
                                </div>
                                <span className="chart-item-value">{formatCurrency(data.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="chart-card">
                    <div className="chart-header">
                        <div className="chart-icon">
                            <span className="mdi mdi-shape"></span>
                        </div>
                        <h3 className="chart-title">Category Breakdown</h3>
                    </div>
                    <div className="chart-list">
                        {analytics.byCategory.map(([category, data]) => (
                            <div key={category} className="chart-item">
                                <div>
                                    <div className="chart-item-label">{category}</div>
                                    <div className="chart-item-count">{data.count} tenders</div>
                                </div>
                                <span className="chart-item-value">{formatCurrency(data.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="chart-card">
                    <div className="chart-header">
                        <div className="chart-icon">
                            <span className="mdi mdi-office-building"></span>
                        </div>
                        <h3 className="chart-title">Top Buying Organizations</h3>
                    </div>
                    <div className="chart-list">
                        {analytics.byBuyer.map(([buyer, data]) => (
                            <div key={buyer} className="chart-item">
                                <div>
                                    <div className="chart-item-label" style={{ 
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '220px'
                                    }}>
                                        {buyer}
                                    </div>
                                    <div className="chart-item-count">{data.count} contracts</div>
                                </div>
                                <span className="chart-item-value">{formatCurrency(data.value)}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="chart-card">
                    <div className="chart-header">
                        <div className="chart-icon">
                            <span className="mdi mdi-chart-bar"></span>
                        </div>
                        <h3 className="chart-title">Value Distribution</h3>
                    </div>
                    <div className="chart-list">
                        {analytics.valueRanges.map((range) => (
                            <div key={range.label} className="chart-item">
                                <div className="chart-item-label">{range.label}</div>
                                <span className="chart-item-value">{range.count} tenders</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ReportsTab() {
    return (
        <div className="empty-state">
            <div className="empty-state-icon">
                <span className="mdi mdi-file-document-multiple"></span>
            </div>
            <h3 className="empty-state-title">Custom Reports</h3>
            <p className="empty-state-description">Generate detailed reports and exports (Coming Soon)</p>
        </div>
    );
}

function Dashboard() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [tenders, setTenders] = useState([]);
    const [filteredTenders, setFilteredTenders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTender, setSelectedTender] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [toast, setToast] = useState(null);
    const [filters, setFilters] = useState({
        search: '',
        state: 'ALL',
        minValue: '',
        maxValue: ''
    });
    
    const loadTenders = async () => {
        setLoading(true);
        try {
            const data = await api.getTenders({ state: filters.state, limit: 200 });
            if (data.success) {
                setTenders(data.tenders);
                setLastUpdate(new Date().toLocaleString('en-AU', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: 'numeric',
                    month: 'short'
                }));
            }
        } catch (error) {
            console.error('Error loading tenders:', error);
            setToast({ message: 'Failed to load tenders', type: 'error' });
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
        try {
            const result = await api.triggerScrape();
            if (result.success) {
                setToast({ 
                    message: `Successfully scraped ${result.construction} construction tenders`, 
                    type: 'success' 
                });
                await loadTenders();
            }
        } catch (error) {
            setToast({ message: 'Scrape failed: ' + error.message, type: 'error' });
        }
    };
    
    const handleExport = () => {
        exportToCSV(filteredTenders);
        setToast({ message: 'Export successful', type: 'success' });
    };
    
    const handleTenderClick = (tender, index) => {
        setSelectedTender(tender);
        setSelectedIndex(index);
    };
    
    return (
        <div>
            <Header 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onScrape={handleScrape}
                lastUpdate={lastUpdate}
            />
            
            <div className="container">
                {activeTab === 'dashboard' ? (
                    <>
                        <StatsGrid tenders={filteredTenders} loading={loading} />
                        
                        <ControlsPanel
                            filters={filters}
                            setFilters={setFilters}
                            onRefresh={loadTenders}
                            onExport={handleExport}
                            loading={loading}
                            tendersCount={filteredTenders.length}
                        />
                        
                        <TenderList
                            tenders={filteredTenders}
                            loading={loading}
                            onTenderClick={handleTenderClick}
                        />
                    </>
                ) : activeTab === 'analytics' ? (
                    <AnalyticsTab tenders={tenders} />
                ) : (
                    <ReportsTab />
                )}
            </div>
            
            {selectedTender && (
                <TenderModal
                    tender={selectedTender}
                    index={selectedIndex}
                    onClose={() => setSelectedTender(null)}
                />
            )}
            
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}

// Render App
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<Dashboard />);
