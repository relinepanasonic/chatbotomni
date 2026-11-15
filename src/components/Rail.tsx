'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMe } from '@/lib/useMe';

/**
 * The navigation, the same order everywhere:
 *   Dashboard, Chat, Jadwal, Pipeline, Broadcast, Sumber Leads, Setting (AI Kamus, and Skenario for the BOD only).
 * Wide screens: a white sidebar with labels. Tablets and small laptops: a narrow rail with short labels. Phones: a bottom bar with the four pages
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

export function Rail({ active }: { active: RailPage }) {
  const me = useMe();
  const settings = SETTINGS.filter((s) => !s.bod || me?.isBod);
  const [open, setOpen] = useState(isSetting(active));
  const [sheet, setSheet] = useState(false);
  useEffect(() => { if (!sheet) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setSheet(false); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [sheet]);
  const moreActive = !PHONE_BAR.includes(active);

  return (
    <>
      {/* ---------------------------------------------------------------- tablets and laptops: a rail; wide screens: a sidebar with labels */}
      <nav aria-label="Main" className="hidden shrink-0 flex-col border-r border-line bg-white md:flex md:w-[76px] xl:w-[224px]">
        <div className="flex items-center gap-2.5 px-4 pb-4 pt-5 md:justify-center xl:justify-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 shrink-0" />
          <span className="hidden text-[14px] font-extrabold leading-tight text-ink xl:block">Prof Toko Online<span className="block text-[11.5px] font-semibold text-ink-soft">Sales chat</span></span>
        </div>
        <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5">
          {MAIN.map((it) => <NavLink key={it.page} it={it} on={it.page === active} />)}
          <li className="mt-1">
            {/* Setting: a group on wide screens; on the rail it opens AI Kamus, where the Setting tabs are */}
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
              className={`hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition xl:flex ${isSetting(active) ? 'text-brand-dark' : 'text-ink-soft hover:bg-brand-softer hover:text-ink'}`}>
              <Svg d={ICON.setting} /><span className="flex-1 text-left">Setting</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {open && (
              <ul className="hidden flex-col gap-0.5 pl-4 xl:flex">
                {settings.map((it) => <NavLink key={it.page} it={it} on={it.page === active} small />)}
              </ul>
            )}
            <Link href="/kamus" aria-current={isSetting(active) ? 'page' : undefined} title="Setting"
              className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10.5px] font-semibold xl:hidden ${isSetting(active) ? 'bg-brand-soft text-brand-dark' : 'text-ink-soft hover:bg-brand-softer hover:text-ink'}`}>
              <Svg d={ICON.setting} /><span>Setting</span>
            </Link>
          </li>
        </ul>
        {me && <p className="hidden truncate border-t border-line px-4 py-3 text-[12px] text-ink-soft xl:block" title={me.role}>{me.name}</p>}
      </nav>

      {/* ---------------------------------------------------------------- phones: a bottom bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
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
      </nav>
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

function NavLink({ it, on, small }: { it: Item; on: boolean; small?: boolean }) {
  return (
    <li>
      <Link href={it.href} aria-current={on ? 'page' : undefined} title={it.label}
        className={`relative flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10.5px] font-semibold transition xl:flex-row xl:gap-3 xl:px-3 xl:py-2.5 xl:text-[13.5px] ${small ? 'xl:py-2' : ''} ${on ? 'bg-brand-soft text-brand-dark' : 'text-ink-soft hover:bg-brand-softer hover:text-ink'}`}>
        {on && <span className="absolute left-0 top-2 hidden h-[calc(100%-1rem)] w-[3px] rounded-r bg-brand xl:block" aria-hidden="true" />}
        <Svg d={it.icon} size={small ? 18 : 20} />
        <span className="xl:hidden">{it.short}</span><span className="hidden xl:inline">{it.label}</span>
      </Link>
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
