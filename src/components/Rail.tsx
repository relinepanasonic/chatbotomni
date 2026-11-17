'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMe } from '@/lib/useMe';

/**
 * The navigation, the same order everywhere:
 *   Dashboard, Chat, Jadwal, Pipeline, Broadcast, Sumber Leads, Setting (AI Kamus, and Skenario for the BOD only).
 * Laptops and tablets: the narrow light blue bar with icons only; the name of an icon shows when the mouse is on it. Phones: a bottom bar with the four pages
 * used every day and "Lainnya" for the rest.
 */
export type RailPage = 'statistik' | 'inbox' | 'jadwal' | 'pipeline' | 'broadcast' | 'sumber' | 'kamus' | 'skenario';

const ICON = {
  statistik: 'M4 4h7v7H4V4zm9 0h7v4h-7V4zm0 6h7v10h-7V10zM4 13h7v7H4v-7z',
  inbox: 'M20 11.5a8 8 0 01-11.7 7.1L4 20l1.3-4A8 8 0 1120 11.5zM8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01',
  jadwal: 'M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zm3 7h3v3H8v-3z',
  pipeline: 'M4 4h4v16H4V4zm6 0h4v10h-4V4zm6 0h4v6h-4V4z',
  broadcast: 'M4 10v4a1 1 0 001 1h2l5 4V5L7 9H5a1 1 0 00-1 1zm12-2a5 5 0 010 8m2.5-10.5a8.5 8.5 0 010 13',
  sumber: 'M12 21a9 9 0 100-18 9 9 0 000 18zm0-4a5 5 0 100-10 5 5 0 000 10zm0-4a1 1 0 100-2 1 1 0 000 2z',
  setting: 'M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3c0-.4 0-.8-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 00-2-1.2L14.5 3h-4l-.4 2.6a7.6 7.6 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 000 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 002 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  kamus: 'M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2V5zm0 14a2 2 0 002 2h12M9 7h6M9 11h6',
  skenario: 'M5 4h5v5H5V4zm9 11h5v5h-5v-5zM10 6.5h2.5A2.5 2.5 0 0115 9v6',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
};

