import { cn } from "@/lib/utils";

/**
 * Base Skeleton component
 * Never show "Loading..." - always use skeletons for perceived performance
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      {...props}
    />
  );
}

/**
 * Table Skeleton - for data tables
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

/**
 * Chart Skeleton - for visualizations
 */
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-48" /> {/* Title */}
      <Skeleton className="w-full" style={{ height: `${height}px` }} />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

/**
 * Metric Card Skeleton - for KPI cards
 */
export function MetricCardSkeleton() {
  return (
    <div className="border rounded-lg p-6 bg-white">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-8 w-24 mb-2" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

/**
 * Chat Message Skeleton - for chat interface
 */
export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}
