import React, { useState, useEffect, useMemo, useCallback } from 'react';

// ============================================================================
// DATABRICKS DATA EXPLORER
// A clean, professional UI for browsing Unity Catalog schemas, tables & volumes
// ============================================================================

// Mock API service - replace with actual Databricks SDK calls
const DatabricksAPI = {
  // Unity Catalog endpoints
  async listSchemas(catalogName) {
    // In production: GET /api/2.1/unity-catalog/schemas?catalog_name={catalog}
    return mockSchemas;
  },
  
  async listTables(catalogName, schemaName) {
    // In production: GET /api/2.1/unity-catalog/tables?catalog_name={catalog}&schema_name={schema}
    return mockTables;
  },
  
  async listVolumes(catalogName, schemaName) {
    // In production: GET /api/2.1/unity-catalog/volumes?catalog_name={catalog}&schema_name={schema}
    return mockVolumes;
  },
  
  async getTableDetails(fullName) {
    // In production: GET /api/2.1/unity-catalog/tables/{full_name}
    return mockTableDetails[fullName];
  },
  
  async listDomains() {
    // Domains are a conceptual grouping - can be tags or a custom metadata field
    return mockDomains;
  }
};

// ============================================================================
// MOCK DATA - Replace with actual API responses
// ============================================================================

const mockDomains = [
  { id: 'finance', name: 'Finance', icon: '💰', color: '#10B981', tableCount: 24 },
  { id: 'marketing', name: 'Marketing', icon: '📊', color: '#6366F1', tableCount: 18 },
  { id: 'operations', name: 'Operations', icon: '⚙️', color: '#F59E0B', tableCount: 31 },
  { id: 'customers', name: 'Customers', icon: '👥', color: '#EC4899', tableCount: 15 },
  { id: 'products', name: 'Products', icon: '📦', color: '#8B5CF6', tableCount: 22 },
];

const mockSchemas = [
  { name: 'bronze', full_name: 'main.bronze', comment: 'Raw ingested data' },
  { name: 'silver', full_name: 'main.silver', comment: 'Cleaned and validated data' },
  { name: 'gold', full_name: 'main.gold', comment: 'Business-level aggregates' },
];

const mockTables = [
  { 
    name: 'customers', 
    full_name: 'main.gold.customers',
    table_type: 'MANAGED',
    data_source_format: 'DELTA',
    owner: 'data_engineering',
    domain: 'customers',
    updated_at: '2025-05-15T10:30:00Z',
    row_count: 1250000,
    size_bytes: 524288000,
    columns: ['customer_id', 'email', 'name', 'created_at', 'lifetime_value'],
    tags: ['pii', 'gdpr-compliant']
  },
  { 
    name: 'orders', 
    full_name: 'main.gold.orders',
    table_type: 'MANAGED',
    data_source_format: 'DELTA',
    owner: 'data_engineering',
    domain: 'operations',
    updated_at: '2025-05-16T08:15:00Z',
    row_count: 8750000,
    size_bytes: 2147483648,
    columns: ['order_id', 'customer_id', 'total', 'status', 'created_at'],
    tags: ['high-volume']
  },
  { 
    name: 'revenue_daily', 
    full_name: 'main.gold.revenue_daily',
    table_type: 'MANAGED',
    data_source_format: 'DELTA',
    owner: 'analytics',
    domain: 'finance',
    updated_at: '2025-05-16T06:00:00Z',
    row_count: 3650,
    size_bytes: 1048576,
    columns: ['date', 'revenue', 'orders', 'avg_order_value'],
    tags: ['kpi', 'executive']
  },
  { 
    name: 'marketing_campaigns', 
    full_name: 'main.gold.marketing_campaigns',
    table_type: 'MANAGED',
    data_source_format: 'DELTA',
    owner: 'marketing_ops',
    domain: 'marketing',
    updated_at: '2025-05-14T14:22:00Z',
    row_count: 450,
    size_bytes: 262144,
    columns: ['campaign_id', 'name', 'channel', 'budget', 'roi'],
    tags: []
  },
  { 
    name: 'product_catalog', 
    full_name: 'main.gold.product_catalog',
    table_type: 'MANAGED',
    data_source_format: 'DELTA',
    owner: 'product_team',
    domain: 'products',
    updated_at: '2025-05-15T16:45:00Z',
    row_count: 12500,
    size_bytes: 52428800,
    columns: ['product_id', 'sku', 'name', 'category', 'price', 'inventory'],
    tags: ['catalog']
  },
  { 
    name: 'user_events_raw', 
    full_name: 'main.bronze.user_events_raw',
    table_type: 'EXTERNAL',
    data_source_format: 'PARQUET',
    owner: 'data_engineering',
    domain: 'customers',
    updated_at: '2025-05-16T09:00:00Z',
    row_count: 125000000,
    size_bytes: 21474836480,
    columns: ['event_id', 'user_id', 'event_type', 'timestamp', 'properties'],
    tags: ['streaming', 'high-volume']
  },
];

