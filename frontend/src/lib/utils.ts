/**
 * Utility functions
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with conflict resolution
 *
 * Useful for component libraries where you want to allow className overrides
 * while avoiding conflicts between Tailwind classes.
 *
 * Example:
 *   cn('px-2 py-1', 'px-4') // => 'py-1 px-4' (px-4 wins)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format number with commas (always includes commas for thousands)
 */
export function formatNumber(num: number): string {
  if (isNaN(num) || !isFinite(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format number with decimals and commas
 */
export function formatNumberWithDecimals(num: number, decimals: number = 2): string {
  if (isNaN(num) || !isFinite(num)) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Debounce function
 *
 * Delays execution until after wait milliseconds have elapsed
 * since the last time it was invoked.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait) as number;
  };
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage value
 */
export function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

/**
 * Format number in compact notation (1.2K, 3.4M, etc)
 */
export function formatCompactNumber(value: number): string {
  if (isNaN(value) || !isFinite(value)) return '0';
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
}

/**
 * Get date range for X complete calendar months
 * Excludes current incomplete month and ensures full months only
 *
 * Example: If today is Dec 19, 2025 and months=6:
 * Returns: June 2025 - November 2025 (6 complete months)
 */
export function getCompleteMonthsDateRange(months: number): {
  startDate: string;
  endDate: string;
  startMonth: string;
  endMonth: string;
} {
  const now = new Date();

  // Get the last complete month (previous month from current)
  const lastCompleteMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Go back X months from the last complete month to get start month
  const startMonth = new Date(lastCompleteMonth.getFullYear(), lastCompleteMonth.getMonth() - months + 1, 1);

  // End of the last complete month
  const endOfLastMonth = new Date(lastCompleteMonth.getFullYear(), lastCompleteMonth.getMonth() + 1, 0);

  return {
    startDate: startMonth.toISOString().split('T')[0],
    endDate: endOfLastMonth.toISOString().split('T')[0],
    startMonth: startMonth.toISOString().slice(0, 7),
    endMonth: lastCompleteMonth.toISOString().slice(0, 7),
  };
}

/**
 * Filter data to complete months only (excludes current incomplete month and partial months)
 */
export function filterCompleteMonths<T extends { month?: string; order_date?: string }>(
  data: T[],
  targetMonths?: number
): T[] {
  if (!data || data.length === 0) return [];

  if (targetMonths) {
    // Use precise date range filtering
    const { startMonth, endMonth } = getCompleteMonthsDateRange(targetMonths);

    return data.filter((item) => {
      const dateStr = item.month || item.order_date;
      if (!dateStr) return false;

      const itemMonth = dateStr.slice(0, 7);
      return itemMonth >= startMonth && itemMonth <= endMonth;
    });
  }

  // Fallback: just exclude current month
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);

  return data.filter((item) => {
    const dateStr = item.month || item.order_date;
    if (!dateStr) return true;

    const itemMonth = dateStr.slice(0, 7);
    return itemMonth !== currentMonth;
  });
}

/**
 * Get date range label for display
 */
export function getDateRangeLabel(months: string): string {
  const monthsNum = parseInt(months);
  if (monthsNum < 3) return `Last ${monthsNum * 30} days`;
  if (monthsNum >= 12) return `Last ${Math.floor(monthsNum / 12)} ${monthsNum / 12 === 1 ? 'year' : 'years'}`;
  return `Last ${monthsNum} months`;
}
