import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() { return erpProxy('/meetings/slots'); }