const mockVolumes = [
  {
    name: 'landing_zone',
    full_name: 'main.bronze.landing_zone',
    volume_type: 'MANAGED',
    owner: 'data_engineering',
    updated_at: '2025-05-16T09:30:00Z',
    file_count: 1250,
    size_bytes: 10737418240,
  },
  {
    name: 'ml_models',
    full_name: 'main.gold.ml_models',
    volume_type: 'MANAGED',
    owner: 'ml_team',
    updated_at: '2025-05-15T18:00:00Z',
    file_count: 45,
    size_bytes: 5368709120,
  },
];

const mockTableDetails = {
  'main.gold.customers': {
    columns: [
      { name: 'customer_id', type: 'BIGINT', nullable: false, comment: 'Primary key' },
      { name: 'email', type: 'STRING', nullable: false, comment: 'Customer email (PII)' },
      { name: 'name', type: 'STRING', nullable: true, comment: 'Full name' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, comment: 'Account creation date' },
      { name: 'lifetime_value', type: 'DECIMAL(18,2)', nullable: true, comment: 'Total revenue from customer' },
    ]
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatNumber = (num) => {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ============================================================================
// ICONS (inline SVG components)
// ============================================================================

const Icons = {
  Search: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  ),
  Table: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18"/>
    </svg>
  ),
  Folder: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Database: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Filter: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
    </svg>
  ),
  Grid: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  List: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  SortAsc: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 8 4-4 4 4M7 4v16M11 12h4M11 16h7M11 20h10"/>
    </svg>
  ),
  SortDesc: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 16 4 4 4-4M7 20V4M11 4h10M11 8h7M11 12h4"/>
    </svg>
  ),
  X: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  External: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  ),
  Copy: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  Delta: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L2 22h20L12 2zm0 5l6.5 13h-13L12 7z"/>
    </svg>
  ),
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function DataExplorer({ 
  catalogName = 'main',
  defaultSchema = null,
  onTableSelect = null,
  onVolumeSelect = null,
}) {
  // State
  const [schemas, setSchemas] = useState([]);
  const [tables, setTables] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [domains, setDomains] = useState([]);
  const [selectedSchema, setSelectedSchema] = useState(defaultSchema);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [activeTab, setActiveTab] = useState('tables'); // 'tables' | 'volumes'
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDomains, setExpandedDomains] = useState(true);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [schemasData, domainsData] = await Promise.all([
          DatabricksAPI.listSchemas(catalogName),
          DatabricksAPI.listDomains(),
        ]);
        setSchemas(schemasData);
        setDomains(domainsData);
        
        if (schemasData.length > 0) {
          const schema = defaultSchema || schemasData[0].name;
          setSelectedSchema(schema);
          await loadSchemaData(schema);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [catalogName, defaultSchema]);

  const loadSchemaData = async (schemaName) => {
    setIsLoading(true);
    try {
      const [tablesData, volumesData] = await Promise.all([
        DatabricksAPI.listTables(catalogName, schemaName),
        DatabricksAPI.listVolumes(catalogName, schemaName),
      ]);
      setTables(tablesData);
      setVolumes(volumesData);
    } catch (err) {
      console.error('Failed to load schema data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchemaChange = async (schemaName) => {
    setSelectedSchema(schemaName);
    setSelectedDomain(null);
    setSearchQuery('');
    await loadSchemaData(schemaName);
  };

  // Filter and sort logic
  const filteredItems = useMemo(() => {
    const items = activeTab === 'tables' ? tables : volumes;
    
    return items
      .filter(item => {
        const matchesSearch = searchQuery === '' || 
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.columns && item.columns.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())));
        const matchesDomain = selectedDomain === null || item.domain === selectedDomain;
        return matchesSearch && matchesDomain;
      })
      .sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        if (sortField === 'updated_at') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        } else if (sortField === 'row_count' || sortField === 'size_bytes') {
          aVal = aVal || 0;
          bVal = bVal || 0;
        } else {
          aVal = (aVal || '').toString().toLowerCase();
          bVal = (bVal || '').toString().toLowerCase();
        }
        
        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1;
        }
        return aVal < bVal ? 1 : -1;
      });
  }, [tables, volumes, activeTab, searchQuery, selectedDomain, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    if (activeTab === 'tables' && onTableSelect) {
      onTableSelect(item);
    } else if (activeTab === 'volumes' && onVolumeSelect) {
      onVolumeSelect(item);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.catalogBadge}>
            <Icons.Database />
            <span>{catalogName}</span>
          </div>
        </div>

        {/* Schema Selector */}
        <div style={styles.sidebarSection}>
          <div style={styles.sidebarLabel}>Schema</div>
          <div style={styles.schemaList}>
            {schemas.map(schema => (
              <button
                key={schema.name}
                onClick={() => handleSchemaChange(schema.name)}
                style={{
                  ...styles.schemaItem,
                  ...(selectedSchema === schema.name ? styles.schemaItemActive : {}),
                }}
              >
                <Icons.Folder />
                <div style={styles.schemaItemContent}>
                  <span style={styles.schemaName}>{schema.name}</span>
                  <span style={styles.schemaComment}>{schema.comment}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Domains Filter */}
        <div style={styles.sidebarSection}>
          <button 
            onClick={() => setExpandedDomains(!expandedDomains)}
            style={styles.sidebarLabelButton}
          >
            <span>Domains</span>
            <span style={{ 
              transform: expandedDomains ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform 0.2s ease'
            }}>
              <Icons.ChevronDown />
            </span>
          </button>
          
          {expandedDomains && (
            <div style={styles.domainList}>
              <button
                onClick={() => setSelectedDomain(null)}
                style={{
                  ...styles.domainItem,
                  ...(selectedDomain === null ? styles.domainItemActive : {}),
                }}
              >
                <span style={styles.domainIcon}>🔍</span>
                <span style={styles.domainName}>All Domains</span>
                <span style={styles.domainCount}>{tables.length}</span>
              </button>
              {domains.map(domain => {
                const count = tables.filter(t => t.domain === domain.id).length;
                return (
                  <button
                    key={domain.id}
                    onClick={() => setSelectedDomain(domain.id)}
                    style={{
                      ...styles.domainItem,
                      ...(selectedDomain === domain.id ? styles.domainItemActive : {}),
                    }}
                  >
                    <span style={styles.domainIcon}>{domain.icon}</span>
                    <span style={styles.domainName}>{domain.name}</span>
                    <span style={{
                      ...styles.domainCount,
                      backgroundColor: count > 0 ? domain.color + '20' : undefined,
                      color: count > 0 ? domain.color : undefined,
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerTop}>
            <h1 style={styles.title}>
              Data Explorer
              <span style={styles.titleSchema}>
                <Icons.ChevronRight />
                {selectedSchema || 'Select schema'}
              </span>
            </h1>
          </div>

          {/* Toolbar */}
          <div style={styles.toolbar}>
            {/* Search */}
            <div style={styles.searchContainer}>
              <Icons.Search />
              <input
                type="text"
                placeholder="Search tables, columns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={styles.searchInput}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  style={styles.clearSearch}
                >
                  <Icons.X />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div style={styles.tabs}>
              <button
                onClick={() => setActiveTab('tables')}
                style={{
                  ...styles.tab,
                  ...(activeTab === 'tables' ? styles.tabActive : {}),
                }}
              >
                <Icons.Table />
                Tables
                <span style={styles.tabCount}>{tables.length}</span>
              </button>
              <button
                onClick={() => setActiveTab('volumes')}
                style={{
                  ...styles.tab,
                  ...(activeTab === 'volumes' ? styles.tabActive : {}),
                }}
              >
                <Icons.Folder />
                Volumes
                <span style={styles.tabCount}>{volumes.length}</span>
              </button>
            </div>

            {/* View Toggle */}
            <div style={styles.viewToggle}>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  ...styles.viewButton,
                  ...(viewMode === 'list' ? styles.viewButtonActive : {}),
                }}
              >
                <Icons.List />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  ...styles.viewButton,
                  ...(viewMode === 'grid' ? styles.viewButtonActive : {}),
                }}
              >
                <Icons.Grid />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div style={styles.content}>
          {isLoading ? (
            <div style={styles.loading}>
              <div style={styles.loadingSpinner} />
              <span>Loading...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={styles.empty}>
              <Icons.Table />
              <p>No {activeTab} found</p>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={styles.clearButton}>
                  Clear search
                </button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>
                      <button onClick={() => handleSort('name')} style={styles.sortButton}>
                        Name
                        {sortField === 'name' && (
                          sortDirection === 'asc' ? <Icons.SortAsc /> : <Icons.SortDesc />
                        )}
                      </button>
                    </th>
                    {activeTab === 'tables' && (
                      <>
                        <th style={styles.th}>Type</th>
                        <th style={styles.th}>
                          <button onClick={() => handleSort('row_count')} style={styles.sortButton}>
                            Rows
                            {sortField === 'row_count' && (
                              sortDirection === 'asc' ? <Icons.SortAsc /> : <Icons.SortDesc />
                            )}
                          </button>
                        </th>
                      </>
                    )}
                    <th style={styles.th}>
                      <button onClick={() => handleSort('size_bytes')} style={styles.sortButton}>
                        Size
                        {sortField === 'size_bytes' && (
                          sortDirection === 'asc' ? <Icons.SortAsc /> : <Icons.SortDesc />
                        )}
                      </button>
                    </th>
                    <th style={styles.th}>
                      <button onClick={() => handleSort('updated_at')} style={styles.sortButton}>
                        Updated
                        {sortField === 'updated_at' && (
                          sortDirection === 'asc' ? <Icons.SortAsc /> : <Icons.SortDesc />
                        )}
                      </button>
                    </th>
                    <th style={styles.th}>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr 
                      key={item.full_name}
                      onClick={() => handleItemSelect(item)}
                      style={{
                        ...styles.tr,
                        ...(selectedItem?.full_name === item.full_name ? styles.trSelected : {}),
                      }}
                    >
                      <td style={styles.td}>
                        <div style={styles.nameCell}>
                          {activeTab === 'tables' ? (
                            item.data_source_format === 'DELTA' ? (
                              <span style={styles.deltaIcon}><Icons.Delta /></span>
                            ) : (
                              <Icons.Table />
                            )
                          ) : (
                            <Icons.Folder />
                          )}
                          <div style={styles.nameContent}>
                            <span style={styles.itemName}>{item.name}</span>
                            <span style={styles.itemPath}>{item.full_name}</span>
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <div style={styles.tags}>
                              {item.tags.slice(0, 2).map(tag => (
                                <span key={tag} style={styles.tag}>{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      {activeTab === 'tables' && (
                        <>
                          <td style={styles.td}>
                            <span style={{
                              ...styles.typeBadge,
                              ...(item.table_type === 'EXTERNAL' ? styles.typeBadgeExternal : {}),
                            }}>
                              {item.table_type === 'EXTERNAL' && <Icons.External />}
                              {item.table_type}
                            </span>
                          </td>
                          <td style={styles.tdNumeric}>
                            {formatNumber(item.row_count)}
                          </td>
                        </>
                      )}
                      <td style={styles.tdNumeric}>
                        {formatBytes(item.size_bytes)}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.date}>{formatDate(item.updated_at)}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.owner}>{item.owner}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.grid}>
              {filteredItems.map((item) => (
                <button
                  key={item.full_name}
                  onClick={() => handleItemSelect(item)}
                  style={{
                    ...styles.card,
                    ...(selectedItem?.full_name === item.full_name ? styles.cardSelected : {}),
                  }}
                >
                  <div style={styles.cardHeader}>
                    {activeTab === 'tables' && item.data_source_format === 'DELTA' ? (
                      <span style={styles.deltaIconLarge}><Icons.Delta /></span>
                    ) : activeTab === 'tables' ? (
                      <Icons.Table />
                    ) : (
                      <Icons.Folder />
                    )}
                    {item.domain && (
                      <span style={{
                        ...styles.domainBadge,
                        backgroundColor: domains.find(d => d.id === item.domain)?.color + '20',
                        color: domains.find(d => d.id === item.domain)?.color,
                      }}>
                        {domains.find(d => d.id === item.domain)?.icon}
                      </span>
                    )}
                  </div>
                  <div style={styles.cardBody}>
                    <h3 style={styles.cardTitle}>{item.name}</h3>
                    <p style={styles.cardPath}>{item.full_name}</p>
                  </div>
                  <div style={styles.cardFooter}>
                    <span>{activeTab === 'tables' ? formatNumber(item.row_count) + ' rows' : formatNumber(item.file_count) + ' files'}</span>
                    <span>{formatBytes(item.size_bytes)}</span>
                  </div>
                  {item.tags && item.tags.length > 0 && (
                    <div style={styles.cardTags}>
                      {item.tags.map(tag => (
                        <span key={tag} style={styles.tag}>{tag}</span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer with stats */}
        <footer style={styles.footer}>
          <span>
            Showing {filteredItems.length} of {activeTab === 'tables' ? tables.length : volumes.length} {activeTab}
          </span>
          {selectedDomain && (
            <button 
              onClick={() => setSelectedDomain(null)}
              style={styles.clearFilter}
            >
              <Icons.X />
              Clear domain filter
            </button>
          )}
        </footer>
      </main>

      {/* Detail Panel */}
      {selectedItem && (
        <aside style={styles.detailPanel}>
          <div style={styles.detailHeader}>
            <h2 style={styles.detailTitle}>{selectedItem.name}</h2>
            <button 
              onClick={() => setSelectedItem(null)}
              style={styles.closeButton}
            >
              <Icons.X />
            </button>
          </div>

          <div style={styles.detailContent}>
            {/* Full path with copy */}
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Full Name</span>
              <div style={styles.detailValueWithCopy}>
                <code style={styles.codePath}>{selectedItem.full_name}</code>
                <button 
                  onClick={() => copyToClipboard(selectedItem.full_name)}
                  style={styles.copyButton}
                  title="Copy to clipboard"
                >
                  <Icons.Copy />
                </button>
              </div>
            </div>

            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Type</span>
              <span style={styles.detailValue}>
                {selectedItem.table_type || selectedItem.volume_type}
                {selectedItem.data_source_format && ` · ${selectedItem.data_source_format}`}
              </span>
            </div>

            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Owner</span>
              <span style={styles.detailValue}>{selectedItem.owner}</span>
            </div>

            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Last Updated</span>
              <span style={styles.detailValue}>
                {new Date(selectedItem.updated_at).toLocaleString()}
              </span>
            </div>

            {selectedItem.row_count !== undefined && (
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Row Count</span>
                <span style={styles.detailValue}>{selectedItem.row_count.toLocaleString()}</span>
              </div>
            )}

            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Size</span>
              <span style={styles.detailValue}>{formatBytes(selectedItem.size_bytes)}</span>
            </div>

            {/* Columns preview */}
            {selectedItem.columns && (
              <div style={styles.columnsSection}>
                <span style={styles.detailLabel}>
                  Columns ({selectedItem.columns.length})
                </span>
                <div style={styles.columnsList}>
                  {selectedItem.columns.map((col, i) => (
                    <span key={i} style={styles.columnChip}>{col}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {selectedItem.tags && selectedItem.tags.length > 0 && (
              <div style={styles.tagsSection}>
                <span style={styles.detailLabel}>Tags</span>
                <div style={styles.tagsList}>
                  {selectedItem.tags.map(tag => (
                    <span key={tag} style={styles.tagLarge}>{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={styles.detailActions}>
            <button style={styles.actionButton}>
              Open in Catalog Explorer
              <Icons.External />
            </button>
            <button style={styles.actionButtonSecondary}>
              Query Table
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif',
    backgroundColor: '#0D0D0F',
    color: '#E8E8EA',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  
  // Sidebar
  sidebar: {
    width: '260px',
    borderRight: '1px solid #2A2A30',
    backgroundColor: '#131316',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '20px 16px',
    borderBottom: '1px solid #2A2A30',
  },
  catalogBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: '#FF6B35',
    color: '#0D0D0F',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '13px',
  },
  sidebarSection: {
    padding: '16px',
    borderBottom: '1px solid #2A2A30',
  },
  sidebarLabel: {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#6B6B76',
    marginBottom: '10px',
  },
  sidebarLabelButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#6B6B76',
    marginBottom: '10px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  schemaList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  schemaItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 12px',
    background: 'none',
    border: '1px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#B0B0B8',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  schemaItemActive: {
    backgroundColor: '#1E1E24',
    borderColor: '#FF6B35',
    color: '#E8E8EA',
  },
  schemaItemContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  schemaName: {
    fontWeight: 500,
  },
  schemaComment: {
    fontSize: '12px',
    color: '#6B6B76',
  },
  domainList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  domainItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    background: 'none',
    border: '1px solid transparent',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#B0B0B8',
    textAlign: 'left',
    transition: 'all 0.15s ease',
    width: '100%',
  },
  domainItemActive: {
    backgroundColor: '#1E1E24',
    borderColor: '#3A3A42',
    color: '#E8E8EA',
  },
  domainIcon: {
    fontSize: '14px',
  },
  domainName: {
    flex: 1,
    fontSize: '13px',
  },
  domainCount: {
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '10px',
    backgroundColor: '#2A2A30',
    color: '#6B6B76',
  },

  // Main
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  header: {
    padding: '20px 24px 16px',
    borderBottom: '1px solid #2A2A30',
    backgroundColor: '#131316',
  },
  headerTop: {
    marginBottom: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  titleSchema: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    color: '#6B6B76',
    fontWeight: 400,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  searchContainer: {
    flex: 1,
    maxWidth: '400px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 14px',
    backgroundColor: '#1E1E24',
    borderRadius: '8px',
    border: '1px solid #2A2A30',
    color: '#6B6B76',
  },
  searchInput: {
    flex: 1,
    background: 'none',
    border: 'none',
    outline: 'none',
    color: '#E8E8EA',
    fontSize: '14px',
  },
  clearSearch: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: '#6B6B76',
    cursor: 'pointer',
    padding: '2px',
    borderRadius: '4px',
  },
  tabs: {
    display: 'flex',
    backgroundColor: '#1E1E24',
    borderRadius: '8px',
    padding: '4px',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: 'none',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    color: '#6B6B76',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.15s ease',
  },
  tabActive: {
    backgroundColor: '#2A2A30',
    color: '#E8E8EA',
  },
  tabCount: {
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '10px',
    backgroundColor: '#2A2A30',
  },
  viewToggle: {
    display: 'flex',
    backgroundColor: '#1E1E24',
    borderRadius: '6px',
    padding: '2px',
  },
  viewButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 10px',
    background: 'none',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#6B6B76',
    transition: 'all 0.15s ease',
  },
  viewButtonActive: {
    backgroundColor: '#2A2A30',
    color: '#E8E8EA',
  },

  // Content
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '0',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    height: '200px',
    color: '#6B6B76',
  },
  loadingSpinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #2A2A30',
    borderTopColor: '#FF6B35',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    height: '200px',
    color: '#6B6B76',
  },
  clearButton: {
    padding: '8px 16px',
    backgroundColor: '#2A2A30',
    border: 'none',
    borderRadius: '6px',
    color: '#E8E8EA',
    cursor: 'pointer',
  },

  // Table view
  tableContainer: {
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    position: 'sticky',
    top: 0,
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#6B6B76',
    backgroundColor: '#131316',
    borderBottom: '1px solid #2A2A30',
    whiteSpace: 'nowrap',
  },
  sortButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: 'inherit',
    fontWeight: 'inherit',
    textTransform: 'inherit',
    letterSpacing: 'inherit',
    padding: 0,
  },
  tr: {
    borderBottom: '1px solid #1E1E24',
    cursor: 'pointer',
    transition: 'background-color 0.1s ease',
  },
  trSelected: {
    backgroundColor: '#1A1A20',
  },
  td: {
    padding: '14px 16px',
    verticalAlign: 'middle',
  },
  tdNumeric: {
    padding: '14px 16px',
    verticalAlign: 'middle',
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: '13px',
    color: '#B0B0B8',
  },
  nameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  deltaIcon: {
    color: '#10B981',
  },
  nameContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  itemName: {
    fontWeight: 500,
  },
  itemPath: {
    fontSize: '12px',
    color: '#6B6B76',
    fontFamily: '"IBM Plex Mono", monospace',
  },
  tags: {
    display: 'flex',
    gap: '4px',
    marginLeft: 'auto',
  },
  tag: {
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#2A2A30',
    color: '#B0B0B8',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  typeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '4px',
    backgroundColor: '#1E3A2F',
    color: '#10B981',
  },
  typeBadgeExternal: {
    backgroundColor: '#2D2A1E',
    color: '#F59E0B',
  },
  date: {
    color: '#6B6B76',
  },
  owner: {
    color: '#B0B0B8',
  },

  // Grid view
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
    padding: '20px 24px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    backgroundColor: '#131316',
    border: '1px solid #2A2A30',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  cardSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#1A1A20',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
    color: '#6B6B76',
  },
  deltaIconLarge: {
    color: '#10B981',
  },
  domainBadge: {
    fontSize: '12px',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  cardBody: {
    marginBottom: '12px',
  },
  cardTitle: {
    margin: '0 0 4px',
    fontSize: '15px',
    fontWeight: 500,
  },
  cardPath: {
    margin: 0,
    fontSize: '12px',
    color: '#6B6B76',
    fontFamily: '"IBM Plex Mono", monospace',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#6B6B76',
    paddingTop: '12px',
    borderTop: '1px solid #2A2A30',
  },
  cardTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '12px',
  },

  // Footer
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    borderTop: '1px solid #2A2A30',
    backgroundColor: '#131316',
    fontSize: '13px',
    color: '#6B6B76',
  },
  clearFilter: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    background: 'none',
    border: '1px solid #2A2A30',
    borderRadius: '4px',
    color: '#B0B0B8',
    cursor: 'pointer',
    fontSize: '12px',
  },

  // Detail Panel
  detailPanel: {
    width: '340px',
    borderLeft: '1px solid #2A2A30',
    backgroundColor: '#131316',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px',
    borderBottom: '1px solid #2A2A30',
  },
  detailTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
  },
  closeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    background: 'none',
    border: '1px solid #2A2A30',
    borderRadius: '6px',
    color: '#6B6B76',
    cursor: 'pointer',
  },
  detailContent: {
    flex: 1,
    overflow: 'auto',
    padding: '20px',
  },
  detailRow: {
    marginBottom: '16px',
  },
  detailLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#6B6B76',
    marginBottom: '6px',
  },
  detailValue: {
    color: '#E8E8EA',
  },
  detailValueWithCopy: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  codePath: {
    flex: 1,
    padding: '8px 10px',
    backgroundColor: '#1E1E24',
    borderRadius: '6px',
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: '12px',
    color: '#B0B0B8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  copyButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    backgroundColor: '#1E1E24',
    border: 'none',
    borderRadius: '6px',
    color: '#6B6B76',
    cursor: 'pointer',
  },
  columnsSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #2A2A30',
  },
  columnsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px',
  },
  columnChip: {
    padding: '4px 10px',
    backgroundColor: '#1E1E24',
    borderRadius: '4px',
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: '12px',
    color: '#B0B0B8',
  },
  tagsSection: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #2A2A30',
  },
  tagsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '8px',
  },
  tagLarge: {
    padding: '6px 12px',
    backgroundColor: '#2A2A30',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#E8E8EA',
  },
  detailActions: {
    padding: '20px',
    borderTop: '1px solid #2A2A30',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#FF6B35',
    border: 'none',
    borderRadius: '8px',
    color: '#0D0D0F',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  actionButtonSecondary: {
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #2A2A30',
    borderRadius: '8px',
    color: '#E8E8EA',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

// Add keyframe animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
`;
document.head.appendChild(styleSheet);
