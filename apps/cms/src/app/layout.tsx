export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body className="bg-background text-foreground min-h-screen">
        {children}
      </body>
    </html>
  );
}
