import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  void request;
  return erpProxy(`/conversations/${encodeURIComponent(id)}/suggest`, { method: 'POST' });
}
