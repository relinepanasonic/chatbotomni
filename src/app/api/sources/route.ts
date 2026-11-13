import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

export async function GET() {
  return erpProxy('/sources');
}

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: 'The body must be JSON.' }, { status: 400 }); }
  return erpProxy('/sources', { method: 'POST', body: { id: body?.id ? String(body.id) : undefined, name: body?.name, channel: body?.channel, first_message: body?.first_message, active: body?.active } });
}
