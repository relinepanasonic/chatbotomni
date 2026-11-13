import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * The ERP's login, read here. The ERP puts its session cookie on the shared domain (COOKIE_DOMAIN, for example .profesoronline.id), so a person
 * who is signed in to the ERP is signed in here, with the same account. Nothing is stored by this app.
 */
export async function supabaseServer() {
  const store = await cookies();
  const domain = process.env.COOKIE_DOMAIN || undefined;
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: domain ? { domain, secure: true, sameSite: 'lax', path: '/' } : { sameSite: 'lax', path: '/' },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* a Server Component cannot set cookies: the ERP refreshes them */ } },
    },
  });
}

export const isDemo = () => process.env.DEMO === '1' && process.env.NODE_ENV !== 'production';

/**
 * The signed-in person's access token (the ERP checks it on every call), or null. It is read from the login cookie (refreshed when it has
 * expired) without asking Supabase again: the ERP verifies the token on each call, so a second check here would only add a slow round trip.
 */
export async function accessToken(): Promise<string | null> {
  const supabase = await supabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
