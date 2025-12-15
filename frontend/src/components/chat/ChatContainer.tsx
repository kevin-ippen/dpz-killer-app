import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { ChatMessageSkeleton } from "@/components/ui/skeleton";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatContainerProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

export function ChatContainer({
  messages,
  onSendMessage,
  isLoading = false,
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Analytics Assistant
        </h2>
        <p className="text-sm text-gray-600">
          Ask questions about your Domino's data in natural language
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">
                Start a conversation
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Try asking: "What's our revenue this month?" or "Show me top
                performing stores"
              </p>
              <div className="mt-6 grid gap-2">
                <button
                  onClick={() => onSendMessage("What's our total revenue?")}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  What's our total revenue?
                </button>
                <button
                  onClick={() => onSendMessage("Show me top stores by sales")}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Show me top stores by sales
                </button>
                <button
                  onClick={() =>
                    onSendMessage("What are our best selling products?")
                  }
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
                >
                  What are our best selling products?
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} {...message} />
            ))}
            {isLoading && <ChatMessageSkeleton />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <ChatInput onSend={onSendMessage} disabled={isLoading} />
    </div>
  );
}
