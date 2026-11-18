import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

/** GET /api/groups/<id>/log: what Fefe saw and said in one group (BOD only, checked by the ERP). */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return erpProxy(`/groups/${encodeURIComponent(id)}/log`);
}
