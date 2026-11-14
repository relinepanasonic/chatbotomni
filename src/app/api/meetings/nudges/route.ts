import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

async function json(request: Request): Promise<any> { try { return await request.json(); } catch { return null; } }

/** POST /api/meetings/nudges { enabled?, hours? }: the follow-ups for quiet leads (admins only, checked by the ERP). */
export async function POST(request: Request) {
  const b = await json(request);
  return erpProxy('/meetings/nudges', { method: 'POST', body: { enabled: typeof b?.enabled === 'boolean' ? b.enabled : undefined, hours: Array.isArray(b?.hours) ? b.hours.map(Number) : undefined } });
}
