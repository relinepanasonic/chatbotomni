import { redirect } from 'next/navigation';
import { StatistikApp } from '@/components/StatistikApp';
import { accessToken, isDemo } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard' };

export default async function StatistikPage() {
  const demo = isDemo();
  if (!demo && !(await accessToken())) redirect(process.env.ERP_LOGIN_URL || 'https://erp.profesoronline.id/login');
  return <StatistikApp demo={demo} />;
}
