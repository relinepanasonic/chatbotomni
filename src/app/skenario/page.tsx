import { redirect } from 'next/navigation';
import { SkenarioApp } from '@/components/SkenarioApp';
import { accessToken, isDemo } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Skenario' };

export default async function SkenarioPage() {
  const demo = isDemo();
  if (!demo && !(await accessToken())) redirect(process.env.ERP_LOGIN_URL || 'https://erp.profesoronline.id/login');
  return <SkenarioApp demo={demo} />;
}
