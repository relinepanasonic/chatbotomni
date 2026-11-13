'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { channelLabel, type Stats } from '@/lib/types';
import { durLabel, rpShort } from '@/lib/format';
import { Rail } from './Rail';

/**
 * Statistik: how the sales chat is doing. Reply times (bot vs people), what the bot does, each salesperson, and how chats turn into leads and sales
 * per channel. Charts are plain HTML (no library): one series per chart, a tooltip on every bar, and the numbers also as a table.
 */

type Metric = 'newChats' | 'leadMessages' | 'replies';
const METRICS: Array<{ key: Metric; label: string }> = [{ key: 'newChats', label: 'New chats' }, { key: 'leadMessages', label: 'Messages from leads' }, { key: 'replies', label: 'Our replies' }];
// The funnel stages are ordered, so they are one hue stepping darker (sequential), not three different colours.
const FUNNEL = [{ key: 'chats', label: 'Chats', color: '#a9d4f7' }, { key: 'leads', label: 'Became a lead', color: '#4ea9ef' }, { key: 'won', label: 'Won', color: '#1268b8' }] as const;

async function load(days: number): Promise<{ ok: true; data: Stats } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/stats?days=${days}`, { cache: 'no-store' });
    const j = await res.json().catch(() => null);
    return res.ok ? { ok: true, data: j as Stats } : { ok: false, error: String(j?.error || (res.status === 401 ? 'Please sign in again.' : 'Could not load the numbers.')) };
  } catch { return { ok: false, error: 'No connection.' }; }
}

const pct = (x: number | null) => (x === null ? '-' : `${Math.round(x * 100)}%`);
const dayShort = (iso: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));

export function StatistikApp({ demo }: { demo: boolean }) {
  const [days, setDays] = useState(30);
  const [s, setS] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    const r = await load(days);
    setBusy(false);
    if (!r.ok) setError(r.error); else { setError(null); setS(r.data); }
  }, [days]);
  useEffect(() => { void run(); }, [run]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg text-ink max-md:pb-14">
      <Rail active="statistik" />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight">Statistik {demo && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-bold text-warn">DEMO</span>}</h1>
              <p className="mt-1 text-[13.5px] text-ink-soft">How fast leads get an answer, what the bot handles, and how chats turn into sales.</p>
            </div>
            <div className="flex rounded-xl bg-[#e3edf7] p-1 text-[13px] font-bold" role="radiogroup" aria-label="Period">
              {[7, 30, 90].map((d) => (
                <button key={d} role="radio" aria-checked={days === d} onClick={() => setDays(d)} className={`rounded-lg px-3 py-1.5 transition ${days === d ? 'bg-white text-brand-dark shadow-sm' : 'text-ink-soft hover:text-ink'}`}>Last {d} days</button>
              ))}
            </div>
          </header>

          {error && !s && <div className="rounded-xl bg-white p-6 text-center text-[13px]"><p className="text-bad">{error}</p><button onClick={() => void run()} className="mt-3 rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-dark">Try again</button></div>}
          {!s && !error && <p className="p-6 text-center text-[13px] text-ink-soft">Counting...</p>}

          {s && (
            <div className={`space-y-5 transition-opacity ${busy ? 'opacity-60' : ''}`}>
              <NowStrip s={s} />
              <Tiles s={s} />
              <Daily s={s} />
              <div className="grid gap-5 lg:grid-cols-2">
                <BotCard s={s} />
                <FunnelCard s={s} />
              </div>
              <People s={s} />
              <p className="text-[12px] text-ink-soft">Reply time runs from a lead&apos;s first unanswered message to our next message, nights included. Replies typed on the phone are not captured by WhatsApp, so only replies from the bot, flows and this dashboard count.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ right now (status: always with words) */
function NowStrip({ s }: { s: Stats }) {
  const items = [
    { label: 'Waiting for an answer', value: String(s.now.waiting), tone: s.now.waiting > 0 ? 'warn' : 'ok', note: s.now.waiting > 0 ? 'Open the Unserved tab' : 'Nobody is waiting' },
    { label: 'Longest wait now', value: durLabel(s.now.longestWaitMinutes), tone: (s.now.longestWaitMinutes ?? 0) >= 15 ? 'bad' : (s.now.longestWaitMinutes ?? 0) >= 5 ? 'warn' : 'ok', note: s.now.longestWaitMinutes === null ? 'Nobody is waiting' : (s.now.longestWaitMinutes >= 15 ? 'Over the 15 minute target' : 'Within the 15 minute target') },
    { label: 'Follow-ups overdue', value: String(s.now.overdueFollowups), tone: s.now.overdueFollowups > 0 ? 'bad' : 'ok', note: s.now.overdueFollowups > 0 ? 'See the Follow-up tab' : 'All on time' },
  ] as const;
  const toneCls = { ok: 'border-ok/30 bg-ok-soft text-ok', warn: 'border-warn/30 bg-warn-soft text-warn', bad: 'border-bad/30 bg-bad-soft text-bad' } as const;
  return (
    <section aria-label="Right now" className="grid gap-3 sm:grid-cols-3">
      {items.map((it) => (
        <div key={it.label} className={`rounded-2xl border px-4 py-3 ${toneCls[it.tone]}`}>
          <p className="text-[12.5px] font-semibold">{it.label}</p>
          <p className="text-[24px] font-extrabold leading-tight text-ink">{it.value}</p>
          <p className="text-[12px] font-semibold">{it.note}</p>
        </div>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ headline numbers */
function Tiles({ s }: { s: Stats }) {
  const o = s.overview;
  const tiles = [
    { label: 'New chats', value: String(o.newChats), sub: `${o.leadMessages} messages from leads` },
    { label: 'Median reply time', value: durLabel(o.medianReply), sub: `Bot ${durLabel(o.medianBot)}, people ${durLabel(o.medianPeople)}` },
    { label: 'Answered within 5 minutes', value: pct(o.within5), sub: `${o.replies} replies in total` },
    { label: 'Leads added', value: String(o.leads), sub: 'Deals created from these chats' },
    { label: 'Won', value: String(o.won), sub: o.won ? rpShort(o.wonValue) : 'No deal won yet' },
  ];
  return (
    <section aria-label="Headline numbers" className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-line bg-white px-4 py-3">
          <p className="text-[12.5px] font-semibold text-ink-soft">{t.label}</p>
          <p className="mt-0.5 text-[24px] font-extrabold leading-tight">{t.value}</p>
          <p className="mt-0.5 text-[12px] text-ink-soft">{t.sub}</p>
        </div>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ per day: one measure at a time, a tooltip per bar */
function Daily({ s }: { s: Stats }) {
  const [metric, setMetric] = useState<Metric>('newChats');
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const values = s.daily.map((d) => d[metric]);
  const max = Math.max(1, ...values);
  const nice = max <= 5 ? 5 : max <= 10 ? 10 : Math.ceil(max / 10) * 10;
  const label = METRICS.find((m) => m.key === metric)!.label;
  const every = s.daily.length > 31 ? 14 : s.daily.length > 8 ? 5 : 1;

  return (
    <section className="rounded-2xl border border-line bg-white p-4" aria-label="Per day">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-extrabold">{label} per day</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {METRICS.map((m) => <button key={m.key} onClick={() => setMetric(m.key)} aria-pressed={metric === m.key} className={`rounded-full px-3 py-1 text-[12px] font-bold transition ${metric === m.key ? 'bg-brand text-white' : 'bg-brand-soft text-brand-dark hover:bg-[#d4e9fb]'}`}>{m.label}</button>)}
          <button onClick={() => setAsTable(!asTable)} className="ml-1 text-[12px] font-semibold text-ink-soft underline-offset-2 hover:text-brand-dark hover:underline">{asTable ? 'Show the chart' : 'Show as a table'}</button>
        </div>
      </div>
      {asTable ? (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-left text-[12.5px]">
            <thead><tr className="border-b border-line text-ink-soft"><th className="py-1.5 font-semibold">Day</th><th className="py-1.5 text-right font-semibold">New chats</th><th className="py-1.5 text-right font-semibold">Messages from leads</th><th className="py-1.5 text-right font-semibold">Our replies</th></tr></thead>
            <tbody>{[...s.daily].reverse().map((d) => <tr key={d.day} className="border-b border-[#eef3f8]"><td className="py-1.5">{dayShort(d.day)}</td><td className="py-1.5 text-right">{d.newChats}</td><td className="py-1.5 text-right">{d.leadMessages}</td><td className="py-1.5 text-right">{d.replies}</td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="flex h-44 w-7 shrink-0 flex-col justify-between text-right text-[10.5px] text-ink-soft" aria-hidden="true"><span>{nice}</span><span>{nice / 2}</span><span>0</span></div>
          <div className="relative min-w-0 flex-1">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-44 border-b border-line" aria-hidden="true"><div className="h-1/2 border-b border-dashed border-[#e3edf7]" /></div>
            <ol className="relative flex h-44 items-end gap-[2px]" onMouseLeave={() => setHover(null)}>
              {s.daily.map((d, i) => {
                const v = d[metric];
                const h = (v / nice) * 100;
                return (
                  <li key={d.day} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${dayShort(d.day)}: ${v} ${label.toLowerCase()}`}>
                    <span className={`block w-full rounded-t-[4px] transition-colors ${hover === i ? 'bg-brand-dark' : 'bg-brand'}`} style={{ height: v ? `max(${h}%, 3px)` : 0 }} />
                    {hover === i && (
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] text-white shadow-lg">
                        <b>{dayShort(d.day)}</b><br />{v} {label.toLowerCase()}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="relative mt-1 h-4 text-[10.5px] text-ink-soft" aria-hidden="true">
              {s.daily.map((d, i) => ((s.daily.length - 1 - i) % every === 0 ? <span key={d.day} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${((i + 0.5) / s.daily.length) * 100}%` }}>{dayShort(d.day)}</span> : null))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ the bot */
function BotCard({ s }: { s: Stats }) {
  const b = s.bot;
  const max = Math.max(1, ...b.reasons.map((r) => r.count));
  return (
    <section className="rounded-2xl border border-line bg-white p-4" aria-label="The bot">
      <h2 className="text-[15px] font-extrabold">The bot</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">{b.chatsAnswered ? `Answered ${b.chatsAnswered} chat${b.chatsAnswered > 1 ? 's' : ''} with ${b.replies} message${b.replies > 1 ? 's' : ''}. ${b.handedOver} went to a person, ${b.stillWithBot} are still with the bot.` : 'The bot has not answered any chat in this period.'}</p>
      {b.reasons.length > 0 && (
        <>
          <h3 className="mb-2 mt-4 text-[13px] font-bold">Why chats went to a person</h3>
          <ul className="space-y-2">
            {b.reasons.map((r) => (
              <li key={r.reason} className="grid grid-cols-[minmax(0,10rem)_1fr_2rem] items-center gap-2 text-[12.5px]" title={`${r.reason}: ${r.count}`}>
                <span className="truncate">{r.reason}</span>
                <span className="h-2.5 rounded-full bg-[#eef3f8]"><span className="block h-2.5 rounded-full bg-brand" style={{ width: `${Math.max(4, (r.count / max) * 100)}%` }} /></span>
                <span className="text-right font-bold">{r.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ chats -> leads -> won, per channel */
function FunnelCard({ s }: { s: Stats }) {
  const max = Math.max(1, ...s.funnel.map((f) => f.chats));
  return (
    <section className="rounded-2xl border border-line bg-white p-4" aria-label="From chat to sale">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-extrabold">From chat to sale</h2>
        <ul className="flex flex-wrap gap-3 text-[11.5px] text-ink-soft" aria-label="Legend">
          {FUNNEL.map((f) => <li key={f.key} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: f.color }} />{f.label}</li>)}
        </ul>
      </div>
      {s.funnel.length === 0 ? <p className="mt-2 text-[12.5px] text-ink-soft">No new chats in this period.</p> : (
        <ul className="mt-3 space-y-3">
          {s.funnel.map((f) => (
            <li key={f.channel}>
              <div className="mb-1 flex items-baseline justify-between text-[12.5px]">
                <span className="font-bold">{channelLabel(f.channel)}</span>
                <span className="text-ink-soft">{f.chats} chats, {f.leads} lead{f.leads === 1 ? '' : 's'} ({f.chats ? Math.round((f.leads / f.chats) * 100) : 0}%), {f.won} won{f.won ? `, ${rpShort(f.wonValue)}` : ''}</span>
              </div>
              <div className="space-y-[2px]">
                {FUNNEL.map((st) => {
                  const v = f[st.key];
                  return <div key={st.key} className="h-2.5 rounded-r-[4px]" style={{ width: v ? `max(${(v / max) * 100}%, 4px)` : 0, background: st.color }} title={`${channelLabel(f.channel)}: ${v} ${st.label.toLowerCase()}`} />;
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ each salesperson */
function People({ s }: { s: Stats }) {
  const fast = (m: number | null) => (m === null ? 'text-ink-soft' : m <= 5 ? 'text-ok' : m <= 15 ? 'text-warn' : 'text-bad');
  return (
    <section className="rounded-2xl border border-line bg-white p-4" aria-label="Each salesperson">
      <h2 className="text-[15px] font-extrabold">Each salesperson</h2>
      {s.people.length === 0 ? <p className="mt-2 text-[12.5px] text-ink-soft">Nobody has replied from the dashboard or owns a chat in this period yet.</p> : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-[12px] text-ink-soft">
                <th className="py-2 font-semibold">Name</th><th className="py-2 text-right font-semibold">Chats handled</th><th className="py-2 text-right font-semibold">Replies</th>
                <th className="py-2 text-right font-semibold">Median reply</th><th className="py-2 text-right font-semibold">Leads added</th><th className="py-2 text-right font-semibold">Won</th><th className="py-2 text-right font-semibold">Won value</th>
              </tr>
            </thead>
            <tbody>
              {s.people.map((p) => (
                <tr key={p.name} className="border-b border-[#eef3f8] last:border-0">
                  <td className="py-2 font-bold">{p.name}</td>
                  <td className="py-2 text-right">{p.chats}</td>
                  <td className="py-2 text-right">{p.replies}</td>
                  <td className={`py-2 text-right font-bold ${fast(p.medianMinutes)}`}>{durLabel(p.medianMinutes)}</td>
                  <td className="py-2 text-right">{p.leads}</td>
                  <td className="py-2 text-right">{p.won}</td>
                  <td className="py-2 text-right">{p.won ? rpShort(p.wonValue) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11.5px] text-ink-soft">Median reply in green is within 5 minutes, amber within 15, red slower.</p>
        </div>
      )}
    </section>
  );
}
