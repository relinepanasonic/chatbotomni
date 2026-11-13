import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function json(request: Request): Promise<any> { try { return await request.json(); } catch { return null; } }

export async function POST(request: Request) {
  const b = await json(request);
  return erpProxy('/meetings/settings', { method: 'POST', body: { enabled: typeof b?.enabled === 'boolean' ? b.enabled : undefined, days: Array.isArray(b?.days) ? b.days.map(Number) : undefined, from: b?.from, to: b?.to, minutes: b?.minutes, noticeHours: b?.noticeHours, daysAhead: b?.daysAhead } });
}
