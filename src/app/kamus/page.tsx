import { redirect } from 'next/navigation';
import { BibleApp } from '@/components/BibleApp';
import { accessToken, isDemo } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'AI Kamus' };

export default async function BiblePage() {
  const demo = isDemo();
  if (!demo && !(await accessToken())) redirect(process.env.ERP_LOGIN_URL || 'https://erp.profesoronline.id/login');
  return <BibleApp demo={demo} erpUrl={process.env.ERP_BASE_URL || 'https://erp.profesoronline.id'} />;
}
