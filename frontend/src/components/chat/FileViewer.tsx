/**
 * File Viewer Component
 *
 * Universal file viewer that handles multiple file types:
 * - PDFs (using react-pdf)
 * - Images (PNG, JPG, etc.)
 * - Text files (TXT, MD)
 * - Data files (JSON, CSV, XML)
 * - Word/Excel/PowerPoint (download link with preview message)
 */

import { useState } from "react";
import { CitationBlock, FileType } from "@/types/chat";
import {
  ExternalLink,
  FileText,
  Download,
  File,
  AlertCircle,
} from "lucide-react";
import { FullPDFView } from "./FullPDFView";
import { FullImageView } from "./FullImageView";

interface FileViewerProps {
  citation: CitationBlock;
}

export function FileViewer({ citation }: FileViewerProps) {
  const { fileType, url, path, title } = citation;

  // Route to appropriate viewer based on file type
  switch (fileType) {
    case 'pdf':
      // Use existing FullPDFView component
      return <FullPDFView block={citation} />;

    case 'image':
      // Use existing FullImageView component
      return (
        <FullImageView
          block={{
            id: citation.id,
            type: 'image',
            url: url,
            alt: title,
          }}
        />
      );

    case 'text':
      return <TextFileViewer url={url} title={title} />;

    case 'data':
      return <DataFileViewer url={url} title={title} path={path} />;

    case 'word':
    case 'excel':
    case 'powerpoint':
      return <OfficeFilePreview url={url} title={title} fileType={fileType} />;

    case 'web':
      return <WebPagePreview url={url} title={title} />;

    default:
      return <GenericFilePreview url={url} title={title} path={path} />;
  }
}

// ============================================================================
// TEXT FILE VIEWER
// ============================================================================

function TextFileViewer({ url, title }: { url: string; title: string }) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useState(() => {
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load: ${res.statusText}`);
        return res.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  });

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
          <div className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {title}
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
        >
          <ExternalLink className="h-3 w-3" />
          Open
        </a>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading && <div className="text-gray-400">Loading...</div>}
        {error && <div className="text-red-400">Error: {error}</div>}
        {content && (
          <pre
            className="text-sm font-mono whitespace-pre-wrap"
            style={{ color: "var(--color-text-primary)" }}
          >
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DATA FILE VIEWER (JSON, CSV, XML)
// ============================================================================

function DataFileViewer({ url, title, path }: { url: string; title: string; path: string }) {
  const isCSV = path.toLowerCase().endsWith('.csv');
  const isJSON = path.toLowerCase().endsWith('.json');

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
          <File className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
          <div className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {title}
          </div>
        </div>
        <a
          href={url}
          download
          className="flex items-center gap-1 px-3 py-1 text-xs rounded border transition-colors"
          style={{
            borderColor: "rgba(71, 85, 105, 0.8)",
            color: "var(--color-text-secondary)",
          }}
        >
          <Download className="h-3 w-3" />
          Download
        </a>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <File className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
            {isCSV ? 'CSV Data File' : isJSON ? 'JSON Data File' : 'Data File'}
          </h3>
          <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
            {isCSV
              ? 'CSV files can be opened in Excel or any spreadsheet application.'
              : isJSON
              ? 'JSON files contain structured data in JavaScript Object Notation format.'
              : 'This data file can be downloaded and opened with an appropriate application.'}
          </p>
          <a
            href={url}
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded transition-colors"
            style={{
              background: "var(--color-accent)",
              color: "white",
            }}
          >
            <Download className="h-4 w-4" />
            Download File
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// OFFICE FILE PREVIEW (Word, Excel, PowerPoint)
// ============================================================================

function OfficeFilePreview({
  url,
  title,
  fileType,
}: {
  url: string;
  title: string;
  fileType: FileType;
}) {
  const fileTypeLabels = {
    word: 'Word Document',
    excel: 'Excel Spreadsheet',
    powerpoint: 'PowerPoint Presentation',
  };

  const label = fileTypeLabels[fileType as keyof typeof fileTypeLabels] || 'Office Document';

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
          <File className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
          <div className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {title}
          </div>
        </div>
        <a
          href={url}
          download
          className="flex items-center gap-1 px-3 py-1 text-xs rounded border transition-colors"
          style={{
            borderColor: "rgba(71, 85, 105, 0.8)",
            color: "var(--color-text-secondary)",
          }}
        >
          <Download className="h-3 w-3" />
          Download
        </a>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <File className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
            {label}
          </h3>
          <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
            This file requires Microsoft Office or a compatible application to view.
          </p>
          <a
            href={url}
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded transition-colors"
            style={{
              background: "var(--color-accent)",
              color: "white",
            }}
          >
            <Download className="h-4 w-4" />
            Download to View
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// WEB PAGE PREVIEW
// ============================================================================

function WebPagePreview({ url, title }: { url: string; title: string }) {
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
          <ExternalLink className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
          <div className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {title}
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
        >
          <ExternalLink className="h-3 w-3" />
          Open Link
        </a>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <ExternalLink className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
            Web Page
          </h3>
          <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
            {url}
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded transition-colors"
            style={{
              background: "var(--color-accent)",
              color: "white",
            }}
          >
            <ExternalLink className="h-4 w-4" />
            Open in New Tab
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GENERIC FILE PREVIEW
// ============================================================================

function GenericFilePreview({ url, title, path }: { url: string; title: string; path: string }) {
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
          <File className="h-4 w-4" style={{ color: "var(--color-accent)" }} />
          <div className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {title}
          </div>
        </div>
        <a
          href={url}
          download
          className="flex items-center gap-1 px-3 py-1 text-xs rounded border transition-colors"
          style={{
            borderColor: "rgba(71, 85, 105, 0.8)",
            color: "var(--color-text-secondary)",
          }}
        >
          <Download className="h-3 w-3" />
          Download
        </a>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
            File Preview Not Available
          </h3>
          <p className="text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
            {path}
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
            This file type cannot be previewed in the browser. Download it to view the contents.
          </p>
          <a
            href={url}
            download
            className="inline-flex items-center gap-2 px-4 py-2 rounded transition-colors"
            style={{
              background: "var(--color-accent)",
              color: "white",
            }}
          >
            <Download className="h-4 w-4" />
            Download File
          </a>
        </div>
      </div>
    </div>
  );
}
