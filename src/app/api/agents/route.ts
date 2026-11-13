import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

export async function GET() {
  return erpProxy('/agents');
}
