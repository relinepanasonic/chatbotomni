'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { channelLabel, type InsightsData, type InsightSummary, type Stats } from '@/lib/types';
import { durLabel, rpShort } from '@/lib/format';
import { Rail } from './Rail';

/**
 * Statistik: how the sales chat is doing. Reply times (bot vs people), what the bot does, each salesperson, and how chats turn into leads and sales
 * per channel. Charts are plain HTML (no library): one series per chart, a tooltip on every bar, and the numbers also as a table.
 */

type Metric = 'newChats' | 'leadMessages' | 'replies';
const METRICS: Array<{ key: Metric; label: string }> = [{ key: 'newChats', label: 'New chats' }, { key: 'leadMessages', label: 'Messages from leads' }, { key: 'replies', label: 'Our replies' }];
// The funnel stages are ordered, so they are one hue stepping darker (sequential), not three different colours.
const FUNNEL = [{ key: 'chats', label: 'Chats', color: '#cfe6fa' }, { key: 'booked', label: 'Booked a consultation', color: '#a9d4f7' }, { key: 'attended', label: 'Came', color: '#6fb8f0' }, { key: 'leads', label: 'Became a lead', color: '#2f9bf0' }, { key: 'won', label: 'Won', color: '#1268b8' }] as const;

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
              {s.booking && <Consultations b={s.booking} />}
              <Daily s={s} />
              <div className="grid gap-5 lg:grid-cols-2">
                <BotCard s={s} />
                <FunnelCard s={s} />
              </div>
              <People s={s} />
              <Asks days={days} />
              <p className="text-[12px] text-ink-soft">Reply time runs from a lead&apos;s first unanswered message to our next message, nights included. Replies typed on the phone are not captured by WhatsApp, so only replies from the bot, flows and this dashboard count.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ the goal: free consultations */
