import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const u = new URL(request.url);
  const qs = new URLSearchParams();
  for (const k of ['filter', 'q']) { const v = u.searchParams.get(k); if (v) qs.set(k, v.slice(0, 80)); }
  return erpProxy(`/conversations${qs.size ? `?${qs}` : ''}`);
}
