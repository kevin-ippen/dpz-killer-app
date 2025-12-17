/**
 * Chat Page - Embeds Chainlit-powered Genie Spaces chat
 *
 * This page embeds the Chainlit chat app as an iframe, providing
 * seamless access to Genie Spaces within the dashboard.
 *
 * The Chainlit app handles:
 * - Multi-Agent Supervisor (MAS) integration
 * - Genie Spaces routing (5 specialized spaces)
 * - Streaming responses with tool status
 * - Chat history persistence
 * - OBO authentication
 */

import { useEffect, useState } from "react";

// Chainlit app URL (will be running on same host in production)
// In Databricks Apps, both frontend and chat-app are served together
const CHAINLIT_URL = import.meta.env.VITE_CHAINLIT_URL || "/chat";

export function Chat() {
  const [iframeHeight, setIframeHeight] = useState("100%");

  useEffect(() => {
    // Listen for iframe resize messages (optional enhancement)
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "chainlit-resize") {
        setIframeHeight(event.data.height);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col bg-[#FDFAF5]">
      {/* Header - Optional branding */}
      <div className="border-b border-[#F8F3E9] bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-medium tracking-tight text-[#523416]">
              Analytics Assistant
            </h1>
            <p className="text-sm font-light text-[#B59D81]">
              Powered by Databricks Genie Spaces
            </p>
          </div>

          {/* Status indicator (optional) */}
          <div className="flex items-center gap-2 text-sm text-[#B59D81]">
            <span className="h-2 w-2 rounded-full bg-[#2F7FD9] animate-pulse"></span>
            <span className="font-light">Connected</span>
          </div>
        </div>
      </div>

      {/* Chainlit iframe */}
      <div className="relative flex-1 overflow-hidden">
        <iframe
          src={CHAINLIT_URL}
          title="Analytics Chat Assistant"
          className="h-full w-full border-0"
          style={{
            height: iframeHeight,
            minHeight: "100%",
          }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          // Security: Chainlit runs on same origin in Databricks Apps
          // OBO token is passed via x-forwarded-access-token header automatically
        />

        {/* Loading state overlay (optional) */}
        <div
          id="chat-loading"
          className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm"
          style={{ display: "none" }}
        >
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#F8F3E9] border-t-[#2F7FD9]"></div>
            <p className="text-sm font-light text-[#B59D81]">
              Initializing chat assistant...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * DEPLOYMENT NOTES:
 *
 * 1. In local development:
 *    - Run Chainlit separately: cd chat-app && chainlit run app.py --port 8001
 *    - Set VITE_CHAINLIT_URL=http://localhost:8001 in frontend/.env
 *    - Frontend proxy in vite.config.ts will handle CORS
 *
 * 2. In Databricks Apps (production):
 *    - Both apps deployed together via main.py router
 *    - Chainlit mounted at /chat route
 *    - OBO auth handled automatically via x-forwarded-access-token header
 *    - No CORS issues (same origin)
 *
 * 3. Alternative: Side-by-side deployment
 *    - Deploy chat-app as separate Databricks App
 *    - Use full URL: https://<workspace>/apps/<app-id>/
 *    - May require CORS configuration
 */
