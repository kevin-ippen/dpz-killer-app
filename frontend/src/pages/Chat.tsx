/**
 * Chat Page - Native React implementation with MAS streaming
 *
 * Connects to /api/chat/stream endpoint and displays streaming responses
 * from the Multi-Agent Supervisor (MAS) with Genie Spaces integration.
 */

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles, Database, CheckCircle2, AlertCircle } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
}

interface ToolCall {
  name: string;
  status: "running" | "complete" | "error";
  args?: Record<string, any>;
  output?: string;
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `# Welcome to Domino's Analytics Assistant! 🍕

I can help you analyze your business data across:
- 📊 **Executive & Finance** - CAC, ARPU, GMV, retention
- 📢 **Marketing Performance** - Campaign ROI, channel efficiency
- 👥 **Customer Analytics** - LTV, segmentation, churn
- 🏪 **Operations** - Store performance, delivery times
- 💰 **Sales** - Revenue trends, product mix

**Try asking:**
- "What's our total revenue this month?"
- "Show me CAC by marketing channel"
- "Which customer segment has highest ARPU?"`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    // Create assistant message placeholder
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      toolCalls: [],
    };

    setMessages((prev) => [...prev, assistantMessage]);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Build message history
      const messageHistory = messages
        .filter((m) => m.role !== "assistant" || m.content) // Skip empty assistant messages
        .map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: null,
        }));

      // Add current user message
      messageHistory.push({
        role: "user",
        content: input.trim(),
        timestamp: null,
      });

      // Call streaming endpoint
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messageHistory }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;

          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);

            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantMessageId) return msg;

                switch (event.type) {
                  case "text.delta":
                    return { ...msg, content: msg.content + event.delta };

                  case "tool.call":
                    return {
                      ...msg,
                      toolCalls: [
                        ...(msg.toolCalls || []),
                        {
                          name: event.name,
                          status: "running",
                          args: event.args,
                        },
                      ],
                    };

                  case "tool.output":
                    return {
                      ...msg,
                      toolCalls: msg.toolCalls?.map((tool) =>
                        tool.name === event.name
                          ? { ...tool, status: "complete", output: event.output }
                          : tool
                      ),
                    };

                  case "error":
                    return {
                      ...msg,
                      content: msg.content + `\n\n❌ Error: ${event.message}`,
                      toolCalls: msg.toolCalls?.map((tool) =>
                        tool.status === "running" ? { ...tool, status: "error" } : tool
                      ),
                    };

                  default:
                    return msg;
                }
              })
            );
          } catch (e) {
            console.error("Failed to parse SSE event:", e);
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Stream aborted by user");
      } else {
        console.error("Chat error:", error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content: `❌ Failed to get response: ${error.message}`,
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-[#FDFAF5]">
      {/* Header */}
      <div className="border-b border-[#F8F3E9] bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-medium tracking-tight text-[#523416]">
              <Sparkles className="h-5 w-5 text-[#2F7FD9]" />
              Analytics Assistant
            </h1>
            <p className="text-sm font-light text-[#B59D81]">
              Powered by Databricks Genie Spaces
            </p>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-sm text-[#B59D81]">
            <span
              className={`h-2 w-2 rounded-full ${
                isStreaming ? "animate-pulse bg-[#2F7FD9]" : "bg-green-500"
              }`}
            />
            <span className="font-light">
              {isStreaming ? "Thinking..." : "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-3xl rounded-lg px-4 py-3 ${
                message.role === "user"
                  ? "bg-[#2F7FD9] text-white"
                  : "bg-white border border-[#F8F3E9] text-[#523416]"
              }`}
            >
              {/* Tool calls */}
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mb-3 space-y-2">
                  {message.toolCalls.map((tool, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded bg-[#F8F3E9] px-3 py-2 text-xs"
                    >
                      {tool.status === "running" && (
                        <Loader2 className="h-3 w-3 animate-spin text-[#2F7FD9]" />
                      )}
                      {tool.status === "complete" && (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      )}
                      {tool.status === "error" && (
                        <AlertCircle className="h-3 w-3 text-[#EC3115]" />
                      )}
                      <Database className="h-3 w-3 text-[#B59D81]" />
                      <span className="font-medium text-[#523416]">
                        {tool.name === "execute_genie_query"
                          ? "Querying Genie Space"
                          : tool.name}
                      </span>
                      {tool.status === "complete" && (
                        <span className="ml-auto text-green-600">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Message content */}
              <div className="prose prose-sm max-w-none">
                {formatMarkdown(message.content)}
              </div>

              {/* Timestamp */}
              <div
                className={`mt-2 text-xs ${
                  message.role === "user" ? "text-white/70" : "text-[#B59D81]"
                }`}
              >
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#F8F3E9] bg-white px-6 py-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your analytics data..."
            disabled={isStreaming}
            className="flex-1 rounded-lg border border-[#F8F3E9] bg-[#FDFAF5] px-4 py-3 text-[#523416] placeholder-[#B59D81] focus:border-[#2F7FD9] focus:outline-none focus:ring-2 focus:ring-[#2F7FD9] focus:ring-opacity-20 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex items-center gap-2 rounded-lg bg-[#2F7FD9] px-6 py-3 font-medium text-white transition-all hover:bg-[#2567B8] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple markdown formatter
function formatMarkdown(text: string): JSX.Element {
  if (!text) return <></>;

  const lines = text.split("\n");
  const elements: JSX.Element[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-2xl font-medium mb-2 text-[#523416]">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-xl font-medium mb-2 text-[#523416]">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-lg font-medium mb-2 text-[#523416]">
          {line.slice(4)}
        </h3>
      );
    }
    // Bullet points
    else if (line.startsWith("- ")) {
      elements.push(
        <li key={i} className="ml-4 text-[#523416]">
          {formatInline(line.slice(2))}
        </li>
      );
    }
    // Empty lines
    else if (!line.trim()) {
      elements.push(<br key={i} />);
    }
    // Regular text
    else {
      elements.push(
        <p key={i} className="text-[#523416]">
          {formatInline(line)}
        </p>
      );
    }
  }

  return <>{elements}</>;
}

// Format inline markdown (bold, italic)
function formatInline(text: string): JSX.Element {
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining) {
    // Bold **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch) {
      const before = remaining.slice(0, boldMatch.index);
      if (before) parts.push(before);
      parts.push(
        <strong key={key++} className="font-semibold">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice((boldMatch.index || 0) + boldMatch[0].length);
      continue;
    }

    // Italic *text*
    const italicMatch = remaining.match(/\*(.+?)\*/);
    if (italicMatch) {
      const before = remaining.slice(0, italicMatch.index);
      if (before) parts.push(before);
      parts.push(
        <em key={key++} className="italic">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.slice((italicMatch.index || 0) + italicMatch[0].length);
      continue;
    }

    // No more formatting
    parts.push(remaining);
    break;
  }

  return <>{parts}</>;
}
