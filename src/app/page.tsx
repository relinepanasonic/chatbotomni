import { redirect } from 'next/navigation';
import { ChatApp } from '@/components/ChatApp';
import { accessToken, isDemo } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const demo = isDemo();
  // Not signed in to the ERP: go to its login (the login is shared, so coming back here signs you in).
  if (!demo && !(await accessToken())) redirect(process.env.ERP_LOGIN_URL || 'https://erp.profesoronline.id/login');
  return <ChatApp demo={demo} erpUrl={process.env.ERP_BASE_URL || 'https://erp.profesoronline.id'} />;
}
