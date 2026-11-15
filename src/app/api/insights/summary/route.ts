import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** POST /api/insights/summary { days, fresh? }: the AI's short summary for the BOD, written from the counts. */
export async function POST(request: Request) {
  let b: any = null;
  try { b = await request.json(); } catch { /* no body */ }
  const d = Number(b?.days);
  return erpProxy('/insights/summary', { method: 'POST', body: { days: [7, 30, 90].includes(d) ? d : 30, fresh: b?.fresh === true } });
}
