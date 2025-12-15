/**
 * Business Glossary - Metric Definitions
 *
 * Provides clear definitions, formulas, and benchmarks for all business metrics
 */

export interface GlossaryTerm {
  term: string;
  definition: string;
  formula?: string;
  benchmark?: string;
  icon: string;
  category: 'marketing' | 'revenue' | 'customer' | 'operations';
}

export const BUSINESS_GLOSSARY: Record<string, GlossaryTerm> = {
  // Marketing Metrics
  CAC: {
    term: "Customer Acquisition Cost",
    definition: "The average cost to acquire a new customer through marketing channels. Lower CAC means more efficient marketing spend.",
    formula: "Total Marketing Spend ÷ New Customers Acquired",
    benchmark: "$5-25 for QSR industry. Email typically lowest ($5-8), Display highest ($20-30).",
    icon: "💰",
    category: "marketing"
  },

  ROAS: {
    term: "Return on Ad Spend",
    definition: "Revenue generated for every dollar spent on advertising. Higher ROAS means more profitable campaigns.",
    formula: "Revenue from Ads ÷ Ad Spend",
    benchmark: "3:1 minimum, 5:1 good, 10:1+ excellent for QSR.",
    icon: "📈",
    category: "marketing"
  },

  CPC: {
    term: "Cost Per Click",
    definition: "Average cost paid for each click on digital ads. Key metric for paid search and social campaigns.",
    formula: "Total Ad Spend ÷ Total Clicks",
    benchmark: "$0.50-$2.00 for QSR search ads, $0.25-$1.00 for social.",
    icon: "🖱️",
    category: "marketing"
  },

  // Customer Metrics
  ARPU: {
    term: "Average Revenue Per User",
    definition: "The average annual revenue generated per customer. Higher ARPU indicates more valuable customers.",
    formula: "Total Revenue ÷ Total Active Customers",
    benchmark: "$3,500-4,500 for pizza QSR. Family segment typically highest.",
    icon: "📊",
    category: "customer"
  },

  LTV: {
    term: "Lifetime Value",
    definition: "The total revenue a customer generates over their entire relationship with the brand. Must exceed CAC by 3x+ for healthy unit economics.",
    formula: "ARPU × Average Customer Lifespan (in years)",
    benchmark: "3-5x CAC for sustainable growth. $10,000-15,000 for loyal pizza customers.",
    icon: "💎",
    category: "customer"
  },

  "Retention Rate": {
    term: "Customer Retention Rate",
    definition: "Percentage of customers who continue ordering over time. Higher retention drives profitability.",
    formula: "(Customers at End - New Customers) ÷ Customers at Start × 100",
    benchmark: "Month 1: 60%, Month 6: 35%, Month 12: 20% for QSR.",
    icon: "🔄",
    category: "customer"
  },

  "Churn Rate": {
    term: "Customer Churn Rate",
    definition: "Percentage of customers who stop ordering. Lower churn means better customer experience.",
    formula: "Customers Lost ÷ Total Customers at Start × 100",
    benchmark: "3-5% monthly churn is typical for QSR with loyalty programs.",
    icon: "📉",
    category: "customer"
  },

  // Revenue Metrics
  GMV: {
    term: "Gross Merchandise Value",
    definition: "Total transaction value before discounts and refunds. Shows true demand and sales volume.",
    formula: "Sum of all order subtotals (pre-discount)",
    benchmark: "$200-250M monthly for large regional pizza chain.",
    icon: "💵",
    category: "revenue"
  },

  "Net Revenue": {
    term: "Net Revenue",
    definition: "Revenue after discounts, promotions, and refunds. This is actual income received.",
    formula: "GMV - Discounts - Refunds + Delivery Fees + Tips",
    benchmark: "88-92% of GMV (8-12% discount rate).",
    icon: "💸",
    category: "revenue"
  },

  AOV: {
    term: "Average Order Value",
    definition: "Average amount spent per order. Higher AOV means better upselling and product mix.",
    formula: "Total Revenue ÷ Number of Orders",
    benchmark: "$25-35 for pizza delivery. Family segment typically $35-45.",
    icon: "🛒",
    category: "revenue"
  },

  "Discount Rate": {
    term: "Discount Rate",
    definition: "Percentage of GMV given as discounts and promotions. Track to balance growth and profitability.",
    formula: "Total Discounts ÷ GMV × 100",
    benchmark: "8-12% for pizza QSR. Higher during promotions, lower for loyal customers.",
    icon: "🎫",
    category: "revenue"
  },

  // Operational Metrics
  "Attach Rate": {
    term: "Attach Rate",
    definition: "Percentage of orders that include add-on items (sides, desserts, beverages). Key upsell metric.",
    formula: "Orders with Item ÷ Total Orders × 100",
    benchmark: "Sides: 35-45%, Beverages: 40-50%, Desserts: 15-25%.",
    icon: "🍕",
    category: "operations"
  },

  "Order Frequency": {
    term: "Order Frequency",
    definition: "Average number of orders per customer per time period. Higher frequency drives LTV.",
    formula: "Total Orders ÷ Active Customers",
    benchmark: "12-18 orders/year for regular pizza customers.",
    icon: "📅",
    category: "customer"
  },

  "Channel Mix": {
    term: "Channel Mix",
    definition: "Distribution of orders across channels (Mobile App, Online, Phone, Walk-in). Track to optimize investments.",
    formula: "Orders per Channel ÷ Total Orders × 100",
    benchmark: "Mobile: 45-50%, Online: 25-30%, Phone: 15-20%, Walk-in: 5-10%.",
    icon: "📱",
    category: "operations"
  },

  // Time-based Metrics
  "Cohort": {
    term: "Customer Cohort",
    definition: "Group of customers acquired in the same time period. Track cohorts to understand retention patterns.",
    formula: "Grouped by first order month/quarter",
    benchmark: "Best cohorts retain 25%+ customers after 12 months.",
    icon: "👥",
    category: "customer"
  },

  // Efficiency Metrics
  "CAC:LTV Ratio": {
    term: "CAC to LTV Ratio",
    definition: "Efficiency of customer acquisition. Shows if you're spending the right amount to acquire customers.",
    formula: "LTV ÷ CAC",
    benchmark: "3:1 minimum, 5:1+ excellent. Below 3:1 means burning money.",
    icon: "⚖️",
    category: "marketing"
  },

  "Payback Period": {
    term: "CAC Payback Period",
    definition: "Time to recover customer acquisition cost through revenue. Faster payback improves cash flow.",
    formula: "CAC ÷ (ARPU ÷ 12)",
    benchmark: "6-12 months for healthy SaaS/subscription. 3-6 months for transactional.",
    icon: "⏱️",
    category: "marketing"
  },

  // Product Metrics
  "Product Mix": {
    term: "Product Mix",
    definition: "Distribution of revenue across product categories. Optimize mix for profitability.",
    formula: "Revenue per Category ÷ Total Revenue × 100",
    benchmark: "Pizza: 65-70%, Sides: 15-20%, Beverages: 8-12%, Desserts: 5-8%.",
    icon: "🍽️",
    category: "operations"
  },

  // Delivery Metrics
  "Delivery Time": {
    term: "Average Delivery Time",
    definition: "Time from order placement to delivery. Critical for customer satisfaction.",
    formula: "Sum of Delivery Times ÷ Number of Deliveries",
    benchmark: "25-35 minutes. Under 30 min = good, over 40 min = poor satisfaction.",
    icon: "🚗",
    category: "operations"
  },

  // Geographic Metrics
  "Store Performance": {
    term: "Store-Level Performance",
    definition: "Revenue and order metrics by store location. Identify top and underperforming locations.",
    formula: "Aggregated metrics by store_id",
    benchmark: "Top 20% stores do 2-3x volume of bottom 20%.",
    icon: "🏪",
    category: "operations"
  }
};

/**
 * Get glossary term by key
 */
export function getGlossaryTerm(key: string): GlossaryTerm | undefined {
  return BUSINESS_GLOSSARY[key];
}

/**
 * Get all terms by category
 */
export function getTermsByCategory(category: GlossaryTerm['category']): GlossaryTerm[] {
  return Object.values(BUSINESS_GLOSSARY).filter(term => term.category === category);
}

/**
 * Search glossary terms
 */
export function searchGlossary(query: string): GlossaryTerm[] {
  const lowerQuery = query.toLowerCase();
  return Object.values(BUSINESS_GLOSSARY).filter(term =>
    term.term.toLowerCase().includes(lowerQuery) ||
    term.definition.toLowerCase().includes(lowerQuery)
  );
}
