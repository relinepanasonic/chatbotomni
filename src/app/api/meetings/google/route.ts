import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST() { return erpProxy('/meetings/google', { method: 'POST', body: {} }); }
export async function DELETE() { return erpProxy('/meetings/google', { method: 'DELETE' }); }
