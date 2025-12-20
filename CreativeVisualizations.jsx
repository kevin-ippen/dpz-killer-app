import React, { useState, useEffect, useRef } from 'react';

// ============================================================================
// ADDITIONAL CREATIVE VISUALIZATIONS FOR DOMINO'S MARKETING DASHBOARD
// ============================================================================

// ============================================================================
// 1. PIZZA SLICE COMPARISON - Compare metrics across segments
// ============================================================================

export function PizzaSliceComparison({ data, metric, title }) {
  // Each slice represents a segment, size represents metric value
  const total = data.reduce((sum, d) => sum + d[metric], 0);
  const maxValue = Math.max(...data.map(d => d[metric]));
  
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>{title}</h3>
      <div style={styles.pizzaContainer}>
        <svg viewBox="0 0 300 300" style={styles.pizzaSvg}>
          {/* Pizza base */}
          <circle cx="150" cy="150" r="140" fill="#2A2A30" />
          <circle cx="150" cy="150" r="130" fill="#1E1E24" />
          
          {/* Slices */}
          {data.map((item, index) => {
            const angle = (index / data.length) * 360;
            const nextAngle = ((index + 1) / data.length) * 360;
            const midAngle = (angle + nextAngle) / 2;
            
            // Size based on metric value
            const radius = 40 + (item[metric] / maxValue) * 80;
            
            // Calculate slice path
            const startRad = (angle - 90) * (Math.PI / 180);
            const endRad = (nextAngle - 90) * (Math.PI / 180);
            const midRad = (midAngle - 90) * (Math.PI / 180);
            
            const x1 = 150 + Math.cos(startRad) * radius;
            const y1 = 150 + Math.sin(startRad) * radius;
            const x2 = 150 + Math.cos(endRad) * radius;
            const y2 = 150 + Math.sin(endRad) * radius;
            
            const labelX = 150 + Math.cos(midRad) * (radius + 30);
            const labelY = 150 + Math.sin(midRad) * (radius + 30);
            
            const largeArc = nextAngle - angle > 180 ? 1 : 0;
            
            return (
              <g key={item.name}>
                <path
                  d={`M 150 150 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={item.color || `hsl(${index * 60}, 70%, 50%)`}
                  opacity="0.8"
                  stroke="#0D0D0F"
                  strokeWidth="2"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fill="#E8E8EA"
                  fontSize="11"
                  fontWeight="500"
                >
                  {item.name}
                </text>
              </g>
            );
          })}
          
          {/* Center label */}
          <circle cx="150" cy="150" r="35" fill="#131316" />
          <text x="150" y="145" textAnchor="middle" fill="#6B6B76" fontSize="10">
            Total
          </text>
          <text x="150" y="160" textAnchor="middle" fill="#E8E8EA" fontSize="14" fontWeight="600">
            {formatCompact(total)}
          </text>
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// 2. DELIVERY TRACKER VISUAL - Real-time delivery status
// ============================================================================

export function DeliveryTracker({ stats }) {
  const stages = [
    { id: 'preparing', label: 'Preparing', icon: '👨‍🍳', count: stats.preparing },
    { id: 'oven', label: 'In Oven', icon: '🔥', count: stats.inOven },
    { id: 'quality', label: 'Quality Check', icon: '✓', count: stats.qualityCheck },
    { id: 'delivery', label: 'Out for Delivery', icon: '🛵', count: stats.outForDelivery },
  ];
  
  const total = stages.reduce((sum, s) => sum + s.count, 0);
  
  return (
    <div style={styles.card}>
      <div style={styles.trackerHeader}>
        <h3 style={styles.cardTitle}>🍕 Live Order Pipeline</h3>
        <span style={styles.trackerTotal}>{formatNumber(total)} active orders</span>
      </div>
      <div style={styles.trackerPipeline}>
        {stages.map((stage, index) => (
          <React.Fragment key={stage.id}>
            <div style={styles.trackerStage}>
              <div style={styles.trackerStageIcon}>{stage.icon}</div>
              <div style={styles.trackerStageInfo}>
                <span style={styles.trackerStageCount}>{formatNumber(stage.count)}</span>
                <span style={styles.trackerStageLabel}>{stage.label}</span>
              </div>
              <div style={styles.trackerStageBar}>
                <div
                  style={{
                    ...styles.trackerStageBarFill,
                    width: `${(stage.count / Math.max(...stages.map(s => s.count))) * 100}%`,
                  }}
                />
              </div>
            </div>
            {index < stages.length - 1 && (
              <div style={styles.trackerArrow}>→</div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Animated dots representing orders */}
      <div style={styles.trackerAnimation}>
        <div style={styles.animatedDots}>
          {Array.from({ length: 20 }, (_, i) => (
            <span
              key={i}
              style={{
                ...styles.orderDot,
                animationDelay: `${i * 0.1}s`,
                left: `${(i / 20) * 100}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. PROMO CODE EFFECTIVENESS MATRIX
// ============================================================================

export function PromoEffectivenessMatrix({ data }) {
  // data: [{ code, uses, revenue, avgDiscount, redemptionRate, roi }]
  
  const maxUses = Math.max(...data.map(d => d.uses));
  const maxRoi = Math.max(...data.map(d => d.roi));
  
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>🎟️ Promo Code Performance</h3>
      <div style={styles.promoGrid}>
        {data.map((promo) => {
          const roiColor = promo.roi >= 5 ? '#10B981' : promo.roi >= 3 ? '#F59E0B' : '#EF4444';
          
          return (
            <div key={promo.code} style={styles.promoCard}>
              <div style={styles.promoHeader}>
                <code style={styles.promoCode}>{promo.code}</code>
                <span style={{
                  ...styles.promoRoi,
                  color: roiColor,
                  backgroundColor: `${roiColor}20`,
                }}>
                  {promo.roi.toFixed(1)}x ROI
                </span>
              </div>
              
              <div style={styles.promoMetrics}>
                <div style={styles.promoMetric}>
                  <span style={styles.promoMetricValue}>{formatNumber(promo.uses)}</span>
                  <span style={styles.promoMetricLabel}>Uses</span>
                </div>
                <div style={styles.promoMetric}>
                  <span style={styles.promoMetricValue}>{formatCurrency(promo.revenue, true)}</span>
                  <span style={styles.promoMetricLabel}>Revenue</span>
                </div>
                <div style={styles.promoMetric}>
                  <span style={styles.promoMetricValue}>{promo.avgDiscount}%</span>
                  <span style={styles.promoMetricLabel}>Avg Discount</span>
                </div>
              </div>
              
              {/* Redemption rate bar */}
              <div style={styles.promoRedemption}>
                <span style={styles.promoRedemptionLabel}>
                  Redemption Rate: {promo.redemptionRate}%
                </span>
                <div style={styles.promoRedemptionBar}>
                  <div
                    style={{
                      ...styles.promoRedemptionFill,
                      width: `${promo.redemptionRate}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// 4. CUSTOMER JOURNEY SANKEY
// ============================================================================

export function CustomerJourneySankey({ data }) {
  // Simplified Sankey-style visualization
  const sources = ['Search', 'Social', 'Email', 'Direct', 'Referral'];
  const actions = ['Browse Menu', 'Add to Cart', 'Checkout'];
  const outcomes = ['Completed', 'Abandoned'];
  
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>🗺️ Customer Journey Flow</h3>
      <div style={styles.sankeyContainer}>
        {/* Source nodes */}
        <div style={styles.sankeyColumn}>
          <span style={styles.sankeyColumnLabel}>Traffic Source</span>
          {data.sources.map((source, i) => (
            <div
              key={source.name}
              style={{
                ...styles.sankeyNode,
                height: `${(source.value / data.totalSessions) * 200}px`,
                backgroundColor: source.color,
              }}
            >
              <span style={styles.sankeyNodeLabel}>{source.name}</span>
              <span style={styles.sankeyNodeValue}>{formatNumber(source.value, true)}</span>
            </div>
          ))}
        </div>
        
        {/* Flow lines (simplified) */}
        <div style={styles.sankeyFlows}>
          <svg width="100%" height="100%" style={styles.sankeySvg}>
            {/* Render flow paths here */}
          </svg>
        </div>
        
        {/* Action nodes */}
        <div style={styles.sankeyColumn}>
          <span style={styles.sankeyColumnLabel}>Action</span>
          {data.actions.map((action, i) => (
            <div
              key={action.name}
              style={{
                ...styles.sankeyNode,
                height: `${(action.value / data.totalSessions) * 200}px`,
                backgroundColor: '#3B82F6',
                opacity: 0.7 - i * 0.15,
              }}
            >
              <span style={styles.sankeyNodeLabel}>{action.name}</span>
              <span style={styles.sankeyNodeValue}>{formatNumber(action.value, true)}</span>
            </div>
          ))}
        </div>
        
        {/* Outcome nodes */}
        <div style={styles.sankeyColumn}>
          <span style={styles.sankeyColumnLabel}>Outcome</span>
          {data.outcomes.map((outcome, i) => (
            <div
              key={outcome.name}
              style={{
                ...styles.sankeyNode,
                height: `${(outcome.value / data.totalSessions) * 200}px`,
                backgroundColor: outcome.name === 'Completed' ? '#10B981' : '#EF4444',
              }}
            >
              <span style={styles.sankeyNodeLabel}>{outcome.name}</span>
              <span style={styles.sankeyNodeValue}>{formatNumber(outcome.value, true)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. COMPETITIVE BENCHMARK RADAR
// ============================================================================

export function CompetitiveBenchmarkRadar({ data, competitors }) {
  const metrics = ['Delivery Speed', 'App Rating', 'Price Value', 'Menu Variety', 'Brand Awareness', 'Loyalty'];
  const centerX = 150;
  const centerY = 150;
  const maxRadius = 100;
  
  const getPoint = (index, value, total) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const radius = (value / 100) * maxRadius;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  };
  
  const getPolygonPoints = (values) => {
    return values.map((v, i) => {
      const point = getPoint(i, v, values.length);
      return `${point.x},${point.y}`;
    }).join(' ');
  };
  
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>📊 Competitive Positioning</h3>
      <div style={styles.radarContainer}>
        <svg viewBox="0 0 300 300" style={styles.radarSvg}>
          {/* Background circles */}
          {[20, 40, 60, 80, 100].map(level => (
            <circle
              key={level}
              cx={centerX}
              cy={centerY}
              r={(level / 100) * maxRadius}
              fill="none"
              stroke="#2A2A30"
              strokeWidth="1"
            />
          ))}
          
          {/* Axis lines */}
          {metrics.map((_, i) => {
            const point = getPoint(i, 100, metrics.length);
            return (
              <line
                key={i}
                x1={centerX}
                y1={centerY}
                x2={point.x}
                y2={point.y}
                stroke="#2A2A30"
                strokeWidth="1"
              />
            );
          })}
          
          {/* Competitor polygons */}
          {competitors.map((competitor, idx) => (
            <polygon
              key={competitor.name}
              points={getPolygonPoints(competitor.values)}
              fill={competitor.color}
              fillOpacity="0.2"
              stroke={competitor.color}
              strokeWidth="2"
            />
          ))}
          
          {/* Axis labels */}
          {metrics.map((metric, i) => {
            const point = getPoint(i, 120, metrics.length);
            return (
              <text
                key={metric}
                x={point.x}
                y={point.y}
                textAnchor="middle"
                fill="#6B6B76"
                fontSize="10"
              >
                {metric}
              </text>
            );
          })}
        </svg>
        
        {/* Legend */}
        <div style={styles.radarLegend}>
          {competitors.map(c => (
            <div key={c.name} style={styles.radarLegendItem}>
              <div style={{ ...styles.radarLegendDot, backgroundColor: c.color }} />
              <span>{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 6. DAYPART PERFORMANCE WHEEL
// ============================================================================

export function DaypartWheel({ data }) {
  // data: [{ daypart, revenue, orders, avgTicket }]
  const dayparts = [
    { id: 'breakfast', label: 'Breakfast', time: '6-10 AM', angle: 0 },
    { id: 'lunch', label: 'Lunch', time: '11 AM-2 PM', angle: 60 },
    { id: 'afternoon', label: 'Afternoon', time: '2-5 PM', angle: 120 },
    { id: 'dinner', label: 'Dinner', time: '5-9 PM', angle: 180 },
    { id: 'latenight', label: 'Late Night', time: '9 PM-12 AM', angle: 240 },
    { id: 'overnight', label: 'Overnight', time: '12-6 AM', angle: 300 },
  ];
  
  const maxRevenue = Math.max(...data.map(d => d.revenue));
  
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>🕐 Performance by Daypart</h3>
      <div style={styles.wheelContainer}>
        <svg viewBox="0 0 300 300" style={styles.wheelSvg}>
          {/* Clock face */}
          <circle cx="150" cy="150" r="130" fill="#1E1E24" stroke="#2A2A30" strokeWidth="2" />
          
          {/* Daypart segments */}
          {data.map((dp, index) => {
            const daypart = dayparts[index];
            const startAngle = daypart.angle - 30;
            const endAngle = daypart.angle + 30;
            const intensity = dp.revenue / maxRevenue;
            
            const startRad = (startAngle - 90) * (Math.PI / 180);
            const endRad = (endAngle - 90) * (Math.PI / 180);
            
            const innerR = 50;
            const outerR = 50 + intensity * 70;
            
            const x1Inner = 150 + Math.cos(startRad) * innerR;
            const y1Inner = 150 + Math.sin(startRad) * innerR;
            const x1Outer = 150 + Math.cos(startRad) * outerR;
            const y1Outer = 150 + Math.sin(startRad) * outerR;
            const x2Inner = 150 + Math.cos(endRad) * innerR;
            const y2Inner = 150 + Math.sin(endRad) * innerR;
            const x2Outer = 150 + Math.cos(endRad) * outerR;
            const y2Outer = 150 + Math.sin(endRad) * outerR;
            
            // Label position
            const midRad = ((startAngle + endAngle) / 2 - 90) * (Math.PI / 180);
            const labelR = outerR + 20;
            const labelX = 150 + Math.cos(midRad) * labelR;
            const labelY = 150 + Math.sin(midRad) * labelR;
            
            return (
              <g key={dp.daypart}>
                <path
                  d={`
                    M ${x1Inner} ${y1Inner}
                    L ${x1Outer} ${y1Outer}
                    A ${outerR} ${outerR} 0 0 1 ${x2Outer} ${y2Outer}
                    L ${x2Inner} ${y2Inner}
                    A ${innerR} ${innerR} 0 0 0 ${x1Inner} ${y1Inner}
                  `}
                  fill={`hsl(210, 80%, ${30 + intensity * 40}%)`}
                  stroke="#0D0D0F"
                  strokeWidth="1"
                />
                <text
                  x={labelX}
                  y={labelY - 8}
                  textAnchor="middle"
                  fill="#E8E8EA"
                  fontSize="10"
                  fontWeight="500"
                >
                  {daypart.label}
                </text>
                <text
                  x={labelX}
                  y={labelY + 6}
                  textAnchor="middle"
                  fill="#6B6B76"
                  fontSize="9"
                >
                  {formatCurrency(dp.revenue, true)}
                </text>
              </g>
            );
          })}
          
          {/* Center info */}
          <circle cx="150" cy="150" r="45" fill="#131316" />
          <text x="150" y="145" textAnchor="middle" fill="#6B6B76" fontSize="10">
            Peak
          </text>
          <text x="150" y="162" textAnchor="middle" fill="#E8E8EA" fontSize="14" fontWeight="600">
            Dinner
          </text>
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// 7. LTV/CAC RATIO GAUGE
// ============================================================================

export function LtvCacGauge({ ltv, cac, benchmark = 3 }) {
  const ratio = ltv / cac;
  const maxRatio = 10;
  const angle = Math.min((ratio / maxRatio) * 180, 180);
  
  const getColor = (r) => {
    if (r >= 5) return '#10B981';
    if (r >= 3) return '#3B82F6';
    if (r >= 2) return '#F59E0B';
    return '#EF4444';
  };
  
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>💎 LTV:CAC Ratio</h3>
      <div style={styles.gaugeContainer}>
        <svg viewBox="0 0 200 120" style={styles.gaugeSvg}>
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#2A2A30"
            strokeWidth="16"
            strokeLinecap="round"
          />
          
          {/* Colored zones */}
          <path
            d="M 20 100 A 80 80 0 0 1 56 37"
            fill="none"
            stroke="#EF4444"
            strokeWidth="16"
            strokeLinecap="round"
            opacity="0.3"
          />
          <path
            d="M 56 37 A 80 80 0 0 1 100 20"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="16"
            opacity="0.3"
          />
          <path
            d="M 100 20 A 80 80 0 0 1 144 37"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="16"
            opacity="0.3"
          />
          <path
            d="M 144 37 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#10B981"
            strokeWidth="16"
            strokeLinecap="round"
            opacity="0.3"
          />
          
          {/* Value arc */}
          <path
            d={`M 20 100 A 80 80 0 ${angle > 90 ? 1 : 0} 1 ${
              100 + 80 * Math.cos((180 - angle) * Math.PI / 180)
            } ${
              100 - 80 * Math.sin((180 - angle) * Math.PI / 180)
            }`}
            fill="none"
            stroke={getColor(ratio)}
            strokeWidth="16"
            strokeLinecap="round"
          />
          
          {/* Needle */}
          <line
            x1="100"
            y1="100"
            x2={100 + 60 * Math.cos((180 - angle) * Math.PI / 180)}
            y2={100 - 60 * Math.sin((180 - angle) * Math.PI / 180)}
            stroke="#E8E8EA"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="8" fill="#E8E8EA" />
          
          {/* Labels */}
          <text x="20" y="115" fill="#6B6B76" fontSize="10">0</text>
          <text x="180" y="115" fill="#6B6B76" fontSize="10">10x</text>
        </svg>
        
        <div style={styles.gaugeValue}>
          <span style={{ ...styles.gaugeRatio, color: getColor(ratio) }}>
            {ratio.toFixed(1)}x
          </span>
          <span style={styles.gaugeLabel}>LTV:CAC Ratio</span>
        </div>
        
        <div style={styles.gaugeDetails}>
          <div style={styles.gaugeDetail}>
            <span style={styles.gaugeDetailLabel}>Customer LTV</span>
            <span style={styles.gaugeDetailValue}>{formatCurrency(ltv)}</span>
          </div>
          <div style={styles.gaugeDetail}>
            <span style={styles.gaugeDetailLabel}>Avg CAC</span>
            <span style={styles.gaugeDetailValue}>{formatCurrency(cac)}</span>
          </div>
          <div style={styles.gaugeDetail}>
            <span style={styles.gaugeDetailLabel}>Benchmark</span>
            <span style={styles.gaugeDetailValue}>{benchmark}x</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 8. MENU ITEM PERFORMANCE BUBBLES
// ============================================================================

export function MenuItemBubbles({ data }) {
  // data: [{ name, revenue, margin, orders, category }]
  const maxRevenue = Math.max(...data.map(d => d.revenue));
  const maxOrders = Math.max(...data.map(d => d.orders));
  
  const categoryColors = {
    'Pizza': '#EF4444',
    'Sides': '#F59E0B',
    'Drinks': '#3B82F6',
    'Desserts': '#EC4899',
  };
  
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>📦 Menu Item Performance</h3>
      <div style={styles.bubblesContainer}>
        <div style={styles.bubblesChart}>
          {/* Y-axis label */}
          <div style={styles.bubblesYAxis}>
            <span>Higher Margin →</span>
          </div>
          
          {/* X-axis label */}
          <div style={styles.bubblesXAxis}>
            <span>Higher Volume →</span>
          </div>
          
          {/* Quadrant labels */}
          <div style={{ ...styles.quadrantLabel, top: '10%', right: '10%' }}>
            ⭐ Stars
          </div>
          <div style={{ ...styles.quadrantLabel, top: '10%', left: '10%', color: '#F59E0B' }}>
            💎 Gems
          </div>
          <div style={{ ...styles.quadrantLabel, bottom: '10%', right: '10%', color: '#6B6B76' }}>
            🐄 Cash Cows
          </div>
          <div style={{ ...styles.quadrantLabel, bottom: '10%', left: '10%', color: '#EF4444' }}>
            ❓ Question
          </div>
          
          {/* Bubbles */}
          {data.map((item, index) => {
            const x = (item.orders / maxOrders) * 80 + 10;
            const y = 90 - (item.margin * 0.8);
            const size = 20 + (item.revenue / maxRevenue) * 40;
            
            return (
              <div
                key={item.name}
                style={{
                  ...styles.bubble,
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: categoryColors[item.category] || '#3B82F6',
                }}
                title={`${item.name}: ${formatCurrency(item.revenue, true)} revenue, ${item.margin}% margin`}
              >
                <span style={styles.bubbleLabel}>{item.name.substring(0, 3)}</span>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div style={styles.bubblesLegend}>
          {Object.entries(categoryColors).map(([cat, color]) => (
            <div key={cat} style={styles.bubbleLegendItem}>
              <div style={{ ...styles.bubbleLegendDot, backgroundColor: color }} />
              <span>{cat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(value, compact = false) {
  if (compact) {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
  }
  return `$${value.toLocaleString()}`;
}

function formatNumber(value, compact = false) {
  if (compact) {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function formatCompact(value) {
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  card: {
    backgroundColor: '#131316',
    border: '1px solid #2A2A30',
    borderRadius: '12px',
    padding: '20px',
  },
  cardTitle: {
    margin: '0 0 16px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#E8E8EA',
  },
  
  // Pizza slice
  pizzaContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  pizzaSvg: {
    width: '300px',
    height: '300px',
  },
  
  // Delivery tracker
  trackerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  trackerTotal: {
    fontSize: '14px',
    color: '#6B6B76',
  },
  trackerPipeline: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackerStage: {
    flex: 1,
    textAlign: 'center',
  },
  trackerStageIcon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  trackerStageInfo: {
    marginBottom: '8px',
  },
  trackerStageCount: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 600,
    color: '#E8E8EA',
  },
  trackerStageLabel: {
    fontSize: '12px',
    color: '#6B6B76',
  },
  trackerStageBar: {
    height: '4px',
    backgroundColor: '#2A2A30',
    borderRadius: '2px',
    margin: '0 10px',
  },
  trackerStageBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: '2px',
  },
  trackerArrow: {
    color: '#3B82F6',
    fontSize: '20px',
    margin: '0 8px',
  },
  trackerAnimation: {
    marginTop: '20px',
    height: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  animatedDots: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  orderDot: {
    position: 'absolute',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#3B82F6',
    animation: 'moveDot 3s linear infinite',
  },
  
  // Promo
  promoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  promoCard: {
    backgroundColor: '#1A1A20',
    borderRadius: '8px',
    padding: '16px',
  },
  promoHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  promoCode: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#E8E8EA',
    backgroundColor: '#2A2A30',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  promoRoi: {
    fontSize: '12px',
    fontWeight: 500,
    padding: '4px 8px',
    borderRadius: '12px',
  },
  promoMetrics: {
    display: 'flex',
    gap: '16px',
    marginBottom: '12px',
  },
  promoMetric: {
    flex: 1,
  },
  promoMetricValue: {
    display: 'block',
    fontSize: '16px',
    fontWeight: 600,
    color: '#E8E8EA',
  },
  promoMetricLabel: {
    fontSize: '11px',
    color: '#6B6B76',
  },
  promoRedemption: {},
  promoRedemptionLabel: {
    fontSize: '11px',
    color: '#6B6B76',
    display: 'block',
    marginBottom: '4px',
  },
  promoRedemptionBar: {
    height: '4px',
    backgroundColor: '#2A2A30',
    borderRadius: '2px',
  },
  promoRedemptionFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: '2px',
  },
  
  // Sankey
  sankeyContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    minHeight: '300px',
    padding: '20px 0',
  },
  sankeyColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '120px',
  },
  sankeyColumnLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6B6B76',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  sankeyNode: {
    borderRadius: '4px',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: '40px',
  },
  sankeyNodeLabel: {
    fontSize: '11px',
    fontWeight: 500,
    color: '#E8E8EA',
  },
  sankeyNodeValue: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#E8E8EA',
  },
  sankeyFlows: {
    flex: 1,
    position: 'relative',
  },
  sankeySvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  
  // Radar
  radarContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  radarSvg: {
    width: '300px',
    height: '300px',
  },
  radarLegend: {
    display: 'flex',
    gap: '16px',
    marginTop: '16px',
  },
  radarLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#B0B0B8',
  },
  radarLegendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  
  // Wheel
  wheelContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  wheelSvg: {
    width: '300px',
    height: '300px',
  },
  
  // Gauge
  gaugeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  gaugeSvg: {
    width: '200px',
    height: '120px',
  },
  gaugeValue: {
    textAlign: 'center',
    marginTop: '8px',
  },
  gaugeRatio: {
    display: 'block',
    fontSize: '32px',
    fontWeight: 700,
  },
  gaugeLabel: {
    fontSize: '12px',
    color: '#6B6B76',
  },
  gaugeDetails: {
    display: 'flex',
    gap: '24px',
    marginTop: '20px',
  },
  gaugeDetail: {
    textAlign: 'center',
  },
  gaugeDetailLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#6B6B76',
    marginBottom: '4px',
  },
  gaugeDetailValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#E8E8EA',
  },
  
  // Bubbles
  bubblesContainer: {},
  bubblesChart: {
    position: 'relative',
    height: '300px',
    backgroundColor: '#1A1A20',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  bubblesYAxis: {
    position: 'absolute',
    left: '-40px',
    top: '50%',
    transform: 'rotate(-90deg)',
    fontSize: '10px',
    color: '#6B6B76',
  },
  bubblesXAxis: {
    position: 'absolute',
    bottom: '4px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '10px',
    color: '#6B6B76',
  },
  quadrantLabel: {
    position: 'absolute',
    fontSize: '10px',
    color: '#10B981',
  },
  bubble: {
    position: 'absolute',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'translate(-50%, -50%)',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    opacity: 0.8,
  },
  bubbleLabel: {
    fontSize: '8px',
    fontWeight: 600,
    color: '#fff',
  },
  bubblesLegend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    marginTop: '16px',
  },
  bubbleLegendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#B0B0B8',
  },
  bubbleLegendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
};

export default {
  PizzaSliceComparison,
  DeliveryTracker,
  PromoEffectivenessMatrix,
  CustomerJourneySankey,
  CompetitiveBenchmarkRadar,
  DaypartWheel,
  LtvCacGauge,
  MenuItemBubbles,
};
