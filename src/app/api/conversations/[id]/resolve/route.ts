import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: 'The body must be JSON.' }, { status: 400 }); }
  return erpProxy(`/conversations/${encodeURIComponent(id)}/resolve`, { method: 'POST', body: { resolved: (body as any)?.resolved !== false } });
}
