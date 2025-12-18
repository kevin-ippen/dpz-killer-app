import { ImageBlock } from "@/types/chat";
import { ExternalLink } from "lucide-react";

interface FullImageViewProps {
  block: ImageBlock;
}

export function FullImageView({ block }: FullImageViewProps) {
  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.96)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-subtle)",
        boxShadow: "var(--shadow-soft)",
        padding: "0.75rem",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          {block.alt || "Image"}
        </div>
        <button
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: "var(--color-text-secondary)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--color-text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
          onClick={() => window.open(block.url, "_blank")}
        >
          <ExternalLink className="h-3 w-3" />
          Open in new tab
        </button>
      </div>

      {/* Image container */}
      <div className="flex-1 flex items-center justify-center overflow-auto">
        <img
          src={block.url}
          alt={block.alt ?? ""}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            borderRadius: "var(--radius-md)",
            objectFit: "contain",
          }}
        />
      </div>
    </div>
  );
}
