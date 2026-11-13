import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

export async function GET() {
  return erpProxy('/flows');
}

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: 'The body must be JSON.' }, { status: 400 }); }
  return erpProxy('/flows', { method: 'POST', body: { id: body?.id ? String(body.id) : undefined, name: body?.name, description: body?.description, active: body?.active === true, graph: body?.graph } });
}
