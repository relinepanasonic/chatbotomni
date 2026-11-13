import { redirect } from 'next/navigation';
import { JadwalApp } from '@/components/JadwalApp';
import { accessToken, isDemo } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Jadwal' };

export default async function JadwalPage() {
  const demo = isDemo();
  if (!demo && !(await accessToken())) redirect(process.env.ERP_LOGIN_URL || 'https://erp.profesoronline.id/login');
  return <JadwalApp demo={demo} />;
}
