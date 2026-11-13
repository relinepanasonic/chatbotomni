import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST() {
  return erpProxy('/sources/rescan', { method: 'POST' });
}
