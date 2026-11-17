import type { Metadata, Viewport } from 'next';
import './globals.css';
import { InstallApp } from '@/components/InstallApp';

export const metadata: Metadata = {
  title: 'Chat',
  description: 'Chat, Jadwal, Pipeline dan Statistik untuk tim sales Prof Toko Online.',
  appleWebApp: { capable: true, title: 'Sales Chat', statusBarStyle: 'default' },
  // the tab icon is our logo (a page without an icon link shows the browser's globe)
  icons: {
    icon: [{ url: '/favicon.ico', sizes: 'any' }, { url: '/favicon.png?v=2', type: 'image/png', sizes: '64x64' }, { url: '/icon-192.png?v=2', type: 'image/png', sizes: '192x192' }],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#2f9bf0' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}
        <InstallApp />
      </body>
    </html>
  );
}
