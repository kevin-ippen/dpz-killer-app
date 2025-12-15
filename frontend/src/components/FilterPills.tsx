import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface FilterPill {
  key: string;
  label: string;
  value: string;
  isDefault?: boolean;
}

interface FilterPillsProps {
  filters: FilterPill[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
}

export function FilterPills({ filters, onRemove, onClearAll }: FilterPillsProps) {
  // Only show non-default filters
  const activeFilters = filters.filter(f => !f.isDefault);

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap py-2">
      <span className="text-sm text-gray-500 font-medium">Active Filters:</span>
      {activeFilters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
        >
          <span className="text-xs font-medium">
            {filter.label}: <span className="font-semibold">{filter.value}</span>
          </span>
          <button
            onClick={() => onRemove(filter.key)}
            className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
            aria-label={`Remove ${filter.label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {activeFilters.length > 1 && onClearAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="text-xs text-gray-600 hover:text-gray-900 h-7"
        >
          Clear All
        </Button>
      )}
    </div>
  );
}
