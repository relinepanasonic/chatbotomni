import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The page used to be called /bible: old links and bookmarks still work.
  async redirects() { return [{ source: '/bible', destination: '/kamus', permanent: true }]; },
};

export default nextConfig;
