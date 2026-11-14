import React from 'react';
import Link from 'next/link';

/** Shared look of the public pages (about, privacy, terms, data deletion): no login needed, readable on a phone. */
export const COMPANY = 'Prof Toko Online';
export const SITE = 'https://chat.profesoronline.id';
export const UPDATED = '14 November 2026';

const NAV = [['/about', 'Tentang'], ['/privacy', 'Kebijakan Privasi'], ['/terms', 'Syarat Layanan'], ['/data-deletion', 'Penghapusan Data']] as const;

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href="/about" className="text-[16px] font-extrabold tracking-tight text-brand-dark">{COMPANY}</Link>
          <nav aria-label="Halaman" className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold text-ink-soft">
            {NAV.map(([href, label]) => <Link key={href} href={href} className="hover:text-brand-dark">{label}</Link>)}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-[26px] font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1 text-[12.5px] text-ink-soft">Terakhir diperbarui: {UPDATED}</p>
        <div className="mt-6 space-y-5 text-[14.5px] leading-relaxed [&_h2]:mt-8 [&_h2]:text-[17px] [&_h2]:font-extrabold [&_li]:ml-5 [&_li]:list-disc [&_li]:py-0.5 [&_p]:text-ink">{children}</div>
      </main>
      <footer className="border-t border-line bg-panel">
        <p className="mx-auto max-w-3xl px-4 py-5 text-[12px] text-ink-soft">{COMPANY}. Halaman ini bisa dibuka tanpa login.</p>
      </footer>
    </div>
  );
}
