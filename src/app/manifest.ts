import type { MetadataRoute } from 'next';

/** The app's install card: name, icons and colours, so the phone can install it as an app (not only a shortcut). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Prof Toko Online: Sales Chat',
    short_name: 'Sales Chat',
    description: 'Chat, Jadwal, Pipeline dan Statistik untuk tim sales Prof Toko Online.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#eef4fb',
    theme_color: '#2f9bf0',
    lang: 'id',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
