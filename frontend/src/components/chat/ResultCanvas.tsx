import React from "react";
import { ChatMessage, ChatBlock, ActiveBlockRef } from "@/types/chat";
import { FullChartView } from "./FullChartView";
import { FullTableView } from "./FullTableView";
import { FullImageView } from "./FullImageView";
import { FileViewer } from "./FileViewer";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ResultCanvasProps {
  messages: ChatMessage[];
  activeBlock: ActiveBlockRef | null;
  onBlockChange: (ref: ActiveBlockRef | null) => void;
}

export function ResultCanvas({
  messages,
  activeBlock,
  onBlockChange,
}: ResultCanvasProps) {
  const block = React.useMemo(() => {
    if (!activeBlock) return null;
    const msg = messages.find((m) => m.id === activeBlock.messageId);
    if (!msg) return null;

    // Check blocks first
    const foundBlock = msg.blocks.find((b) => b.id === activeBlock.blockId);
    if (foundBlock) return foundBlock;

    // Check citations
    const foundCitation = msg.citations?.find((c) => c.id === activeBlock.blockId);
    return foundCitation ?? null;
  }, [messages, activeBlock]);

  const blockTitle = (block: ChatBlock): string => {
    switch (block.type) {
      case "chart":
        return block.title || "Chart";
      case "table":
        return block.meta?.title || "Table";
      case "image":
        return block.alt || "Image";
      case "citation":
        return block.title || "Document";
      case "text":
        return "Text";
      default:
        return "Content";
    }
  };

  return (
    <div
      className="flex flex-col h-full text-[var(--color-text-primary)]"
      style={{ background: "var(--color-bg-app)" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <div className="flex flex-col">
          <span
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Result
          </span>
          <span className="text-sm" style={{ color: "var(--color-text-primary)" }}>
            {block ? blockTitle(block) : "Select a chart, table, or image"}
          </span>
        </div>
        {block && (
          <button
            className="text-xs hover:underline"
            style={{
              color: "var(--color-text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--color-text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--color-text-secondary)";
            }}
            onClick={() => onBlockChange(null)}
          >
            Clear
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-4 overflow-auto">
        {!block && (
          <div
            className="h-full w-full flex items-center justify-center text-sm"
            style={{ color: "var(--color-text-muted)" }}
          >
            Click a chart, table, citation, or image in the chat to view it here.
          </div>
        )}

        {block && block.type === "chart" && <FullChartView block={block} />}

        {block && block.type === "table" && <FullTableView block={block} />}

        {block && block.type === "citation" && <FileViewer citation={block} />}

        {block && block.type === "image" && <FullImageView block={block} />}

        {block && block.type === "text" && (
          <div className="max-w-3xl">
            <MarkdownRenderer>{block.markdown}</MarkdownRenderer>
          </div>
        )}
      </div>
    </div>
  );
}
