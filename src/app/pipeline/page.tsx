import { redirect } from 'next/navigation';
import { PipelineApp } from '@/components/PipelineApp';
import { accessToken, isDemo } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pipeline' };

export default async function PipelinePage() {
  const demo = isDemo();
  if (!demo && !(await accessToken())) redirect(process.env.ERP_LOGIN_URL || 'https://erp.profesoronline.id/login');
  return <PipelineApp demo={demo} />;
}
