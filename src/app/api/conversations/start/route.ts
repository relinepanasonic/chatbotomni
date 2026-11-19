import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** POST /api/conversations/start { phone, text }: the first message to a number, from the sales number; the chat is made and kept (the ERP checks the limit). */
export async function POST(request: Request) {
  let b: any = null;
  try { b = await request.json(); } catch { return Response.json({ error: 'The body must be JSON.' }, { status: 400 }); }
  return erpProxy('/conversations/start', { method: 'POST', body: { phone: String(b?.phone ?? ''), text: String(b?.text ?? '') } });
}
