export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#050508', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
