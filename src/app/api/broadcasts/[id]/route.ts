import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function json(request: Request): Promise<any> { try { return await request.json(); } catch { return null; } }

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const b = await json(request);
  return erpProxy(`/broadcasts/${encodeURIComponent(id)}`, { method: 'POST', body: { action: String(b?.action ?? '') } });
}
