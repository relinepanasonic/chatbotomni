'use client';

import { useEffect, useState } from 'react';

/**
 * Makes the dashboard installable: registers the service worker, and offers "Install app" when the phone allows it (Android and desktop Chrome/Edge).
 * On iPhone there is no install button; the card shows the two taps (Share, then Add to Home Screen) instead. Once installed, the button is gone.
 */
type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

export function InstallApp() {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { /* the app works without it */ });
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (standalone) setInstalled(true);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    try { setHidden(localStorage.getItem('install-hidden') === '1'); } catch { /* no storage */ }
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as Prompt); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  if (installed || hidden || (!prompt && !ios)) return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem('install-hidden', '1'); } catch { /* no storage */ } };

  return (
    <div role="region" aria-label="Install the app" className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-xl md:bottom-4 md:right-4 md:left-auto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-extrabold">Install Sales Chat</p>
        <p className="text-[12px] leading-snug text-ink-soft">
          {prompt ? 'Open it like an app, from your home screen.' : 'Tap Share, then "Add to Home Screen".'}
        </p>
      </div>
      {prompt && (
        <button type="button" onClick={async () => { await prompt.prompt(); const c = await prompt.userChoice; if (c.outcome === 'accepted') setInstalled(true); setPrompt(null); }}
          className="shrink-0 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-bold text-white hover:bg-brand-dark">Install</button>
      )}
      <button type="button" onClick={dismiss} aria-label="Not now" className="shrink-0 rounded-lg px-2 py-2 text-[13px] font-bold text-ink-soft hover:text-ink">Not now</button>
    </div>
  );
}
