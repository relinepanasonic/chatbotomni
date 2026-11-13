import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: 'The body must be JSON.' }, { status: 400 }); }
  return erpProxy(`/conversations/${encodeURIComponent(id)}/send-image`, { method: 'POST', body: { path: String(body?.path ?? ''), caption: String(body?.caption ?? '') } });
}
