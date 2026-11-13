import { redirect } from 'next/navigation';
import { BroadcastApp } from '@/components/BroadcastApp';
import { accessToken, isDemo } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Broadcast' };

export default async function BroadcastPage() {
  const demo = isDemo();
  if (!demo && !(await accessToken())) redirect(process.env.ERP_LOGIN_URL || 'https://erp.profesoronline.id/login');
  return <BroadcastApp demo={demo} />;
}
