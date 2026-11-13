import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return erpProxy(`/flows/${encodeURIComponent(id)}`);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  return erpProxy(`/flows/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
