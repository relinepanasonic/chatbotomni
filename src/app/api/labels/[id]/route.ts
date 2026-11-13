import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return erpProxy(`/labels/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
