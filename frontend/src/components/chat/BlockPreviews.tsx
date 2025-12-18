import React from "react";
import { ChartBlock, TableBlock, ImageBlock } from "@/types/chat";
import { BarChart3, Table as TableIcon, Image as ImageIcon, Eye } from "lucide-react";

interface PreviewProps {
  isActive: boolean;
  onClick: () => void;
}

// ============================================================================
// Chart Preview
// ============================================================================

interface ChartPreviewProps extends PreviewProps {
  block: ChartBlock;
}

export function ChartPreview({ block, isActive, onClick }: ChartPreviewProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-all cursor-pointer"
      style={{
        background: isActive
          ? "rgba(0, 100, 145, 0.15)"
          : "rgba(15, 23, 42, 0.6)",
        border: isActive
          ? "2px solid var(--color-accent)"
          : "1px solid rgba(30, 41, 59, 0.8)",
        borderRadius: "var(--radius-md)",
        padding: "0.75rem",
        marginTop: "0.5rem",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = "rgba(0, 100, 145, 0.5)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = "rgba(30, 41, 59, 0.8)";
        }
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <BarChart3
          className="h-4 w-4"
          style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)" }}
        />
        <span
          className="text-xs font-medium"
          style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-primary)" }}
        >
          {block.title || "Chart"}
        </span>
        {isActive && (
          <Eye className="h-3 w-3 ml-auto" style={{ color: "var(--color-accent)" }} />
        )}
      </div>
      {block.subtitle && (
        <p className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
          {block.subtitle}
        </p>
      )}
      {!isActive && (
        <p
          className="text-[10px] mt-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          Click to view →
        </p>
      )}
    </button>
  );
}

// ============================================================================
// Table Preview
// ============================================================================

interface TablePreviewProps extends PreviewProps {
  block: TableBlock;
}

export function TablePreview({ block, isActive, onClick }: TablePreviewProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-all cursor-pointer"
      style={{
        background: isActive
          ? "rgba(0, 100, 145, 0.15)"
          : "rgba(15, 23, 42, 0.6)",
        border: isActive
          ? "2px solid var(--color-accent)"
          : "1px solid rgba(30, 41, 59, 0.8)",
        borderRadius: "var(--radius-md)",
        padding: "0.75rem",
        marginTop: "0.5rem",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = "rgba(0, 100, 145, 0.5)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = "rgba(30, 41, 59, 0.8)";
        }
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <TableIcon
          className="h-4 w-4"
          style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)" }}
        />
        <span
          className="text-xs font-medium"
          style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-primary)" }}
        >
          {block.meta?.title || "Table"}
        </span>
        {isActive && (
          <Eye className="h-3 w-3 ml-auto" style={{ color: "var(--color-accent)" }} />
        )}
      </div>
      <p className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
        {block.rows.length} rows × {block.columns.length} columns
      </p>
      {!isActive && (
        <p
          className="text-[10px] mt-1"
          style={{ color: "var(--color-text-muted)" }}
        >
          Click to view →
        </p>
      )}
    </button>
  );
}

// ============================================================================
// Image Preview
// ============================================================================

interface ImagePreviewProps extends PreviewProps {
  block: ImageBlock;
}

export function ImagePreview({ block, isActive, onClick }: ImagePreviewProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left transition-all cursor-pointer overflow-hidden"
      style={{
        background: isActive
          ? "rgba(0, 100, 145, 0.15)"
          : "rgba(15, 23, 42, 0.6)",
        border: isActive
          ? "2px solid var(--color-accent)"
          : "1px solid rgba(30, 41, 59, 0.8)",
        borderRadius: "var(--radius-md)",
        padding: "0.75rem",
        marginTop: "0.5rem",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = "rgba(0, 100, 145, 0.5)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.borderColor = "rgba(30, 41, 59, 0.8)";
        }
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <ImageIcon
          className="h-4 w-4"
          style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)" }}
        />
        <span
          className="text-xs font-medium"
          style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-primary)" }}
        >
          {block.alt || "Image"}
        </span>
        {isActive && (
          <Eye className="h-3 w-3 ml-auto" style={{ color: "var(--color-accent)" }} />
        )}
      </div>
      {/* Thumbnail */}
      <img
        src={block.url}
        alt={block.alt ?? ""}
        style={{
          width: "100%",
          height: "120px",
          objectFit: "cover",
          borderRadius: "var(--radius-sm)",
        }}
      />
      {!isActive && (
        <p
          className="text-[10px] mt-2"
          style={{ color: "var(--color-text-muted)" }}
        >
          Click to enlarge →
        </p>
      )}
    </button>
  );
}
