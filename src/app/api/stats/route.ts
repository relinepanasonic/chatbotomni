import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const d = Number(new URL(request.url).searchParams.get('days'));
  return erpProxy(`/stats?days=${[7, 30, 90].includes(d) ? d : 30}`);
}
