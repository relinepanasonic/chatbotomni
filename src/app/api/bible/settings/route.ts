import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: 'The body must be JSON.' }, { status: 400 }); }
  return erpProxy('/bible/settings', { method: 'POST', body: { enabled: typeof body?.enabled === 'boolean' ? body.enabled : undefined, media_enabled: typeof body?.media_enabled === 'boolean' ? body.media_enabled : undefined, persona_name: body?.persona_name, company_name: body?.company_name, hours_from: body?.hours_from, hours_to: body?.hours_to, max_replies: body?.max_replies, knowledge: typeof body?.knowledge === 'string' ? body.knowledge : undefined } });
}
