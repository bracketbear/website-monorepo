import { debounce } from '../../utils';
import { useCallback } from 'react';

/**
 * Debounces a function and returns a React callback
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to wait before calling the function
 * @returns A debounced React callback
 */
export function useDebounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T {
  return useCallback(debounce(func, wait), [func, wait]) as T;
}

export default useDebounce;
