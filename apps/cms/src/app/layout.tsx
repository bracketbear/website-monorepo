import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body className="bg-background text-foreground min-h-screen">
        {children}
      </body>
    </html>
  );
}
