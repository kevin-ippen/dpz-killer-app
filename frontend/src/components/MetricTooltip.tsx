import { ReactNode } from "react";
import { Info } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getGlossaryTerm } from "@/data/businessGlossary";

interface MetricTooltipProps {
  term: string;
  children?: ReactNode;
  showIcon?: boolean;
}

export function MetricTooltip({ term, children, showIcon = true }: MetricTooltipProps) {
  const glossary = getGlossaryTerm(term);

  if (!glossary) {
    // If no glossary entry, just return children without tooltip
    return <>{children || term}</>;
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button
          className="inline-flex items-center gap-1 text-left hover:text-blue-600 transition-colors"
          type="button"
        >
          {children || term}
          {showIcon && <Info className="h-3.5 w-3.5 text-gray-400 hover:text-blue-500" />}
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-96 p-4" side="top">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <span className="text-3xl" role="img" aria-label={glossary.term}>
              {glossary.icon}
            </span>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 text-base">
                {glossary.term}
              </h4>
              <span className="text-xs text-gray-500 capitalize">
                {glossary.category}
              </span>
            </div>
          </div>

          {/* Definition */}
          <p className="text-sm text-gray-700 leading-relaxed">
            {glossary.definition}
          </p>

          {/* Formula */}
          {glossary.formula && (
            <div className="bg-blue-50 border border-blue-100 rounded-md p-2.5">
              <p className="text-xs font-medium text-blue-900 mb-1">Formula:</p>
              <p className="text-sm font-mono text-blue-800">
                {glossary.formula}
              </p>
            </div>
          )}

          {/* Benchmark */}
          {glossary.benchmark && (
            <div className="bg-green-50 border border-green-100 rounded-md p-2.5">
              <p className="text-xs font-medium text-green-900 mb-1">Industry Benchmark:</p>
              <p className="text-xs text-green-800 leading-relaxed">
                {glossary.benchmark}
              </p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Simplified version for inline metric labels
 */
export function MetricLabel({ term, label }: { term: string; label?: string }) {
  return (
    <MetricTooltip term={term} showIcon={true}>
      <span className="font-medium">{label || term}</span>
    </MetricTooltip>
  );
}
