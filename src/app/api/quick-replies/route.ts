import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

export async function GET() {
  return erpProxy('/quick-replies');
}

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: 'The body must be JSON.' }, { status: 400 }); }
  return erpProxy('/quick-replies', { method: 'POST', body: { id: body?.id ? String(body.id) : undefined, shortcut: String(body?.shortcut ?? ''), title: String(body?.title ?? ''), body: String(body?.body ?? '') } });
}
