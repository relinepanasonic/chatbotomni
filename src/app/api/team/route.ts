import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

export async function GET() {
  return erpProxy('/team');
}

/** POST /api/team { people: [{ id, name }] }: save the sales team (BOD only, checked by the ERP). */
export async function POST(request: Request) {
  let b: any = null;
  try { b = await request.json(); } catch { /* no body */ }
  return erpProxy('/team', { method: 'POST', body: { people: Array.isArray(b?.people) ? b.people.map((p: any) => ({ id: String(p?.id ?? ''), name: String(p?.name ?? '') })) : [] } });
}
