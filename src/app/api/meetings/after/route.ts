import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

async function json(request: Request): Promise<any> { try { return await request.json(); } catch { return null; } }

/** POST /api/meetings/after { thanks?, noShow? }: the messages after a consultation (admins only, checked by the ERP). */
export async function POST(request: Request) {
  const b = await json(request);
  return erpProxy('/meetings/after', { method: 'POST', body: { thanks: typeof b?.thanks === 'boolean' ? b.thanks : undefined, noShow: typeof b?.noShow === 'boolean' ? b.noShow : undefined } });
}
