import {
  createContext,
  useContext,
  useCallback,
  useState,
  ReactNode,
} from 'react';
import { Toast } from './Toast';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, options?: Omit<ToastMessage, 'id'>) => void;
  hideToast: (id: string) => void;
  toasts: ToastMessage[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export interface ToastProviderProps {
  children: ReactNode;
  /** Default duration for toasts in milliseconds */
  defaultDuration?: number;
  /** Maximum number of toasts to show at once */
  maxToasts?: number;
}

/**
 * Toast Provider
 *
 * Provides toast functionality throughout the application.
 * Manages multiple toasts with automatic cleanup and positioning.
 */
export function ToastProvider({
  children,
  defaultDuration = 4000,
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, options: Partial<Omit<ToastMessage, 'id'>> = {}) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: ToastMessage = {
        id,
        message,
        type: options.type || 'info',
        duration: options.duration ?? defaultDuration,
      };

      setToasts((prev) => {
        const updated = [newToast, ...prev];
        // Keep only the most recent toasts
        return updated.slice(0, maxToasts);
      });
    },
    [defaultDuration, maxToasts]
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const value: ToastContextType = {
    showToast,
    hideToast,
    toasts,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container - Fixed positioning */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            isVisible={true}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook to use toast functionality
 */
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
