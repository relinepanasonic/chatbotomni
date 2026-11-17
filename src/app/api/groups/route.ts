import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

/** GET /api/groups: the WhatsApp groups of the sales number and whether Fefe answers in each (BOD only, checked by the ERP). */
export async function GET() {
  return erpProxy('/groups');
}

/** POST /api/groups { id, active }: switch Fefe on or off in one group. */
export async function POST(request: Request) {
  let b: any = null;
  try { b = await request.json(); } catch { return Response.json({ error: 'The body must be JSON.' }, { status: 400 }); }
  return erpProxy('/groups', { method: 'POST', body: { id: String(b?.id ?? ''), active: b?.active === true } });
}
