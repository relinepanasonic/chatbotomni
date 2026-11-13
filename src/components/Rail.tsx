import React from 'react';
import Link from 'next/link';

/** The left sidebar: the app's own pages only (nothing leads back to the ERP). */
export type RailPage = 'inbox' | 'kamus' | 'sumber' | 'skenario' | 'statistik' | 'jadwal' | 'broadcast';

const PATHS = {
  inbox: 'M3 13l2.5-7.5A2 2 0 017.4 4h9.2a2 2 0 011.9 1.5L21 13m-18 0v5a2 2 0 002 2h14a2 2 0 002-2v-5m-18 0h5l1 2h6l1-2h5',
  kamus: 'M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2V5zm0 14a2 2 0 002 2h12M9 7h6M9 11h6',
  sumber: 'M3 3v18h18M7 15l4-4 3 3 5-6',
  skenario: 'M5 4h5v5H5V4zm9 11h5v5h-5v-5zM10 6.5h2.5A2.5 2.5 0 0115 9v6',
  statistik: 'M4 20V11M10 20V5M16 20v-8M21 20H3',
  jadwal: 'M7 3v3m10-3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zm3 7h3v3H8v-3z',
  broadcast: 'M4 10v4a1 1 0 001 1h2l5 4V5L7 9H5a1 1 0 00-1 1zm12-2a5 5 0 010 8m2.5-10.5a8.5 8.5 0 010 13',
};

const Svg = ({ d, size = 22 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

const ITEMS: Array<{ page: RailPage; href: string; label: string; icon: string }> = [
  { page: 'inbox', href: '/', label: 'Inbox', icon: PATHS.inbox },
  { page: 'kamus', href: '/kamus', label: 'AI Kamus', icon: PATHS.kamus },
  { page: 'sumber', href: '/sumber', label: 'Sumber Lead', icon: PATHS.sumber },
  { page: 'skenario', href: '/skenario', label: 'Skenario', icon: PATHS.skenario },
  { page: 'statistik', href: '/statistik', label: 'Statistik', icon: PATHS.statistik },
  { page: 'jadwal', href: '/jadwal', label: 'Jadwal', icon: PATHS.jadwal },
  { page: 'broadcast', href: '/broadcast', label: 'Broadcast', icon: PATHS.broadcast },
];

export function Rail({ active }: { active: RailPage }) {
  return (
    <nav className="flex w-[68px] shrink-0 flex-col items-center gap-2 bg-gradient-to-b from-[#4aaaf5] to-[#2380d8] py-4 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:h-14 max-md:w-full max-md:flex-row max-md:justify-center max-md:gap-6 max-md:py-0" aria-label="Main">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Professor Online chat" width={46} height={46} className="mb-3 h-[46px] w-[46px] drop-shadow-[0_2px_4px_rgba(10,60,120,0.35)] max-md:hidden" />
      {ITEMS.map((it) => {
        const on = it.page === active;
        return (
          <Link key={it.page} href={it.href} aria-current={on ? 'page' : undefined} title={it.label}
            className={`flex h-11 w-11 flex-col items-center justify-center rounded-xl transition focus-visible:outline-2 focus-visible:outline-white max-md:h-12 max-md:w-16 ${on ? 'bg-white/25 text-white' : 'text-white/80 hover:bg-white/15 hover:text-white'}`}>
            <Svg d={it.icon} />
            <span className="mt-0.5 hidden text-[9px] font-bold max-md:block">{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
