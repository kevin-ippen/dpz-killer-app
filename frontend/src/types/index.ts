/**
 * TypeScript type definitions
 *
 * Define interfaces matching your backend Pydantic models.
 * Keep these in sync with backend/app/models/schemas.py
 */

// ============================================================================
// Example Types - Replace with your domain models
// ============================================================================

export interface Item {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface ItemDetail extends Item {
  url?: string;
  score?: number;
}

// ============================================================================
// Response Types
// ============================================================================

export interface ItemListResponse {
  items: ItemDetail[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface HealthResponse {
  status: string;
  version: string;
  environment: string;
  timestamp: string;
}

export interface ErrorResponse {
  error: string;
  detail?: string;
  timestamp: string;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
  data?: any;
}

// ============================================================================
// Request Types
// ============================================================================

export interface SearchRequest {
  query: string;
  limit?: number;
  filters?: Record<string, any>;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'ASC' | 'DESC';
}

// ============================================================================
// Utility Types
// ============================================================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface ApiError {
  message: string;
  status?: number;
  detail?: string;
}
