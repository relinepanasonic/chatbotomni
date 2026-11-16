import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

/** POST /api/conversations/<id>/ignore { ignored }: mark the chat "not a lead" (or give it back). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'The body must be JSON.' }, { status: 400 }); }
  return erpProxy(`/conversations/${encodeURIComponent(id)}/ignore`, { method: 'POST', body: { ignored: (body as any)?.ignored !== false } });
}
