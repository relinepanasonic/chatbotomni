import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return Response.json({ error: 'The body must be JSON.' }, { status: 400 }); }
  return erpProxy('/bible/ingest', { method: 'POST', body: { path: String(body?.path ?? ''), title: String(body?.title ?? ''), replaces: body?.replaces ? String(body.replaces) : null } });
}
