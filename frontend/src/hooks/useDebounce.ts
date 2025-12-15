/**
 * useDebounce hook
 *
 * Debounces a value by delaying updates until after the specified delay
 * has elapsed since the last change.
 *
 * Useful for search inputs, API calls, and other expensive operations.
 *
 * Example:
 *   const [search, setSearch] = useState('');
 *   const debouncedSearch = useDebounce(search, 500);
 *
 *   useEffect(() => {
 *     // This only runs 500ms after the user stops typing
 *     fetchResults(debouncedSearch);
 *   }, [debouncedSearch]);
 */
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
