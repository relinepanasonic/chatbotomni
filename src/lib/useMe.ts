'use client';

import { useEffect, useState } from 'react';

/** Who is signed in, and whether they are the BOD (founder or superadmin). Loaded once per page visit and shared by every component. */
export interface Me { id: string; name: string; role: string; isBod: boolean }

let cached: Me | null = null;
let pending: Promise<Me | null> | null = null;

function loadMe(): Promise<Me | null> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = fetch('/api/me', { cache: 'no-store' })
      .then(async (r) => (r.ok ? ((await r.json()) as Me) : null))
      .catch(() => null)
      .then((m) => { cached = m; if (!m) pending = null; return m; });
  }
  return pending;
}

/** null while loading (and when it could not be read). */
export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(cached);
  useEffect(() => { let live = true; void loadMe().then((m) => { if (live) setMe(m); }); return () => { live = false; }; }, []);
  return me;
}
