import React, { useState, useEffect, useMemo } from 'react';

// ============================================================================
// DOMINO'S MARKETING ANALYTICS DASHBOARD - ENHANCED VISUALIZATIONS
// ============================================================================

// ============================================================================
// MOCK DATA - Replace with actual Databricks queries
// ============================================================================

const mockData = {
  // Overview KPIs
  kpis: {
    totalRevenue: 886304772,
    totalOrders: 17264141,
    avgOrderValue: 51,
    customerSatisfaction: 4.8,
    revenueChange: 12.5,
    ordersChange: 8.3,
    aovChange: 3.2,
    satisfactionChange: -1.5,
  },
  
  // Channel performance
  channels: [
    { name: 'Mobile App', revenue: 478604578, orders: 9382876, cac: 8.45, color: '#3B82F6' },
    { name: 'Online', revenue: 230439241, orders: 4489476, cac: 12.30, color: '#10B981' },
    { name: 'Phone', revenue: 115020620, orders: 2246141, cac: 18.75, color: '#F59E0B' },
    { name: 'Walk-in', revenue: 62240333, orders: 1145648, cac: 5.20, color: '#8B5CF6' },
  ],
  
  // Hourly order distribution (24 hours x 7 days)
  hourlyHeatmap: generateHourlyHeatmap(),
  
  // Customer segments
  segments: [
    { name: 'Families', customers: 2850000, arpu: 4697, ltv: 892, retention: 78, color: '#EC4899' },
    { name: 'Young Adults', customers: 4200000, arpu: 2340, ltv: 445, retention: 62, color: '#3B82F6' },
    { name: 'Office Orders', customers: 1890000, arpu: 8920, ltv: 1250, retention: 85, color: '#10B981' },
    { name: 'Late Night', customers: 980000, arpu: 1890, ltv: 320, retention: 45, color: '#F59E0B' },
    { name: 'Weekend Warriors', customers: 1560000, arpu: 3450, ltv: 580, retention: 58, color: '#8B5CF6' },
  ],
  
  // CAC by channel
  cacByChannel: [
    { channel: 'Email', cac: 5.65, benchmark: 15, conversions: 245000 },
    { channel: 'Push Notifications', cac: 3.20, benchmark: 8, conversions: 520000 },
    { channel: 'Social Media', cac: 22.45, benchmark: 25, conversions: 89000 },
    { channel: 'Search (Paid)', cac: 28.90, benchmark: 30, conversions: 156000 },
    { channel: 'Display', cac: 35.20, benchmark: 35, conversions: 42000 },
    { channel: 'TV', cac: 42.80, benchmark: 45, conversions: 180000 },
    { channel: 'OOH', cac: 44.95, benchmark: 40, conversions: 28000 },
    { channel: 'Radio', cac: 38.50, benchmark: 35, conversions: 35000 },
  ],
  
  // Product attach rates
  attachRates: [
    { product: 'Breadsticks', rate: 34.2, revenue: 45200000, trend: 2.3 },
    { product: 'Wings', rate: 28.7, revenue: 62300000, trend: 5.1 },
    { product: '2-Liter Soda', rate: 42.1, revenue: 28900000, trend: -1.2 },
    { product: 'Desserts', rate: 18.4, revenue: 22100000, trend: 8.7 },
    { product: 'Dipping Sauces', rate: 52.3, revenue: 8900000, trend: 0.5 },
    { product: 'Salads', rate: 8.2, revenue: 12400000, trend: 12.4 },
  ],
  
  // Cohort retention (months 0-12)
  cohortRetention: generateCohortRetention(),
  
  // Campaign performance
  campaigns: [
    { name: 'Summer Sizzle', spend: 2400000, revenue: 18500000, roas: 7.7, status: 'active', type: 'seasonal' },
    { name: 'Family Bundle Push', spend: 890000, revenue: 5200000, roas: 5.8, status: 'active', type: 'product' },
    { name: 'Late Night Deals', spend: 450000, revenue: 1800000, roas: 4.0, status: 'active', type: 'daypart' },
    { name: 'App Download Promo', spend: 1200000, revenue: 8900000, roas: 7.4, status: 'completed', type: 'acquisition' },
    { name: 'Loyalty Double Points', spend: 320000, revenue: 2100000, roas: 6.6, status: 'active', type: 'retention' },
  ],
  
  // Marketing funnel
  funnel: [
    { stage: 'Impressions', value: 125000000, rate: 100 },
    { stage: 'Clicks', value: 8750000, rate: 7 },
    { stage: 'Site Visits', value: 6125000, rate: 70 },
    { stage: 'Add to Cart', value: 2450000, rate: 40 },
    { stage: 'Checkout Started', value: 1837500, rate: 75 },
    { stage: 'Orders Completed', value: 1470000, rate: 80 },
  ],
  
  // Real-time metrics (simulated)
  realtime: {
    ordersLastHour: 12847,
    revenueLastHour: 654793,
    avgDeliveryTime: 28,
    activeDeliveries: 3420,
  },
};

