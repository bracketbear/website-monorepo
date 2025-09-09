/**
 * Global type declarations for the portfolio app
 */

declare global {
  interface Window {
    sections?: Array<{
      id: string;
      title: string;
      eyebrow?: string;
    }>;
  }
}

export {};
