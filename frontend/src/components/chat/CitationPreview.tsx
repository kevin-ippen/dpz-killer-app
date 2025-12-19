/**
 * Citation Preview Component
 *
 * Displays a clickable footnote reference for PDF citations
 */

import { CitationBlock } from "@/types/chat";
import { FileText } from "lucide-react";

interface CitationPreviewProps {
  citation: CitationBlock;
  onClick: () => void;
}

export function CitationPreview({ citation, onClick }: CitationPreviewProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 text-[10px] font-medium rounded border transition-colors"
      style={{
        borderColor: "var(--color-accent)",
        color: "var(--color-accent)",
        background: "rgba(59, 130, 246, 0.1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
      }}
      title={`${citation.title}${citation.page ? `, page ${citation.page}` : ''}`}
    >
      <FileText className="h-2.5 w-2.5" />
      <span>[{citation.index}]</span>
    </button>
  );
}
