import React, { useState, useEffect } from "react";
import { ChartBlock, TablePreviewData, ChartHydrationPayload } from "@/types/chat";
import { ChartCard } from "./ChartCard";
import { Loader2, AlertCircle } from "lucide-react";

interface FullChartViewProps {
  block: ChartBlock;
}

export function FullChartView({ block }: FullChartViewProps) {
  const [spec, setSpec] = useState<any | null>(block.spec);
  const [tablePreview, setTablePreview] = useState<TablePreviewData | null>(null);
  const [loading, setLoading] = useState(!block.spec && !!block.dataRef);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we already have a spec or no dataRef, nothing to do
    if (!block.dataRef || block.spec) return;

    // Only handle Genie hydration for now
    if (block.dataRef.type !== "genie") return;

    const { genie } = block.dataRef;
    if (!genie) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/genie/chart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(genie),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ detail: "Failed to load chart" }));
          throw new Error(errorData.detail || "Failed to load chart");
        }

        const payload: ChartHydrationPayload = await res.json();

        if (cancelled) return;

        setSpec(payload.spec);
        setTablePreview(payload.table ?? null);
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        console.error("[FullChartView] Hydration error:", err);
        setError(err.message ?? "Error loading chart");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [block]);

  // Loading state
  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 rounded-lg"
        style={{
          background: "rgba(15, 23, 42, 0.96)",
          border: "1px solid rgba(30, 41, 59, 0.9)",
          borderRadius: "var(--radius-lg)",
          minHeight: "400px",
        }}
      >
        <Loader2
          className="h-8 w-8 animate-spin mb-3"
          style={{ color: "var(--color-accent)" }}
        />
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Loading chart from Genie...
        </p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center p-12 rounded-lg"
        style={{
          background: "rgba(15, 23, 42, 0.96)",
          border: "2px solid rgba(239, 68, 68, 0.6)",
          borderRadius: "var(--radius-lg)",
          minHeight: "400px",
        }}
      >
        <AlertCircle className="h-8 w-8 mb-3" style={{ color: "#ef4444" }} />
        <p className="text-sm font-medium mb-1" style={{ color: "#ef4444" }}>
          Couldn't load chart
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {error}
        </p>
      </div>
    );
  }

  // Render the chart
  return (
    <ChartCard
      block={{ ...block, spec }}
      tablePreview={tablePreview}
      loading={false}
      error={null}
    />
  );
}
