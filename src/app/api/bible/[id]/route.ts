import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return erpProxy(`/bible/${encodeURIComponent(id)}`);
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: 'The body must be JSON.' }, { status: 400 }); }
  return erpProxy(`/bible/${encodeURIComponent(id)}`, { method: 'POST', body: { title: body?.title, text: body?.text, active: typeof body?.active === 'boolean' ? body.active : undefined } });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return erpProxy(`/bible/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
