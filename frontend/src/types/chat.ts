/**
 * Block-based chat message types for two-panel UI
 */

// ============================================================================
// Block Types
// ============================================================================

export interface TextBlock {
  id: string;
  type: "text";
  markdown: string;
}

export interface ChartBlock {
  id: string;
  type: "chart";
  title?: string;
  subtitle?: string;
  specType: "vegaLite" | "recharts" | "echarts";
  spec: any | null; // Chart specification (null until hydrated)
  dataRef?: {
    type: "genie" | "sql" | "custom";
    genie?: {
      spaceId: string;
      conversationId: string;
      messageId: string;
      attachmentId: string;
    };
    sql?: {
      query: string;
      catalog?: string;
      schema?: string;
    };
  };
  meta?: {
    primaryMeasure?: string;
    primaryDim?: string;
    timeframe?: string;
  };
}

export interface TableBlock {
  id: string;
  type: "table";
  columns: string[];
  rows: any[][];
  meta?: {
    title?: string;
    subtitle?: string;
    query?: string;
  };
}

export interface ImageBlock {
  id: string;
  type: "image";
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export type ChatBlock = TextBlock | ChartBlock | TableBlock | ImageBlock;

// ============================================================================
// Tool Call Types
// ============================================================================

export interface ToolCall {
  name: string;
  status: "running" | "complete" | "error";
  args?: Record<string, any>;
  output?: any;
}

// ============================================================================
// Message Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string; // Deprecated: for backward compatibility, use blocks instead
  blocks: ChatBlock[];
  toolCalls?: ToolCall[];
  timestamp: number;
}

// ============================================================================
// Active Block Reference
// ============================================================================

export interface ActiveBlockRef {
  messageId: string;
  blockId: string;
}

// ============================================================================
// Helper Types
// ============================================================================

export interface TablePreviewData {
  columns: string[];
  rows: any[][];
}

export interface ChartHydrationPayload {
  spec: any;
  table?: TablePreviewData;
}
