import { erpProxy } from '@/lib/erp';

export const dynamic = 'force-dynamic';

/** The connected chat accounts (WhatsApp, Instagram, Messenger), and which Meta settings the ERP has. */
export async function GET() {
  return erpProxy('/channels');
}

/** Connect the Facebook Page and its Instagram account. */
export async function POST() {
  return erpProxy('/channels', { method: 'POST', body: {} });
}
