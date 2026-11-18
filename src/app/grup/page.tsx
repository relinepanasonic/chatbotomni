import { redirect } from 'next/navigation';
import { GrupApp } from '@/components/GrupApp';
import { accessToken, isDemo } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Grup' };

export default async function GrupPage() {
  const demo = isDemo();
  if (!demo && !(await accessToken())) redirect(process.env.ERP_LOGIN_URL || 'https://erp.profesoronline.id/login');
  return <GrupApp demo={demo} />;
}
