import { redirect } from 'next/navigation';
import { SumberApp } from '@/components/SumberApp';
import { accessToken, isDemo } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sumber Lead' };

export default async function SumberPage() {
  const demo = isDemo();
  if (!demo && !(await accessToken())) redirect(process.env.ERP_LOGIN_URL || 'https://erp.profesoronline.id/login');
  return <SumberApp demo={demo} />;
}
