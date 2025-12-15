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
};

export default apiClient;
