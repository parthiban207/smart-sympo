// agent-notes: { ctx: "Custom hook for debouncing input values with 200ms default delay to eliminate search keystroke lag", deps: ["react"], state: "active", last: "antigravity@2026-09-07" }

import { useState, useEffect } from 'react';

/**
 * Debounces a fast-changing value (e.g. search query input).
 * @param {any} value - Value to debounce
 * @param {number} [delay=200] - Debounce delay in milliseconds
 * @returns {any} Debounced value
 */
export function useDebounce(value, delay = 200) {
  const [debouncedValue, setDebouncedValue] = useState(value);

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

export default useDebounce;
