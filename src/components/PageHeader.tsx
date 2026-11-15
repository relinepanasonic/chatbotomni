'use client';

import React from 'react';
import Link from 'next/link';
import { useMe } from '@/lib/useMe';

/** The same top of every page: the title, one plain sentence on what the page is for, and the page's own controls on the right. */
export function PageHeader({ title, description, demo, children }: { title: string; description?: React.ReactNode; demo?: boolean; children?: React.ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 max-w-2xl">
        <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight text-ink sm:text-[24px]">
          {title}
          {demo && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[10.5px] font-bold text-warn">Demo</span>}
        </h1>
        {description && <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft sm:text-[14px]">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/** A row of tabs inside a page (one choice at a time). Scrolls sideways on a phone instead of wrapping. */
export function Tabs<T extends string | number>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: Array<[T, string]>; label: string }) {
  return (
    <div className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div role="tablist" aria-label={label} className="inline-flex min-w-max gap-1 rounded-xl bg-[#e6eef7] p-1 text-[13.5px] font-bold">
        {items.map(([v, text]) => (
          <button key={String(v)} type="button" role="tab" aria-selected={value === v} onClick={() => onChange(v)}
            className={`rounded-lg px-3.5 py-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${value === v ? 'bg-white text-brand-dark shadow-sm' : 'text-ink-soft hover:text-ink'}`}>{text}</button>
        ))}
      </div>
    </div>
  );
}

/** The Setting pages: AI Kamus for everyone who may edit the bot, Skenario for the BOD only. */
export function SettingTabs({ active }: { active: 'kamus' | 'skenario' }) {
  const me = useMe();
  const items: Array<{ key: 'kamus' | 'skenario'; href: string; label: string }> = [{ key: 'kamus', href: '/kamus', label: 'AI Kamus' }];
  if (me?.isBod || active === 'skenario') items.push({ key: 'skenario', href: '/skenario', label: 'Skenario' });
  return (
    <nav aria-label="Setting" className="mb-5">
      <div className="inline-flex gap-1 rounded-xl bg-[#e6eef7] p-1 text-[13.5px] font-bold">
        {items.map((it) => (
          <Link key={it.key} href={it.href} aria-current={active === it.key ? 'page' : undefined}
            className={`rounded-lg px-3.5 py-2 transition ${active === it.key ? 'bg-white text-brand-dark shadow-sm' : 'text-ink-soft hover:text-ink'}`}>{it.label}</Link>
        ))}
      </div>
    </nav>
  );
}
