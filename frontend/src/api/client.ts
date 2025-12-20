/**
 * API Client Configuration
 *
 * Centralized Axios client for all API calls.
 * Automatically handles base URL, headers, and error handling.
 */
import axios from 'axios';
import type { HealthResponse, ItemListResponse, Item } from '@/types';

// API base URL - proxied to backend in development
const API_BASE = '/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add request interceptor for auth tokens (if needed)
apiClient.interceptors.request.use(
  (config) => {
    // Add authorization header if token exists
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// API Endpoints
// ============================================================================

/**
 * Health check API
 */
export const healthApi = {
  check: async (): Promise<HealthResponse> => {
    const response = await apiClient.get('/health');
    return response.data;
  },
};

/**
 * Items API
 *
 * Example CRUD operations - replace with your domain entities
 */
export const itemsApi = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
  }): Promise<ItemListResponse> => {
    const response = await apiClient.get('/items', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Item> => {
    const response = await apiClient.get(`/items/${id}`);
    return response.data;
  },

  create: async (item: Partial<Item>): Promise<Item> => {
    const response = await apiClient.post('/items', item);
    return response.data;
  },

  update: async (id: string, item: Partial<Item>): Promise<Item> => {
    const response = await apiClient.put(`/items/${id}`, item);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/items/${id}`);
  },
};

/**
 * Chat API
 *
 * Endpoints for the chat interface with LLM
 */
export const chatApi = {
  /**
   * Send a chat message and get LLM response
   */
  query: async (message: string, conversationId?: string): Promise<{
    message: string;
    conversation_id: string;
    suggestions?: string[];
  }> => {
    const response = await apiClient.post('/chat/query', {
      message,
      conversation_id: conversationId,
    });
    return response.data;
  },

  /**
   * Get suggested starter queries
   */
  getSuggestions: async (): Promise<{ suggestions: string[] }> => {
    const response = await apiClient.get('/chat/suggestions');
    return response.data;
  },
};

/**
 * Metrics API
 *
 * Endpoints for dashboard metrics and analytics
 */
export const metricsApi = {
  /**
   * Get dashboard summary metrics
   */
  getSummary: async (): Promise<{
    total_revenue: number;
    total_orders: number;
    avg_order_value: number;
    customer_satisfaction: number;
  }> => {
    const response = await apiClient.get('/metrics/summary');
    return response.data;
  },

  /**
   * Get revenue trend data
   */
  getRevenueTrend: async (months: number = 6): Promise<Array<{
    month: string;
    revenue: number;
    orders: number;
  }>> => {
    const response = await apiClient.get('/metrics/revenue-trend', {
      params: { months },
    });
    return response.data;
  },

  /**
   * Get channel breakdown
   */
  getChannelBreakdown: async (): Promise<Array<{
    channel: string;
    revenue: number;
  }>> => {
    const response = await apiClient.get('/metrics/channel-breakdown');
    return response.data;
  },

  /**
   * Get Customer Acquisition Cost (CAC) by channel
   */
  getCacByChannel: async (): Promise<Array<{
    channel: string;
    total_spend: number;
    new_customers: number;
    cac: number;
    cac_grade: string;
  }>> => {
    const response = await apiClient.get('/metrics/cac-by-channel');
    return response.data;
  },

  /**
   * Get Average Revenue Per User (ARPU) by segment
   */
  getArpuBySegment: async (year?: number): Promise<Array<{
    customer_segment: string;
    order_year: number;
    arpu: number;
    customer_count: number;
    total_revenue: number;
    avg_orders_per_customer: number;
  }>> => {
    const response = await apiClient.get('/metrics/arpu-by-segment', {
      params: year ? { year } : undefined,
    });
    return response.data;
  },

  /**
   * Get cohort retention curves
   */
  getCohortRetention: async (cohortMonth?: string): Promise<Array<{
    cohort_month: string;
    months_since_acquisition: number;
    cohort_size: number;
    active_customers: number;
    retention_rate_pct: number;
    total_revenue: number;
    avg_revenue_per_customer: number;
  }>> => {
    const response = await apiClient.get('/metrics/cohort-retention', {
      params: cohortMonth ? { cohort_month: cohortMonth } : undefined,
    });
    return response.data;
  },

  /**
   * Get Gross Merchandise Value (GMV) trend
   */
  getGmvTrend: async (startDate?: string, endDate?: string): Promise<Array<{
    month: string;
    gmv: number;
    net_revenue: number;
    total_discounts: number;
    discount_rate_pct: number;
    order_count: number;
    customer_count: number;
  }>> => {
    const response = await apiClient.get('/metrics/gmv-trend', {
      params: {
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      },
    });
    return response.data;
  },

  /**
   * Get channel mix (order and revenue distribution)
   */
  getChannelMix: async (startDate?: string, endDate?: string): Promise<Array<{
    month: string;
    channel: string;
    order_count: number;
    revenue: number;
    pct_of_orders: number;
    pct_of_revenue: number;
  }>> => {
    const response = await apiClient.get('/metrics/channel-mix', {
      params: {
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      },
    });
    return response.data;
  },

  /**
   * Get attach rate (upsell metrics)
   */
  getAttachRate: async (segment?: string, startDate?: string, endDate?: string): Promise<Array<{
    month: string;
    customer_segment: string;
    total_orders: number;
    sides_attach_rate_pct: number;
    dessert_attach_rate_pct: number;
    beverage_attach_rate_pct: number;
    any_addon_rate_pct: number;
  }>> => {
    const response = await apiClient.get('/metrics/attach-rate', {
      params: {
        ...(segment && { segment }),
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      },
    });
    return response.data;
  },

  /**
   * Get hourly heatmap data (order volume by hour and day)
   */
  getHourlyHeatmap: async (): Promise<Array<{
    day: string;
    hour: number;
    dayIndex: number;
    value: number;
  }>> => {
    const response = await apiClient.get('/metrics/hourly-heatmap');
    return response.data;
  },

  /**
   * Get detailed attach rate with revenue and trends
   */
  getAttachRateDetailed: async (): Promise<Array<{
    product: string;
    rate: number;
    revenue: number;
    trend: number;
  }>> => {
    const response = await apiClient.get('/metrics/attach-rate-detailed');
    return response.data;
  },
};

export default apiClient;
