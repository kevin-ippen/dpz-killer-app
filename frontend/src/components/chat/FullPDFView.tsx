/**
 * Full PDF View Component
 *
 * Displays a PDF document in the right panel with optional page navigation
 */

import { CitationBlock } from "@/types/chat";
import { ExternalLink, FileText } from "lucide-react";

interface FullPDFViewProps {
  block: CitationBlock;
}

export function FullPDFView({ block }: FullPDFViewProps) {
  const { title, url, page } = block;

  // For Unity Catalog volumes, we may need to proxy the request
  // For now, embed directly (works if user has access)
  const embedUrl = page ? `${url}#page=${page}` : url;

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.96)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-subtle)",
        boxShadow: "var(--shadow-soft)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "rgba(30, 41, 59, 0.8)" }}
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
          <div>
            <div
              className="text-sm font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              {title}
            </div>
            {page && (
              <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                Page {page}
              </div>
            )}
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-3 py-1 text-xs rounded border transition-colors"
          style={{
            borderColor: "rgba(71, 85, 105, 0.8)",
            color: "var(--color-text-secondary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--color-accent)";
            e.currentTarget.style.color = "var(--color-accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(71, 85, 105, 0.8)";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
        >
          <ExternalLink className="h-3 w-3" />
          Open in New Tab
        </a>
      </div>

      {/* PDF Embed */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={embedUrl}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          title={title}
        />
      </div>
    </div>
  );
}