function Consultations({ b }: { b: NonNullable<Stats['booking']> }) {
  const tiles = [
    { label: 'Consultations booked', value: String(b.booked), sub: b.chatToBooked === null ? 'No new chats yet' : `${Math.round(b.chatToBooked * 100)}% of new chats booked` },
    { label: 'Came to the meeting', value: String(b.held), sub: b.noShow ? `${b.noShow} did not come` : 'Marked Done in Jadwal' },
    { label: 'Show rate', value: pct(b.showRate), sub: b.showRate === null ? 'No meeting has passed yet' : `${b.held} of ${b.held + b.noShow} came` },
    { label: 'Coming up', value: String(b.upcoming), sub: b.upcoming ? `${b.confirmedUpcoming} confirmed by the lead` : 'Nothing booked ahead' },
  ];
  const parts = [{ label: 'Booked by the bot', v: b.byBot }, { label: 'Booked by a salesperson', v: b.byTeam }];
  return (
    <section aria-label="Free consultations" className="rounded-2xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-extrabold">Free consultations</h2>
        <p className="text-[12px] text-ink-soft">The goal of every chat</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-brand-softer px-4 py-3">
            <p className="text-[12.5px] font-semibold text-ink-soft">{t.label}</p>
            <p className="mt-0.5 text-[24px] font-extrabold leading-tight">{t.value}</p>
            <p className="mt-0.5 text-[12px] text-ink-soft">{t.sub}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] text-ink-soft">
        {parts.map((p, i) => <span key={p.label}>{i ? ', ' : ''}<b className="text-ink">{p.v}</b> {p.label.toLowerCase()}</span>)}
        {b.byNudge ? <>, of which <b className="text-ink">{b.byNudge}</b> came from a follow-up message</> : null}
        {b.cancelled ? <>. {b.cancelled} cancelled</> : null}.
      </p>
    </section>
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
                <span className="text-ink-soft">{f.chats} chats, {f.booked ?? 0} booked ({f.chats ? Math.round(((f.booked ?? 0) / f.chats) * 100) : 0}%), {f.attended ?? 0} came, {f.leads} lead{f.leads === 1 ? '' : 's'}, {f.won} won{f.won ? `, ${rpShort(f.wonValue)}` : ''}</span>
              </div>
              <div className="space-y-[2px]">
                {FUNNEL.map((st) => {
                  const v = f[st.key] ?? 0;
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
                <th className="py-2 text-right font-semibold">Median reply</th><th className="py-2 text-right font-semibold">Consultations held</th><th className="py-2 text-right font-semibold">Leads added</th><th className="py-2 text-right font-semibold">Won</th><th className="py-2 text-right font-semibold">Won value</th>
              </tr>
            </thead>
            <tbody>
              {s.people.map((p) => (
                <tr key={p.name} className="border-b border-[#eef3f8] last:border-0">
                  <td className="py-2 font-bold">{p.name}</td>
                  <td className="py-2 text-right">{p.chats}</td>
                  <td className="py-2 text-right">{p.replies}</td>
                  <td className={`py-2 text-right font-bold ${fast(p.medianMinutes)}`}>{durLabel(p.medianMinutes)}</td>
                  <td className="py-2 text-right">{p.meetingsHeld ?? 0}</td>
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

/* ------------------------------------------------------------------ what clients ask: packages, worries, needs (counted from the chats) */
const mark = (n: number, max: number) => ({ width: n ? `max(${(n / Math.max(1, max)) * 100}%, 4px)` : 0 });

function TopicList({ title, hint, rows, color }: { title: string; hint: string; rows: InsightsData['packages']; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.chats));
  return (
    <section className="rounded-2xl border border-line bg-white p-4" aria-label={title}>
      <h3 className="text-[14px] font-extrabold">{title}</h3>
      <p className="text-[12px] text-ink-soft">{hint}</p>
      {rows.length === 0 ? <p className="mt-3 text-[12.5px] text-ink-soft">Nothing yet in this period.</p> : (
        <ul className="mt-3 space-y-3">
          {rows.slice(0, 8).map((r) => (
            <li key={r.key}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-[12.5px]">
                <span className="font-bold">{r.label}</span>
                <span className="shrink-0 text-ink-soft">{r.chats} chat{r.chats === 1 ? '' : 's'}</span>
              </div>
              <div className="h-2.5 rounded-r-[4px]" style={{ ...mark(r.chats, max), background: color }} title={`${r.label}: ${r.chats} chats, ${r.mentions} messages`} />
              {r.examples.length > 0 && <p className="mt-1 text-[11.5px] italic leading-snug text-ink-soft">&ldquo;{r.examples[0]}&rdquo;</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Asks({ days }: { days: number }) {
  const [d, setD] = useState<InsightsData | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sum, setSum] = useState<InsightSummary | null>(null);
  const [writing, setWriting] = useState(false);
  const [sumErr, setSumErr] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setSum(null); setSumErr(null);
    (async () => {
      try {
        const res = await fetch(`/api/insights?days=${days}`, { cache: 'no-store' });
        const j = await res.json().catch(() => null);
        if (!live) return;
        if (res.ok) { setD(j as InsightsData); setErr(null); } else setErr(String(j?.error || 'Could not load what clients ask.'));
      } catch { if (live) setErr('No connection.'); }
    })();
    return () => { live = false; };
  }, [days]);

  const write = async (fresh: boolean) => {
    setWriting(true); setSumErr(null);
    try {
      const res = await fetch('/api/insights/summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days, fresh }) });
      const j = await res.json().catch(() => null);
      if (res.ok) setSum(j as InsightSummary); else setSumErr(String(j?.error || 'The summary could not be written.'));
    } catch { setSumErr('No connection.'); }
    setWriting(false);
  };

  return (
    <section aria-label="What clients ask" className="space-y-3">
      <div>
        <h2 className="text-[17px] font-extrabold tracking-tight">What clients ask</h2>
        <p className="text-[12.5px] text-ink-soft">Counted from what leads write in the chats: which package they ask about, what worries them, and what they say they need. A chat counts once per topic.</p>
      </div>
      {err && !d && <p className="rounded-xl bg-white p-4 text-[13px] text-bad">{err}</p>}
      {!d && !err && <p className="p-3 text-[13px] text-ink-soft">Counting...</p>}
      {d && (
        <>
          <p className="text-[12.5px] text-ink-soft"><b className="text-ink">{d.chats}</b> chats and <b className="text-ink">{d.messages}</b> messages from leads in the last {d.days} days.{d.chats < 10 ? ' That is still a small sample: read the numbers as a first look.' : ''}</p>
          <div className="grid gap-3 lg:grid-cols-2">
            <TopicList title="Packages asked about" hint="The package or offer a lead names, by number of chats." rows={d.packages} color="#2f9bf0" />
            <TopicList title="What worries clients" hint="Their concerns, in their own words." rows={d.concerns} color="#e0a23a" />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <section className="rounded-2xl border border-line bg-white p-4" aria-label="What clients say they need">
              <h3 className="text-[14px] font-extrabold">What they say they need</h3>
              <p className="text-[12px] text-ink-soft">The need the bot wrote down from the lead&apos;s own words.</p>
              {d.needs.length === 0 ? <p className="mt-3 text-[12.5px] text-ink-soft">The bot has not written down a need yet.</p> : (
                <ul className="mt-2 divide-y divide-[#eef3f8]">
                  {d.needs.map((n) => <li key={n.need} className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]"><span className="min-w-0 truncate font-semibold">{n.need}</span><span className="shrink-0 text-[12px] text-ink-soft">{n.chats} chat{n.chats === 1 ? '' : 's'}</span></li>)}
                </ul>
              )}
            </section>
            <section className="rounded-2xl border border-line bg-white p-4" aria-label="Questions the bot could not answer">
              <h3 className="text-[14px] font-extrabold">Questions the bot could not answer</h3>
              <p className="text-[12px] text-ink-soft">What is missing from the script: add the answer in AI Kamus.</p>
              {d.handedOver.length === 0 ? <p className="mt-3 text-[12.5px] text-ink-soft">None in this period.</p> : (
                <ul className="mt-2 space-y-1.5">
                  {d.handedOver.map((h, i) => <li key={i} className="text-[12.5px] italic leading-snug">&ldquo;{h.text}&rdquo;</li>)}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-line bg-white p-4" aria-label="Summary for the BOD">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[14px] font-extrabold">Summary for the BOD</h3>
                <p className="text-[12px] text-ink-soft">The same summary goes into page 5 of the daily BOD report (Insight Chat). It is kept for 6 hours.</p>
              </div>
              <button onClick={() => void write(!!sum)} disabled={writing || !d.messages} className="rounded-lg bg-brand px-3.5 py-2 text-[13px] font-bold text-white hover:bg-brand-dark disabled:opacity-40">{writing ? 'Writing...' : sum ? 'Write it again' : 'Write the summary'}</button>
            </div>
            {sumErr && <p className="mt-2 text-[12.5px] text-bad">{sumErr}</p>}
            {sum && (
              <div className="mt-3 space-y-3 rounded-xl bg-brand-softer px-4 py-3 text-[13px] leading-relaxed">
                <p>{sum.executive}</p>
                {sum.insights.length > 0 && <ul className="list-disc space-y-1 pl-5">{sum.insights.map((x, i) => <li key={i}>{x}</li>)}</ul>}
                {sum.actions.length > 0 && (
                  <div>
                    <p className="mb-1 text-[12px] font-extrabold text-ink-soft">Recommendations and action plan</p>
                    <ol className="space-y-1.5">
                      {sum.actions.map((a, i) => <li key={i} className="flex gap-2"><span className="font-bold text-ink-soft">{i + 1}.</span><span><b>{a.pic}:</b> {a.action} <span className="text-ink-soft">({a.why})</span></span></li>)}
                    </ol>
                  </div>
                )}
                <p className="text-[11.5px] text-ink-soft">{sum.ai ? `Written by the AI (${sum.model}) from the numbers above.` : 'Written from the numbers alone: the AI was not available.'}</p>
              </div>
            )}
            {!sum && !sumErr && !d.messages && <p className="mt-2 text-[12.5px] text-ink-soft">There are no chats in this period yet.</p>}
          </section>
        </>
      )}
    </section>
  );
}
