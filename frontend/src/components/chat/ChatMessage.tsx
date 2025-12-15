import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 p-4",
        isUser ? "bg-white" : "bg-gray-50"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-blue-600" : "bg-gray-900"
        )}
      >
        {isUser ? (
          <User className="h-5 w-5 text-white" />
        ) : (
          <Bot className="h-5 w-5 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {isUser ? "You" : "Analytics Assistant"}
          </span>
          {timestamp && (
            <span className="text-xs text-gray-500">
              {timestamp.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="prose prose-sm max-w-none text-gray-700">
          {content}
        </div>
      </div>
    </div>
  );
}
