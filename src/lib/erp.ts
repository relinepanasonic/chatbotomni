import { NextResponse } from 'next/server';
import { accessToken, isDemo } from './supabase-server';
import { demoHandle } from './demo';

/**
 * Calls the ERP's chat API for the signed-in person (their own access token, never a shared key) and passes the answer on.
 * With DEMO=1 (local only) it answers from made-up chats instead, so the design can be previewed without the ERP.
 */
export async function erpProxy(path: string, init: { method?: 'GET' | 'POST'; body?: unknown } = {}): Promise<NextResponse> {
  const method = init.method || 'GET';
  if (isDemo()) return demoHandle(path, method, init.body);

  const token = await accessToken();
  if (!token) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const base = (process.env.ERP_BASE_URL || 'https://erp.profesoronline.id').replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/v1/chat${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(55000),
    });
    const text = await res.text();
    return new NextResponse(text || null, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'The ERP could not be reached.' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
