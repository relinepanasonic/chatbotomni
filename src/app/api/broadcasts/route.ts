import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function json(request: Request): Promise<any> { try { return await request.json(); } catch { return null; } }

export async function GET() { return erpProxy('/broadcasts'); }
export async function POST(request: Request) {
  const b = await json(request);
  return erpProxy('/broadcasts', { method: 'POST', body: { name: String(b?.name ?? ''), message: String(b?.message ?? '') } });
}
