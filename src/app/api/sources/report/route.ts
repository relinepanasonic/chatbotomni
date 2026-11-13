import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const days = Math.round(Number(new URL(request.url).searchParams.get('days') || 30));
  return erpProxy(`/sources/report?days=${Number.isFinite(days) && days > 0 ? Math.min(days, 365) : 30}`);
}
