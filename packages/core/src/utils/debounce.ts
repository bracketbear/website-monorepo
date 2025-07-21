/**
 * Debounce a function
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to wait before calling the function
 * @returns A debounced function
 */
export const debounce = (func: (...args: any[]) => void, wait: number) => {
  let timeout: NodeJS.Timeout;

  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