// Generate hourly heatmap data
function generateHourlyHeatmap() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = [];
  
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Simulate realistic pizza ordering patterns
      let base = 100;
      
      // Peak lunch (11-14)
      if (hour >= 11 && hour <= 14) base += 300;
      // Peak dinner (17-21)
      if (hour >= 17 && hour <= 21) base += 500;
      // Late night (21-24)
      if (hour >= 21 && hour <= 23) base += 200;
      // Weekend boost
      if (day >= 5) base *= 1.3;
      // Friday/Saturday night
      if ((day === 4 || day === 5) && hour >= 18) base *= 1.5;
      // Low overnight
      if (hour >= 0 && hour <= 9) base *= 0.2;
      
      // Add some randomness
      base *= (0.8 + Math.random() * 0.4);
      
      data.push({
        day: days[day],
        hour,
        value: Math.round(base),
        dayIndex: day,
      });
    }
  }
  return data;
}

// Generate cohort retention data
function generateCohortRetention() {
  const cohorts = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const data = [];
  
  cohorts.forEach((cohort, cohortIndex) => {
    const monthsAvailable = 6 - cohortIndex;
    const row = { cohort, months: [] };
    
    let retention = 100;
    for (let month = 0; month < monthsAvailable; month++) {
      // Decay curve with some randomness
      if (month > 0) {
        const decay = month === 1 ? 0.65 : 0.92;
        retention *= decay * (0.95 + Math.random() * 0.1);
      }
      row.months.push(Math.round(retention));
    }
    data.push(row);
  });
  
  return data;
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

const formatCurrency = (value, compact = false) => {
  if (compact) {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value, compact = false) => {
  if (compact) {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US').format(value);
};

const formatPercent = (value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

// ============================================================================
// ICON COMPONENTS
// ============================================================================

const Icons = {
  TrendUp: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  TrendDown: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
    </svg>
  ),
  Pizza: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
      <path d="M12 2v20M2 12h20"/>
      <circle cx="8" cy="8" r="1" fill="currentColor"/>
      <circle cx="16" cy="16" r="1" fill="currentColor"/>
      <circle cx="14" cy="8" r="1" fill="currentColor"/>
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Target: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  Zap: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Clock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  AlertCircle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Award: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
    </svg>
  ),
  Activity: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
};

// ============================================================================
// CREATIVE VISUALIZATION COMPONENTS
// ============================================================================

/**
 * Order Heatmap - Shows order volume by hour and day
 */
function OrderHeatmap({ data }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const maxValue = Math.max(...data.map(d => d.value));
  
  const getColor = (value) => {
    const intensity = value / maxValue;
    if (intensity < 0.2) return 'rgba(59, 130, 246, 0.1)';
    if (intensity < 0.4) return 'rgba(59, 130, 246, 0.3)';
    if (intensity < 0.6) return 'rgba(59, 130, 246, 0.5)';
    if (intensity < 0.8) return 'rgba(59, 130, 246, 0.7)';
    return 'rgba(59, 130, 246, 0.9)';
  };
  
  const getDataPoint = (day, hour) => {
    return data.find(d => d.day === day && d.hour === hour);
  };
  
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>
          <Icons.Clock />
          Order Patterns by Hour
        </h3>
        <span style={styles.cardSubtitle}>Orders per hour, last 30 days</span>
      </div>
      <div style={styles.heatmapContainer}>
        {/* Hour labels */}
        <div style={styles.heatmapHourLabels}>
          <div style={styles.heatmapCorner} />
          {hours.filter(h => h % 3 === 0).map(hour => (
            <div key={hour} style={styles.heatmapHourLabel}>
              {hour === 0 ? '12am' : hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
            </div>
          ))}
        </div>
        
        {/* Grid */}
        {days.map(day => (
          <div key={day} style={styles.heatmapRow}>
            <div style={styles.heatmapDayLabel}>{day}</div>
            {hours.map(hour => {
              const point = getDataPoint(day, hour);
              return (
                <div
                  key={hour}
                  style={{
                    ...styles.heatmapCell,
                    backgroundColor: getColor(point?.value || 0),
                  }}
                  title={`${day} ${hour}:00 - ${formatNumber(point?.value || 0)} orders`}
                />
              );
            })}
          </div>
        ))}
        
        {/* Legend */}
        <div style={styles.heatmapLegend}>
          <span style={styles.heatmapLegendLabel}>Low</span>
          <div style={styles.heatmapLegendGradient} />
          <span style={styles.heatmapLegendLabel}>High</span>
        </div>
        
        {/* Peak times callout */}
        <div style={styles.peakTimesCallout}>
          <div style={styles.peakTime}>
            <span style={styles.peakTimeLabel}>🌙 Peak Dinner</span>
            <span style={styles.peakTimeValue}>6-9 PM (42% of orders)</span>
          </div>
          <div style={styles.peakTime}>
            <span style={styles.peakTimeLabel}>🌅 Peak Lunch</span>
            <span style={styles.peakTimeValue}>11 AM-1 PM (18% of orders)</span>
          </div>
          <div style={styles.peakTime}>
            <span style={styles.peakTimeLabel}>🎉 Best Day</span>
            <span style={styles.peakTimeValue}>Saturday (+35% vs avg)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CAC Efficiency Gauge - Shows CAC vs benchmark with visual gauge
 */
function CACEfficiencyGauge({ data }) {
  const sortedData = [...data].sort((a, b) => a.cac - b.cac);
  
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>
          <Icons.Target />
          CAC by Channel
        </h3>
        <span style={styles.cardSubtitle}>Customer Acquisition Cost vs Industry Benchmark</span>
      </div>
      <div style={styles.cacGrid}>
        {sortedData.map((item, index) => {
          const efficiency = ((item.benchmark - item.cac) / item.benchmark) * 100;
          const isEfficient = item.cac <= item.benchmark;
          const barWidth = Math.min((item.cac / 50) * 100, 100);
          const benchmarkPos = Math.min((item.benchmark / 50) * 100, 100);
          
          return (
            <div key={item.channel} style={styles.cacRow}>
              <div style={styles.cacChannelInfo}>
                <span style={styles.cacChannelName}>{item.channel}</span>
                <div style={styles.cacValues}>
                  <span style={{
                    ...styles.cacValue,
                    color: isEfficient ? '#10B981' : '#EF4444',
                  }}>
                    ${item.cac.toFixed(2)}
                  </span>
                  <span style={styles.cacBenchmark}>
                    Benchmark: ${item.benchmark}
                  </span>
                </div>
              </div>
              <div style={styles.cacBarContainer}>
                <div style={styles.cacBarTrack}>
                  <div
                    style={{
                      ...styles.cacBar,
                      width: `${barWidth}%`,
                      backgroundColor: isEfficient ? '#10B981' : '#EF4444',
                    }}
                  />
                  <div
                    style={{
                      ...styles.cacBenchmarkLine,
                      left: `${benchmarkPos}%`,
                    }}
                  />
                </div>
                <span style={{
                  ...styles.cacEfficiency,
                  color: isEfficient ? '#10B981' : '#EF4444',
                }}>
                  {isEfficient ? '✓' : '!'} {Math.abs(efficiency).toFixed(0)}%
                  {isEfficient ? ' under' : ' over'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Segment Comparison Cards - Visual segment comparison
 */
function SegmentComparison({ segments }) {
  const maxArpu = Math.max(...segments.map(s => s.arpu));
  const maxLtv = Math.max(...segments.map(s => s.ltv));
  
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>
          <Icons.Users />
          Customer Segments
        </h3>
        <span style={styles.cardSubtitle}>Performance by customer type</span>
      </div>
      <div style={styles.segmentGrid}>
        {segments.map((segment, index) => (
          <div
            key={segment.name}
            style={{
              ...styles.segmentCard,
              borderLeftColor: segment.color,
            }}
          >
            <div style={styles.segmentHeader}>
              <span style={styles.segmentName}>{segment.name}</span>
              <span style={{
                ...styles.segmentBadge,
                backgroundColor: `${segment.color}20`,
                color: segment.color,
              }}>
                {formatNumber(segment.customers, true)} customers
              </span>
            </div>
            
            <div style={styles.segmentMetrics}>
              <div style={styles.segmentMetric}>
                <span style={styles.segmentMetricLabel}>ARPU</span>
                <span style={styles.segmentMetricValue}>
                  {formatCurrency(segment.arpu)}
                </span>
                <div style={styles.segmentBar}>
                  <div
                    style={{
                      ...styles.segmentBarFill,
                      width: `${(segment.arpu / maxArpu) * 100}%`,
                      backgroundColor: segment.color,
                    }}
                  />
                </div>
              </div>
              
              <div style={styles.segmentMetric}>
                <span style={styles.segmentMetricLabel}>LTV</span>
                <span style={styles.segmentMetricValue}>
                  {formatCurrency(segment.ltv)}
                </span>
                <div style={styles.segmentBar}>
                  <div
                    style={{
                      ...styles.segmentBarFill,
                      width: `${(segment.ltv / maxLtv) * 100}%`,
                      backgroundColor: segment.color,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
              
              <div style={styles.segmentMetric}>
                <span style={styles.segmentMetricLabel}>Retention</span>
                <span style={styles.segmentMetricValue}>{segment.retention}%</span>
                <div style={styles.retentionRing}>
                  <svg width="40" height="40" viewBox="0 0 40 40">
                    <circle
                      cx="20" cy="20" r="16"
                      fill="none"
                      stroke="#2A2A30"
                      strokeWidth="4"
                    />
                    <circle
                      cx="20" cy="20" r="16"
                      fill="none"
                      stroke={segment.color}
                      strokeWidth="4"
                      strokeDasharray={`${segment.retention} ${100 - segment.retention}`}
                      strokeDashoffset="25"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Attach Rate Visualization - Product cross-sell performance
 */
function AttachRateVisual({ data }) {
  const maxRate = Math.max(...data.map(d => d.rate));
  
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>
          <Icons.Pizza />
          Product Attach Rates
        </h3>
        <span style={styles.cardSubtitle}>Cross-sell performance with pizza orders</span>
      </div>
      <div style={styles.attachGrid}>
        {data.map((item, index) => {
          const isPositive = item.trend >= 0;
          
          return (
            <div key={item.product} style={styles.attachItem}>
              <div style={styles.attachVisual}>
                {/* Pizza slice shape showing attach rate */}
                <svg width="80" height="80" viewBox="0 0 80 80">
                  {/* Background ring */}
                  <circle
                    cx="40" cy="40" r="35"
                    fill="none"
                    stroke="#2A2A30"
                    strokeWidth="8"
                  />
                  {/* Fill ring */}
                  <circle
                    cx="40" cy="40" r="35"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="8"
                    strokeDasharray={`${(item.rate / 100) * 220} 220`}
                    strokeDashoffset="55"
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s ease' }}
                  />
                  <text
                    x="40" y="40"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#E8E8EA"
                    fontSize="16"
                    fontWeight="600"
                  >
                    {item.rate}%
                  </text>
                </svg>
              </div>
              <div style={styles.attachInfo}>
                <span style={styles.attachProduct}>{item.product}</span>
                <span style={styles.attachRevenue}>
                  {formatCurrency(item.revenue, true)} revenue
                </span>
                <span style={{
                  ...styles.attachTrend,
                  color: isPositive ? '#10B981' : '#EF4444',
                }}>
                  {isPositive ? <Icons.TrendUp /> : <Icons.TrendDown />}
                  {formatPercent(item.trend)} vs last period
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Cohort Retention Matrix
 */
function CohortRetentionMatrix({ data }) {
  const getColor = (value) => {
    if (value >= 80) return '#10B981';
    if (value >= 60) return '#3B82F6';
    if (value >= 40) return '#F59E0B';
    if (value >= 20) return '#EF4444';
    return '#6B7280';
  };
  
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>
          <Icons.Activity />
          Cohort Retention
        </h3>
        <span style={styles.cardSubtitle}>Customer retention by signup month</span>
      </div>
      <div style={styles.cohortContainer}>
        {/* Header row */}
        <div style={styles.cohortHeaderRow}>
          <div style={styles.cohortCohortLabel}>Cohort</div>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={styles.cohortMonthLabel}>
              {i === 0 ? 'M0' : `M${i}`}
            </div>
          ))}
        </div>
        
        {/* Data rows */}
        {data.map((row, rowIndex) => (
          <div key={row.cohort} style={styles.cohortRow}>
            <div style={styles.cohortCohortLabel}>{row.cohort} '25</div>
            {Array.from({ length: 6 }, (_, i) => {
              const value = row.months[i];
              const hasValue = value !== undefined;
              
              return (
                <div
                  key={i}
                  style={{
                    ...styles.cohortCell,
                    backgroundColor: hasValue ? `${getColor(value)}30` : 'transparent',
                    color: hasValue ? getColor(value) : '#4A4A52',
                  }}
                >
                  {hasValue ? `${value}%` : '—'}
                </div>
              );
            })}
          </div>
        ))}
        
        {/* Legend */}
        <div style={styles.cohortLegend}>
          <span style={{ color: '#10B981' }}>● 80%+</span>
          <span style={{ color: '#3B82F6' }}>● 60-79%</span>
          <span style={{ color: '#F59E0B' }}>● 40-59%</span>
          <span style={{ color: '#EF4444' }}>● &lt;40%</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Marketing Funnel Visualization
 */
function MarketingFunnel({ data }) {
  const maxValue = data[0].value;
  
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>
          <Icons.Target />
          Marketing Funnel
        </h3>
        <span style={styles.cardSubtitle}>Conversion through the customer journey</span>
      </div>
      <div style={styles.funnelContainer}>
        {data.map((stage, index) => {
          const widthPercent = 30 + ((data.length - index) / data.length) * 70;
          const nextStage = data[index + 1];
          const dropOff = nextStage 
            ? ((stage.value - nextStage.value) / stage.value * 100).toFixed(1)
            : null;
          
          return (
            <React.Fragment key={stage.stage}>
              <div
                style={{
                  ...styles.funnelStage,
                  width: `${widthPercent}%`,
                }}
              >
                <div style={styles.funnelStageInner}>
                  <span style={styles.funnelStageName}>{stage.stage}</span>
                  <span style={styles.funnelStageValue}>
                    {formatNumber(stage.value, true)}
                  </span>
                </div>
                {index > 0 && (
                  <span style={styles.funnelRate}>
                    {stage.rate}% conv.
                  </span>
                )}
              </div>
              {dropOff && (
                <div style={styles.funnelDropOff}>
                  <span style={styles.funnelDropOffLine} />
                  <span style={styles.funnelDropOffValue}>-{dropOff}%</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
        
        {/* Final conversion summary */}
        <div style={styles.funnelSummary}>
          <div style={styles.funnelSummaryItem}>
            <span style={styles.funnelSummaryLabel}>Overall Conversion</span>
            <span style={styles.funnelSummaryValue}>
              {((data[data.length - 1].value / data[0].value) * 100).toFixed(2)}%
            </span>
          </div>
          <div style={styles.funnelSummaryItem}>
            <span style={styles.funnelSummaryLabel}>Total Orders</span>
            <span style={styles.funnelSummaryValue}>
              {formatNumber(data[data.length - 1].value, true)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Campaign Performance Scorecards
 */
function CampaignScorecard({ campaigns }) {
  const getStatusColor = (status) => {
    return status === 'active' ? '#10B981' : '#6B7280';
  };
  
  const getTypeIcon = (type) => {
    const icons = {
      seasonal: '☀️',
      product: '🍕',
      daypart: '🌙',
      acquisition: '📱',
      retention: '💎',
    };
    return icons[type] || '📊';
  };
  
  const getRoasColor = (roas) => {
    if (roas >= 7) return '#10B981';
    if (roas >= 5) return '#3B82F6';
    if (roas >= 3) return '#F59E0B';
    return '#EF4444';
  };
  
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>
          <Icons.Zap />
          Campaign Performance
        </h3>
        <span style={styles.cardSubtitle}>Active and recent campaigns</span>
      </div>
      <div style={styles.campaignGrid}>
        {campaigns.map((campaign) => (
          <div key={campaign.name} style={styles.campaignCard}>
            <div style={styles.campaignHeader}>
              <span style={styles.campaignIcon}>{getTypeIcon(campaign.type)}</span>
              <span style={styles.campaignName}>{campaign.name}</span>
              <span style={{
                ...styles.campaignStatus,
                backgroundColor: `${getStatusColor(campaign.status)}20`,
                color: getStatusColor(campaign.status),
              }}>
                {campaign.status}
              </span>
            </div>
            
            <div style={styles.campaignMetrics}>
              <div style={styles.campaignMetric}>
                <span style={styles.campaignMetricLabel}>Spend</span>
                <span style={styles.campaignMetricValue}>
                  {formatCurrency(campaign.spend, true)}
                </span>
              </div>
              <div style={styles.campaignMetric}>
                <span style={styles.campaignMetricLabel}>Revenue</span>
                <span style={styles.campaignMetricValue}>
                  {formatCurrency(campaign.revenue, true)}
                </span>
              </div>
              <div style={styles.campaignMetric}>
                <span style={styles.campaignMetricLabel}>ROAS</span>
                <span style={{
                  ...styles.campaignMetricValue,
                  color: getRoasColor(campaign.roas),
                }}>
                  {campaign.roas.toFixed(1)}x
                </span>
              </div>
            </div>
            
            {/* ROAS bar */}
            <div style={styles.campaignRoasBar}>
              <div
                style={{
                  ...styles.campaignRoasBarFill,
                  width: `${Math.min((campaign.roas / 10) * 100, 100)}%`,
                  backgroundColor: getRoasColor(campaign.roas),
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Real-time Pulse Widget
 */
function RealtimePulse({ data }) {
  const [pulse, setPulse] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div style={styles.realtimeWidget}>
      <div style={styles.realtimeHeader}>
        <div style={{
          ...styles.realtimeDot,
          ...(pulse ? styles.realtimeDotPulse : {}),
        }} />
        <span style={styles.realtimeLabel}>Live</span>
      </div>
      <div style={styles.realtimeMetrics}>
        <div style={styles.realtimeMetric}>
          <span style={styles.realtimeValue}>{formatNumber(data.ordersLastHour)}</span>
          <span style={styles.realtimeMetricLabel}>Orders/hr</span>
        </div>
        <div style={styles.realtimeDivider} />
        <div style={styles.realtimeMetric}>
          <span style={styles.realtimeValue}>{formatCurrency(data.revenueLastHour, true)}</span>
          <span style={styles.realtimeMetricLabel}>Revenue/hr</span>
        </div>
        <div style={styles.realtimeDivider} />
        <div style={styles.realtimeMetric}>
          <span style={styles.realtimeValue}>{data.avgDeliveryTime}m</span>
          <span style={styles.realtimeMetricLabel}>Avg Delivery</span>
        </div>
        <div style={styles.realtimeDivider} />
        <div style={styles.realtimeMetric}>
          <span style={styles.realtimeValue}>{formatNumber(data.activeDeliveries)}</span>
          <span style={styles.realtimeMetricLabel}>Active Deliveries</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Channel Mix Donut
 */
function ChannelMixDonut({ channels }) {
  const total = channels.reduce((sum, c) => sum + c.revenue, 0);
  let currentAngle = 0;
  
  const segments = channels.map(channel => {
    const percentage = (channel.revenue / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    
    return {
      ...channel,
      percentage,
      startAngle,
      endAngle: currentAngle,
    };
  });
  
  const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    
    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };
  
  const polarToCartesian = (cx, cy, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: cx + (radius * Math.cos(angleInRadians)),
      y: cy + (radius * Math.sin(angleInRadians))
    };
  };
  
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>Channel Mix</h3>
        <span style={styles.cardSubtitle}>Revenue distribution by channel</span>
      </div>
      <div style={styles.donutContainer}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          {segments.map((segment, index) => (
            <path
              key={segment.name}
              d={describeArc(100, 100, 70, segment.startAngle, segment.endAngle - 1)}
              fill="none"
              stroke={segment.color}
              strokeWidth="30"
              strokeLinecap="round"
            />
          ))}
          <text
            x="100" y="92"
            textAnchor="middle"
            fill="#6B6B76"
            fontSize="12"
          >
            Total Revenue
          </text>
          <text
            x="100" y="115"
            textAnchor="middle"
            fill="#E8E8EA"
            fontSize="20"
            fontWeight="600"
          >
            {formatCurrency(total, true)}
          </text>
        </svg>
        
        <div style={styles.donutLegend}>
          {segments.map(segment => (
            <div key={segment.name} style={styles.donutLegendItem}>
              <div style={{
                ...styles.donutLegendDot,
                backgroundColor: segment.color,
              }} />
              <span style={styles.donutLegendName}>{segment.name}</span>
              <span style={styles.donutLegendValue}>
                {segment.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DASHBOARD COMPONENT
// ============================================================================

export default function MarketingDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('6months');
  
  const data = mockData;
  
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'acquisition', label: 'Acquisition' },
    { id: 'segments', label: 'Customers' },
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'products', label: 'Products' },
  ];
  
  return (
    <div style={styles.dashboard}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>🍕</span>
          <div>
            <h1 style={styles.title}>Marketing Analytics</h1>
            <span style={styles.subtitle}>Performance Insights & Predictive Analytics</span>
          </div>
        </div>
        
        <div style={styles.headerRight}>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={styles.select}
          >
            <option value="30days">Last 30 days</option>
            <option value="3months">Last 3 months</option>
            <option value="6months">Last 6 months</option>
            <option value="12months">Last 12 months</option>
          </select>
          
          <button style={styles.exportButton}>
            Export Report
          </button>
        </div>
      </header>
      
      {/* Real-time Pulse */}
      <RealtimePulse data={data.realtime} />
      
      {/* Tab Navigation */}
      <nav style={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      
      {/* Content */}
      <main style={styles.content}>
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards */}
            <div style={styles.kpiGrid}>
              <KPICard
                label="Total Revenue"
                value={formatCurrency(data.kpis.totalRevenue, true)}
                change={data.kpis.revenueChange}
                color="#10B981"
              />
              <KPICard
                label="Total Orders"
                value={formatNumber(data.kpis.totalOrders, true)}
                change={data.kpis.ordersChange}
                color="#3B82F6"
              />
              <KPICard
                label="Avg Order Value"
                value={formatCurrency(data.kpis.avgOrderValue)}
                change={data.kpis.aovChange}
                color="#F59E0B"
              />
              <KPICard
                label="Customer Satisfaction"
                value={`${data.kpis.customerSatisfaction}/5`}
                change={data.kpis.satisfactionChange}
                color="#EC4899"
              />
            </div>
            
            {/* Row 1 */}
            <div style={styles.row}>
              <div style={styles.col8}>
                <OrderHeatmap data={data.hourlyHeatmap} />
              </div>
              <div style={styles.col4}>
                <ChannelMixDonut channels={data.channels} />
              </div>
            </div>
            
            {/* Row 2 */}
            <div style={styles.row}>
              <MarketingFunnel data={data.funnel} />
            </div>
          </>
        )}
        
        {activeTab === 'acquisition' && (
          <>
            <div style={styles.row}>
              <CACEfficiencyGauge data={data.cacByChannel} />
            </div>
            <div style={styles.row}>
              <CohortRetentionMatrix data={data.cohortRetention} />
            </div>
          </>
        )}
        
        {activeTab === 'segments' && (
          <>
            <div style={styles.row}>
              <SegmentComparison segments={data.segments} />
            </div>
          </>
        )}
        
        {activeTab === 'campaigns' && (
          <>
            <div style={styles.row}>
              <CampaignScorecard campaigns={data.campaigns} />
            </div>
          </>
        )}
        
        {activeTab === 'products' && (
          <>
            <div style={styles.row}>
              <AttachRateVisual data={data.attachRates} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/**
 * KPI Card Component
 */
function KPICard({ label, value, change, color }) {
  const isPositive = change >= 0;
  
  return (
    <div style={styles.kpiCard}>
      <span style={styles.kpiLabel}>{label}</span>
      <span style={{ ...styles.kpiValue, color }}>{value}</span>
      <div style={styles.kpiChange}>
        <span style={{
          color: isPositive ? '#10B981' : '#EF4444',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          {isPositive ? <Icons.TrendUp /> : <Icons.TrendDown />}
          {formatPercent(change)}
        </span>
        <span style={styles.kpiPeriod}>vs last period</span>
      </div>
      {/* Sparkline placeholder */}
      <div style={styles.kpiSparkline}>
        <svg width="100%" height="40" viewBox="0 0 120 40">
          <path
            d="M0,30 Q20,25 30,20 T60,15 T90,18 T120,10"
            fill="none"
            stroke={color}
            strokeWidth="2"
            opacity="0.5"
          />
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  dashboard: {
    minHeight: '100vh',
    backgroundColor: '#0D0D0F',
    color: '#E8E8EA',
    fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
    padding: '20px 24px',
  },
  
  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  logo: {
    fontSize: '32px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B6B76',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  select: {
    padding: '10px 16px',
    backgroundColor: '#1E1E24',
    border: '1px solid #2A2A30',
    borderRadius: '8px',
    color: '#E8E8EA',
    fontSize: '14px',
    cursor: 'pointer',
  },
  exportButton: {
    padding: '10px 20px',
    backgroundColor: '#3B82F6',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  
  // Tabs
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    padding: '4px',
    backgroundColor: '#131316',
    borderRadius: '10px',
    width: 'fit-content',
  },
  tab: {
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#6B6B76',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tabActive: {
    backgroundColor: '#2A2A30',
    color: '#E8E8EA',
  },
  
  // Content
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  row: {
    display: 'flex',
    gap: '20px',
  },
  col4: {
    flex: '0 0 33.33%',
    maxWidth: '33.33%',
  },
  col8: {
    flex: '0 0 66.66%',
    maxWidth: '66.66%',
  },
  
  // Card
  card: {
    backgroundColor: '#131316',
    border: '1px solid #2A2A30',
    borderRadius: '12px',
    padding: '20px',
    flex: 1,
  },
  cardHeader: {
    marginBottom: '20px',
  },
  cardTitle: {
    margin: '0 0 4px',
    fontSize: '16px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardSubtitle: {
    fontSize: '13px',
    color: '#6B6B76',
  },
  
  // KPI Grid
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginBottom: '4px',
  },
  kpiCard: {
    backgroundColor: '#131316',
    border: '1px solid #2A2A30',
    borderRadius: '12px',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  kpiLabel: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#6B6B76',
  },
  kpiValue: {
    display: 'block',
    fontSize: '32px',
    fontWeight: 600,
    marginTop: '8px',
  },
  kpiChange: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    fontSize: '13px',
  },
  kpiPeriod: {
    color: '#6B6B76',
  },
  kpiSparkline: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    opacity: 0.3,
  },
  
  // Heatmap
  heatmapContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  heatmapHourLabels: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px',
  },
  heatmapCorner: {
    width: '40px',
    flexShrink: 0,
  },
  heatmapHourLabel: {
    flex: 1,
    fontSize: '10px',
    color: '#6B6B76',
    textAlign: 'center',
  },
  heatmapRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  heatmapDayLabel: {
    width: '40px',
    fontSize: '11px',
    color: '#6B6B76',
    flexShrink: 0,
  },
  heatmapCell: {
    flex: 1,
    height: '24px',
    borderRadius: '3px',
    cursor: 'pointer',
    transition: 'transform 0.1s ease',
  },
  heatmapLegend: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '16px',
    fontSize: '11px',
    color: '#6B6B76',
  },
  heatmapLegendGradient: {
    width: '100px',
    height: '8px',
    background: 'linear-gradient(to right, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.9))',
    borderRadius: '4px',
  },
  heatmapLegendLabel: {
    fontSize: '10px',
  },
  peakTimesCallout: {
    display: 'flex',
    gap: '24px',
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #2A2A30',
  },
  peakTime: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  peakTimeLabel: {
    fontSize: '12px',
    color: '#6B6B76',
  },
  peakTimeValue: {
    fontSize: '14px',
    fontWeight: 500,
  },
  
  // CAC Grid
  cacGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  cacRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  cacChannelInfo: {
    width: '180px',
    flexShrink: 0,
  },
  cacChannelName: {
    display: 'block',
    fontWeight: 500,
    marginBottom: '2px',
  },
  cacValues: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cacValue: {
    fontWeight: 600,
  },
  cacBenchmark: {
    fontSize: '11px',
    color: '#6B6B76',
  },
  cacBarContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  cacBarTrack: {
    flex: 1,
    height: '8px',
    backgroundColor: '#1E1E24',
    borderRadius: '4px',
    position: 'relative',
  },
  cacBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  cacBenchmarkLine: {
    position: 'absolute',
    top: '-4px',
    bottom: '-4px',
    width: '2px',
    backgroundColor: '#6B6B76',
    borderRadius: '1px',
  },
  cacEfficiency: {
    fontSize: '12px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  
  // Segments
  segmentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  segmentCard: {
    backgroundColor: '#1A1A20',
    borderRadius: '10px',
    padding: '16px',
    borderLeft: '4px solid',
  },
  segmentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  segmentName: {
    fontWeight: 600,
    fontSize: '15px',
  },
  segmentBadge: {
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '12px',
  },
  segmentMetrics: {
    display: 'flex',
    gap: '16px',
  },
  segmentMetric: {
    flex: 1,
  },
  segmentMetricLabel: {
    display: 'block',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#6B6B76',
    marginBottom: '4px',
  },
  segmentMetricValue: {
    display: 'block',
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  segmentBar: {
    height: '4px',
    backgroundColor: '#2A2A30',
    borderRadius: '2px',
  },
  segmentBarFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  retentionRing: {
    display: 'flex',
    justifyContent: 'center',
  },
  
  // Attach Rates
  attachGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  attachItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  attachVisual: {
    flexShrink: 0,
  },
  attachInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  attachProduct: {
    fontWeight: 600,
    fontSize: '15px',
  },
  attachRevenue: {
    fontSize: '13px',
    color: '#6B6B76',
  },
  attachTrend: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
  },
  
  // Cohort
  cohortContainer: {
    overflowX: 'auto',
  },
  cohortHeaderRow: {
    display: 'flex',
    marginBottom: '8px',
  },
  cohortRow: {
    display: 'flex',
    marginBottom: '4px',
  },
  cohortCohortLabel: {
    width: '80px',
    flexShrink: 0,
    fontSize: '13px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
  },
  cohortMonthLabel: {
    width: '60px',
    flexShrink: 0,
    fontSize: '11px',
    color: '#6B6B76',
    textAlign: 'center',
  },
  cohortCell: {
    width: '60px',
    height: '36px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  cohortLegend: {
    display: 'flex',
    gap: '16px',
    marginTop: '16px',
    fontSize: '11px',
    color: '#6B6B76',
  },
  
  // Funnel
  funnelContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '20px 0',
  },
  funnelStage: {
    backgroundColor: '#1E1E24',
    borderRadius: '8px',
    padding: '12px 20px',
    position: 'relative',
  },
  funnelStageInner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  funnelStageName: {
    fontWeight: 500,
  },
  funnelStageValue: {
    fontWeight: 600,
    color: '#3B82F6',
  },
  funnelRate: {
    position: 'absolute',
    right: '-80px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '12px',
    color: '#10B981',
  },
  funnelDropOff: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '20px',
  },
  funnelDropOffLine: {
    width: '1px',
    height: '100%',
    backgroundColor: '#2A2A30',
  },
  funnelDropOffValue: {
    fontSize: '11px',
    color: '#EF4444',
  },
  funnelSummary: {
    display: 'flex',
    gap: '40px',
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #2A2A30',
  },
  funnelSummaryItem: {
    textAlign: 'center',
  },
  funnelSummaryLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#6B6B76',
    marginBottom: '4px',
  },
  funnelSummaryValue: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#10B981',
  },
  
  // Campaign
  campaignGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  campaignCard: {
    backgroundColor: '#1A1A20',
    borderRadius: '10px',
    padding: '16px',
  },
  campaignHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  campaignIcon: {
    fontSize: '18px',
  },
  campaignName: {
    flex: 1,
    fontWeight: 500,
  },
  campaignStatus: {
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '12px',
    textTransform: 'capitalize',
  },
  campaignMetrics: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
  },
  campaignMetric: {
    flex: 1,
  },
  campaignMetricLabel: {
    display: 'block',
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#6B6B76',
    marginBottom: '4px',
  },
  campaignMetricValue: {
    fontWeight: 600,
  },
  campaignRoasBar: {
    height: '4px',
    backgroundColor: '#2A2A30',
    borderRadius: '2px',
  },
  campaignRoasBarFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  
  // Realtime Widget
  realtimeWidget: {
    backgroundColor: '#131316',
    border: '1px solid #2A2A30',
    borderRadius: '10px',
    padding: '12px 20px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  realtimeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  realtimeDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#EF4444',
    transition: 'transform 0.2s ease',
  },
  realtimeDotPulse: {
    transform: 'scale(1.3)',
    boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
  },
  realtimeLabel: {
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#EF4444',
  },
  realtimeMetrics: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    gap: '24px',
  },
  realtimeMetric: {
    display: 'flex',
    flexDirection: 'column',
  },
  realtimeValue: {
    fontSize: '18px',
    fontWeight: 600,
  },
  realtimeMetricLabel: {
    fontSize: '11px',
    color: '#6B6B76',
  },
  realtimeDivider: {
    width: '1px',
    height: '30px',
    backgroundColor: '#2A2A30',
  },
  
  // Donut
  donutContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  donutLegend: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  donutLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  donutLegendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  donutLegendName: {
    flex: 1,
    fontSize: '13px',
  },
  donutLegendValue: {
    fontSize: '13px',
    fontWeight: 600,
  },
};

// Add animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.3); }
  }
`;
document.head.appendChild(styleSheet);
