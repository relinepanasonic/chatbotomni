import React from 'react';
import Link from 'next/link';

/** The left sidebar: the app's own pages only (nothing leads back to the ERP). */
export type RailPage = 'inbox' | 'kamus' | 'sumber';

const PATHS = {
  inbox: 'M3 13l2.5-7.5A2 2 0 017.4 4h9.2a2 2 0 011.9 1.5L21 13m-18 0v5a2 2 0 002 2h14a2 2 0 002-2v-5m-18 0h5l1 2h6l1-2h5',
  kamus: 'M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2V5zm0 14a2 2 0 002 2h12M9 7h6M9 11h6',
  sumber: 'M3 3v18h18M7 15l4-4 3 3 5-6',
};

const Svg = ({ d, size = 22 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

const ITEMS: Array<{ page: RailPage; href: string; label: string; icon: string }> = [
  { page: 'inbox', href: '/', label: 'Inbox', icon: PATHS.inbox },
  { page: 'kamus', href: '/kamus', label: 'AI Kamus', icon: PATHS.kamus },
  { page: 'sumber', href: '/sumber', label: 'Sumber Lead', icon: PATHS.sumber },
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
