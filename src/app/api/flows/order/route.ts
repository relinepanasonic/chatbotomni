import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

/** The order flows are checked in: { ids } first to last. */
export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: 'The body must be JSON.' }, { status: 400 }); }
  return erpProxy('/flows/order', { method: 'POST', body: { ids: Array.isArray(body?.ids) ? body.ids.slice(0, 200).map(String) : [] } });
}
