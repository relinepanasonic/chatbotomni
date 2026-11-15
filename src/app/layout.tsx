import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'Chat', description: 'Sales chat inbox and bot control' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#2f9bf0' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
