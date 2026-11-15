'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { BcSettings, BroadcastItem, BroadcastsResponse } from '@/lib/types';
import { preview, splitVariants } from '@/lib/broadcast';
import { PageHeader } from './PageHeader';
import { Rail } from './Rail';

/**
 * Broadcast: one push queues a WhatsApp message to every past lead; the clock then sends them ONE BY ONE, with a random pause, only inside the time
 * window, and never more than the daily maximum, so the sales number is not blocked. Instagram and Messenger never get broadcasts (Meta's rule).
 */
async function api<T>(path: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api${path}`, { cache: 'no-store', ...init, headers: init?.body ? { 'Content-Type': 'application/json' } : undefined });
    const body = await res.json().catch(() => null);
    return res.ok ? { ok: true, data: body as T } : { ok: false, error: String(body?.error || (res.status === 401 ? 'Please sign in again.' : res.status === 403 ? 'Only admins can change this.' : 'Something went wrong.')) };
  } catch { return { ok: false, error: 'No connection.' }; }
}

const TZ = 'Asia/Jakarta';
const when = (iso: string) => new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
const STATUS: Record<BroadcastItem['status'], { label: string; cls: string }> = {
  running: { label: 'Sending', cls: 'bg-brand-soft text-brand-dark' }, paused: { label: 'Paused', cls: 'bg-warn-soft text-warn' },
  done: { label: 'Finished', cls: 'bg-ok-soft text-ok' }, cancelled: { label: 'Cancelled', cls: 'bg-[#eef2f6] text-ink-soft' },
};
const field = 'w-full rounded-lg border border-line bg-brand-softer px-3 py-2 text-[13px] outline-none focus:border-brand focus:bg-white';
const btnPrimary = 'rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50';
const btnGhost = 'rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold text-ink-soft transition hover:border-brand hover:text-brand-dark disabled:opacity-50';

export function BroadcastApp({ demo }: { demo: boolean }) {
  const [d, setD] = useState<BroadcastsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const load = useCallback(async () => { const r = await api<BroadcastsResponse>('/broadcasts'); if (r.ok) { setD(r.data); setError(null); } else setError(r.error); }, []);
  useEffect(() => { void load(); const t = setInterval(() => void load(), 30000); return () => clearInterval(t); }, [load]);

  const act = async (b: BroadcastItem, action: 'pause' | 'resume' | 'cancel') => {
    if (action === 'cancel' && !confirm(`Cancel "${b.name}"? The ${b.left} messages not sent yet will not go out.`)) return;
    const r = await api<{ ok: true }>(`/broadcasts/${encodeURIComponent(b.id)}`, { method: 'POST', body: JSON.stringify({ action }) });
    if (!r.ok) setNotice({ kind: 'error', text: r.error }); else await load();
  };
  const active = d?.broadcasts.find((b) => b.status === 'running' || b.status === 'paused');

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg text-ink max-md:pb-16">
      <Rail active="broadcast" />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <PageHeader title="Broadcast" demo={demo} description="Send one message to past WhatsApp leads, slowly and safely: one by one, only in sending hours, never more than the daily maximum." />
          {notice && <p role="alert" className={`mb-4 rounded-xl px-4 py-2.5 text-[13px] ${notice.kind === 'error' ? 'bg-bad-soft text-bad' : 'bg-ok-soft text-ok'}`}>{notice.text}</p>}
          {error && !d && <div className="rounded-xl bg-white p-6 text-center text-[13px]"><p className="text-bad">{error}</p><button onClick={() => void load()} className={`${btnPrimary} mt-3`}>Try again</button></div>}
          {!d && !error && <p className="p-6 text-center text-[13px] text-ink-soft">Loading...</p>}

          {d && (
            <div className="space-y-5">
              {d.broadcasts.length > 0 && (
                <section aria-label="Broadcasts" className="space-y-3">
                  {d.broadcasts.map((b) => {
                    const done = b.sent + b.failed + b.skipped;
                    const pct = b.total ? Math.round((done / b.total) * 100) : 0;
                    return (
                      <article key={b.id} className="rounded-2xl border border-line bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="flex items-center gap-2 text-[14.5px] font-extrabold">{b.name}<span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${STATUS[b.status].cls}`}>{STATUS[b.status].label}</span></h2>
                            <p className="mt-0.5 text-[12px] text-ink-soft">{b.sent} of {b.total} sent{b.failed ? `, ${b.failed} failed` : ''}{b.skipped ? `, ${b.skipped} skipped` : ''}. Started {when(b.created_at)}{b.created_by ? ` by ${b.created_by}` : ''}.</p>
                          </div>
                          {d.canEdit && (
                            <div className="flex gap-1.5">
                              {b.status === 'running' && <button className={btnGhost} onClick={() => void act(b, 'pause')}>Pause</button>}
                              {b.status === 'paused' && <button className={btnGhost} onClick={() => void act(b, 'resume')}>Continue</button>}
                              {(b.status === 'running' || b.status === 'paused') && <button className={`${btnGhost} hover:!border-bad hover:!text-bad`} onClick={() => void act(b, 'cancel')}>Cancel</button>}
                            </div>
                          )}
                        </div>
                        <div className="mt-3 h-2.5 rounded-full bg-[#eef3f8]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% done`}><div className="h-2.5 rounded-full bg-brand" style={{ width: `${pct}%` }} /></div>
                        {b.status === 'running' && b.left > 0 && <p className="mt-2 text-[12px] text-ink-soft">Next message around {when(b.next_send_at)}. {b.left} left.</p>}
                        {b.status === 'paused' && b.paused_reason && <p className="mt-2 rounded-lg bg-warn-soft px-3 py-1.5 text-[12px] text-[#7a4f06]">{b.paused_reason}</p>}
                      </article>
                    );
                  })}
                </section>
              )}
              {d.canEdit && <NewBroadcast d={d} blocked={!!active} say={setNotice} reload={load} />}
              <PaceCard initial={d.settings} sentToday={d.sentToday} canEdit={d.canEdit} say={setNotice} reload={load} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NewBroadcast({ d, blocked, say, reload }: { d: BroadcastsResponse; blocked: boolean; say: (n: { kind: 'ok' | 'error'; text: string }) => void; reload: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(0);
  const variants = splitVariants(message);
  const start = async () => {
    if (!confirm(`Queue "${name}" for ${d.audience.count} past leads? It is sent slowly: about ${d.audience.days} day${d.audience.days === 1 ? '' : 's'} at your limits. You can pause or cancel any time.`)) return;
    setBusy(true);
    const r = await api<{ ok: true; total: number; days: number }>('/broadcasts', { method: 'POST', body: JSON.stringify({ name, message }) });
    setBusy(false);
    if (!r.ok) { say({ kind: 'error', text: r.error }); return; }
    say({ kind: 'ok', text: `Queued for ${r.data.total} leads. The first message goes out at the next sending time.` });
    setName(''); setMessage(''); await reload();
  };
  return (
    <section aria-label="New broadcast" className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-[15px] font-extrabold">New broadcast</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">Goes to <b>{d.audience.count}</b> past WhatsApp leads{d.audience.optedOut ? ` (${d.audience.optedOut} who said STOP are left out)` : ''}. At your limits that takes about <b>{d.audience.days || 0} day{d.audience.days === 1 ? '' : 's'}</b>.</p>
      {blocked && <p className="mt-2 rounded-lg bg-warn-soft px-3 py-1.5 text-[12px] text-[#7a4f06]">Another broadcast is still sending or paused. Finish or cancel it first, so the daily maximum keeps protecting the number.</p>}
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-[12px] font-semibold text-ink-soft">Name (only for the team)<input className={`${field} mt-1`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Promo konsultasi November" /></label>
          <label className="block text-[12px] font-semibold text-ink-soft">Message
            <textarea className={`${field} mt-1 h-48 resize-y`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={'Hi kak {nama}, ...\n---\nHalo kak {nama}, ...'} />
          </label>
          <p className="text-[11.5px] text-ink-soft"><b>{'{nama}'}</b> becomes the lead&apos;s first name. Write 2 or 3 different wordings separated by a line with <b>---</b>: they are rotated, so not every message is identical, which also helps against blocking. The STOP line is added at the end automatically.</p>
        </div>
        <div>
          <div className="flex items-center justify-between text-[12px] font-semibold text-ink-soft"><span>What a lead sees</span>
            {variants.length > 1 && <span className="flex gap-1">{variants.map((_, i) => <button key={i} onClick={() => setShow(i)} aria-pressed={show === i} className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${show === i ? 'bg-brand text-white' : 'bg-brand-soft text-brand-dark'}`}>{i + 1}</button>)}</span>}
          </div>
          <div className="mt-1 min-h-48 rounded-xl bg-[#e9f2fb] p-3">
            {message.trim() ? <p className="ml-auto max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-white px-3 py-2 text-[13px] shadow-[0_1px_2px_rgba(23,49,77,0.08)]">{preview(message, show, 'Budi Santoso')}</p> : <p className="text-center text-[12px] text-ink-soft">Type the message to see it here.</p>}
          </div>
          <button className={`${btnPrimary} mt-3 w-full`} disabled={busy || blocked || !name.trim() || !variants.length || !d.audience.count} onClick={() => void start()}>{busy ? 'Queueing...' : `Queue for ${d.audience.count} leads`}</button>
        </div>
      </div>
    </section>
  );
}

function PaceCard({ initial, sentToday, canEdit, say, reload }: { initial: BcSettings; sentToday: number; canEdit: boolean; say: (n: { kind: 'ok' | 'error'; text: string }) => void; reload: () => Promise<void> }) {
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    const r = await api<{ ok: true }>('/broadcasts/settings', { method: 'POST', body: JSON.stringify(s) });
    setBusy(false);
    say(r.ok ? { kind: 'ok', text: 'Saved. The next message follows the new pace.' } : { kind: 'error', text: r.error });
    if (r.ok) await reload();
  };
  return (
    <section aria-label="Sending pace" className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-extrabold">Sending pace</h2>
        <span className="text-[12.5px] text-ink-soft">Today: <b className="text-ink">{sentToday}</b> of {initial.dailyMax} sent</span>
      </div>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">What protects the number. A new number should start low (20 to 40 a day) and go up slowly over the weeks.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-5">
        <label className="text-[12px] font-semibold text-ink-soft">Daily maximum<input type="number" min={1} max={300} className={`${field} mt-1`} value={s.dailyMax} disabled={!canEdit} onChange={(e) => setS({ ...s, dailyMax: Number(e.target.value) })} /></label>
        <label className="text-[12px] font-semibold text-ink-soft">Send from<input className={`${field} mt-1`} value={s.from} disabled={!canEdit} onChange={(e) => setS({ ...s, from: e.target.value })} placeholder="09:00" /></label>
        <label className="text-[12px] font-semibold text-ink-soft">Until<input className={`${field} mt-1`} value={s.to} disabled={!canEdit} onChange={(e) => setS({ ...s, to: e.target.value })} placeholder="19:00" /></label>
        <label className="text-[12px] font-semibold text-ink-soft">Pause at least (sec)<input type="number" min={30} className={`${field} mt-1`} value={s.gapMin} disabled={!canEdit} onChange={(e) => setS({ ...s, gapMin: Number(e.target.value) })} /></label>
        <label className="text-[12px] font-semibold text-ink-soft">Pause at most (sec)<input type="number" min={30} className={`${field} mt-1`} value={s.gapMax} disabled={!canEdit} onChange={(e) => setS({ ...s, gapMax: Number(e.target.value) })} /></label>
      </div>
      {canEdit && <button className={`${btnPrimary} mt-4`} disabled={busy} onClick={() => void save()}>{busy ? 'Saving...' : 'Save pace'}</button>}
    </section>
  );
}
