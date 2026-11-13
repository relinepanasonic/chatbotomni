import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

/** Switch an Instagram or Messenger account off or on: { active }. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: 'The body must be JSON.' }, { status: 400 }); }
  return erpProxy(`/channels/${encodeURIComponent(id)}`, { method: 'POST', body: { active: body?.active === true } });
}
