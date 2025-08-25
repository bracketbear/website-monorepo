import { ToastProvider } from '@bracketbear/core';

export interface ToastWrapperProps {
  children: React.ReactNode;
}

/**
 * Toast Wrapper
 *
 * Provides toast functionality for the portfolio application.
 * Wraps the app with ToastProvider context.
 */
export function ToastWrapper({ children }: ToastWrapperProps) {
  return (
    <ToastProvider defaultDuration={3000} maxToasts={3}>
      {children}
    </ToastProvider>
  );
}
