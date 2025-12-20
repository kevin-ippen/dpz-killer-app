/**
 * Citation Preview Component
 *
 * Displays a clickable citation chip with file type icon and metadata
 */

import { CitationBlock, FileType } from "@/types/chat";
import {
  FileText,
  File,
  Table,
  Presentation,
  FileCode,
  Image as ImageIcon,
  Globe
} from "lucide-react";

interface CitationPreviewProps {
  citation: CitationBlock;
  onClick: () => void;
}

// Map file types to icons and colors
function getFileIcon(fileType: FileType) {
  switch (fileType) {
    case 'pdf':
      return { Icon: FileText, color: '#EF4444' }; // red
    case 'word':
      return { Icon: File, color: '#3B82F6' }; // blue
    case 'excel':
    case 'data':
      return { Icon: Table, color: '#10B981' }; // green
    case 'powerpoint':
      return { Icon: Presentation, color: '#F59E0B' }; // amber
    case 'text':
      return { Icon: FileCode, color: '#8B5CF6' }; // purple
    case 'image':
      return { Icon: ImageIcon, color: '#EC4899' }; // pink
    case 'web':
      return { Icon: Globe, color: '#6366F1' }; // indigo
    default:
      return { Icon: File, color: '#9CA3AF' }; // gray
  }
}

export function CitationPreview({ citation, onClick }: CitationPreviewProps) {
  const { Icon, color } = getFileIcon(citation.fileType);

  // Build tooltip text
  let tooltipText = citation.title;
  if (citation.page) {
    tooltipText += `, page ${citation.page}`;
  }
  if (citation.score) {
    tooltipText += ` (relevance: ${(citation.score * 100).toFixed(0)}%)`;
  }
  if (citation.snippet) {
    tooltipText += `\n\n"${citation.snippet}"`;
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 mx-0.5 text-[10px] font-medium rounded border transition-all"
      style={{
        borderColor: color,
        color: color,
        background: `${color}15`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = `${color}25`;
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = `0 2px 8px ${color}40`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = `${color}15`;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
      title={tooltipText}
    >
      <Icon className="h-3 w-3" />
      <span className="font-semibold">
        {citation.refNumber ? `[${citation.refNumber}]` : citation.label.slice(0, 20)}
        {citation.label.length > 20 ? '…' : ''}
      </span>
      {citation.page && (
        <span className="opacity-70">p.{citation.page}</span>
      )}
      {citation.score && (
        <span
          className="text-[9px] px-1 py-0.5 rounded font-bold"
          style={{
            background: `${color}30`,
            color: color
          }}
        >
          {(citation.score * 100).toFixed(0)}%
        </span>
      )}
    </button>
  );
}