const Svg = ({ d, size = 20, bold }: { d: string; size?: number; bold?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={bold ? 3 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

interface Item { page: RailPage; href: string; label: string; short: string; icon: string }
const MAIN: Item[] = [
  { page: 'statistik', href: '/statistik', label: 'Dashboard', short: 'Dashboard', icon: ICON.statistik },
  { page: 'inbox', href: '/', label: 'Chat', short: 'Chat', icon: ICON.inbox },
  { page: 'jadwal', href: '/jadwal', label: 'Jadwal', short: 'Jadwal', icon: ICON.jadwal },
  { page: 'pipeline', href: '/pipeline', label: 'Pipeline', short: 'Pipeline', icon: ICON.pipeline },
  { page: 'broadcast', href: '/broadcast', label: 'Broadcast', short: 'Broadcast', icon: ICON.broadcast },
  { page: 'sumber', href: '/sumber', label: 'Sumber Leads', short: 'Sumber', icon: ICON.sumber },
];
const SETTINGS: Array<Item & { bod?: boolean }> = [
  { page: 'kamus', href: '/kamus', label: 'AI Kamus', short: 'AI Kamus', icon: ICON.kamus },
  { page: 'skenario', href: '/skenario', label: 'Skenario', short: 'Skenario', icon: ICON.skenario, bod: true },
];
const isSetting = (p: RailPage) => p === 'kamus' || p === 'skenario';
/** On a phone the bottom bar has the four everyday pages; the rest is under Lainnya. */
const PHONE_BAR: RailPage[] = ['statistik', 'inbox', 'jadwal', 'pipeline'];

export function Rail({ active, phoneBar = true }: { active: RailPage; phoneBar?: boolean }) {
  const me = useMe();
  const settings = SETTINGS.filter((s) => !s.bod || me?.isBod);
  const [sheet, setSheet] = useState(false);
  useEffect(() => { if (!sheet) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(false); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [sheet]);
  const moreActive = !PHONE_BAR.includes(active);

  return (
    <>
      {/* ---------------------------------------------------------------- tablets and laptops: a narrow light blue bar with icons; the name shows when the mouse is on the icon */}
      <nav aria-label="Main" className="hidden w-[68px] shrink-0 flex-col items-center gap-2 bg-gradient-to-b from-[#4aaaf5] to-[#2380d8] py-4 md:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Prof Toko Online" width={46} height={46} className="mb-3 h-[46px] w-[46px] drop-shadow-[0_2px_4px_rgba(10,60,120,0.35)]" />
        <ul className="flex flex-col items-center gap-2">
          {MAIN.map((it) => <NavLink key={it.page} it={it} on={it.page === active} />)}
          <li className="group relative">
            {/* Setting: AI Kamus, and Skenario for the BOD. The two names open beside the icon on hover, on focus and on touch. */}
            <button type="button" aria-haspopup="menu" aria-label="Setting" aria-current={isSetting(active) ? 'page' : undefined}
              className={`flex h-11 w-11 items-center justify-center rounded-xl transition focus-visible:outline-2 focus-visible:outline-white ${isSetting(active) ? 'bg-white/25 text-white' : 'text-white/80 hover:bg-white/15 hover:text-white'}`}>
              <Svg d={ICON.setting} size={22} />
            </button>
            <div role="menu" className="invisible absolute left-full top-0 z-50 pl-3 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="min-w-[150px] rounded-xl bg-[#0b2a4a] p-1.5 shadow-xl">
                <p className="px-2.5 pb-1 pt-1 text-[11px] font-bold text-white/60">Setting</p>
                {settings.map((it) => (
                  <Link key={it.page} href={it.href} role="menuitem" aria-current={it.page === active ? 'page' : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold ${it.page === active ? 'bg-white/20 text-white' : 'text-white/90 hover:bg-white/15'}`}>
                    <Svg d={it.icon} size={18} />{it.label}
                  </Link>
                ))}
              </div>
            </div>
          </li>
        </ul>
      </nav>

      {/* ---------------------------------------------------------------- phones: a bottom bar */}
      {phoneBar && <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid h-16 grid-cols-5">
          {MAIN.filter((it) => PHONE_BAR.includes(it.page)).map((it) => (
            <li key={it.page}>
              <Link href={it.href} aria-current={it.page === active ? 'page' : undefined} className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${it.page === active ? 'text-brand-dark' : 'text-ink-soft'}`}>
                <span className={`flex h-7 w-12 items-center justify-center rounded-full ${it.page === active ? 'bg-brand-soft' : ''}`}><Svg d={it.icon} /></span>{it.short}
              </Link>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => setSheet(true)} aria-haspopup="dialog" aria-expanded={sheet} className={`flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold ${moreActive ? 'text-brand-dark' : 'text-ink-soft'}`}>
              <span className={`flex h-7 w-12 items-center justify-center rounded-full ${moreActive ? 'bg-brand-soft' : ''}`}><Svg d={ICON.more} bold /></span>Lainnya
            </button>
          </li>
        </ul>
      </nav>}
      {sheet && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="More pages">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-[#0b2a4a]/30" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" aria-hidden="true" />
            <ul className="space-y-1">
              {MAIN.filter((it) => !PHONE_BAR.includes(it.page)).map((it) => <SheetLink key={it.page} it={it} on={it.page === active} />)}
            </ul>
            <p className="mb-1 mt-4 px-3 text-[12px] font-bold text-ink-soft">Setting</p>
            <ul className="space-y-1">
              {settings.map((it) => <SheetLink key={it.page} it={it} on={it.page === active} />)}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({ it, on }: { it: Item; on: boolean }) {
  return (
    <li className="group relative">
      <Link href={it.href} aria-current={on ? 'page' : undefined} aria-label={it.label}
        className={`flex h-11 w-11 items-center justify-center rounded-xl transition focus-visible:outline-2 focus-visible:outline-white ${on ? 'bg-white/25 text-white' : 'text-white/80 hover:bg-white/15 hover:text-white'}`}>
        <Svg d={it.icon} size={22} />
      </Link>
      <span role="tooltip" className="pointer-events-none invisible absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#0b2a4a] px-2.5 py-1.5 text-[12.5px] font-semibold text-white opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">{it.label}</span>
    </li>
  );
}

function SheetLink({ it, on }: { it: Item; on: boolean }) {
  return (
    <li>
      <Link href={it.href} aria-current={on ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-semibold ${on ? 'bg-brand-soft text-brand-dark' : 'text-ink'}`}>
        <Svg d={it.icon} />{it.label}
      </Link>
    </li>
  );
}
