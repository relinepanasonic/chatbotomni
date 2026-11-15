import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

/** GET /api/me: who is signed in, and whether they are the BOD (Skenario is for the BOD only). */
export async function GET() {
  return erpProxy('/me');
}
