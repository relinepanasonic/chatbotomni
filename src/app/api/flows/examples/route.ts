import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

export async function POST() {
  return erpProxy('/flows/examples', { method: 'POST' });
}
