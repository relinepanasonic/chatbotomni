import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return erpProxy(`/reminders?scope=${new URL(request.url).searchParams.get('scope') === 'all' ? 'all' : 'mine'}`);
}
