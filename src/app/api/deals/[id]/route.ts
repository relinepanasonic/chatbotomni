import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

/** GET /api/deals/<id>: the lead's details for the edit form. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return erpProxy(`/deals/${encodeURIComponent(id)}`);
}

/** PATCH /api/deals/<id> { name, store, pic, phone, address, notes, value, title }: edit the lead (the ERP checks who may). */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let b: any = null;
  try { b = await request.json(); } catch { return Response.json({ error: 'The body must be JSON.' }, { status: 400 }); }
  const s = (v: unknown) => String(v ?? '');
  return erpProxy(`/deals/${encodeURIComponent(id)}`, { method: 'PATCH', body: { name: s(b?.name), store: s(b?.store), pic: s(b?.pic), phone: s(b?.phone), address: s(b?.address), notes: s(b?.notes), value: s(b?.value), title: s(b?.title) } });
}

/** DELETE /api/deals/<id>: delete the lead (never one with an invoice, a request or a project: the ERP refuses). */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return erpProxy(`/deals/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
