'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Meeting, MeetingsResponse, MeetSettings } from '@/lib/types';
import { Rail } from './Rail';

/**
 * Jadwal: the free consultations with the expert team. The bot books them in the chat (and the team can, from the inbox); each goes on the shared
 * Google Calendar with a Meet link. Here: who is coming when, marking a meeting done or no-show, the bookable hours, and the Google connection.
 */
async function api<T>(path: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api${path}`, { cache: 'no-store', ...init, headers: init?.body ? { 'Content-Type': 'application/json' } : undefined });
    const body = await res.json().catch(() => null);
    return res.ok ? { ok: true, data: body as T } : { ok: false, error: String(body?.error || (res.status === 401 ? 'Please sign in again.' : res.status === 403 ? 'Only admins can change this.' : 'Something went wrong.')) };
  } catch { return { ok: false, error: 'No connection.' }; }
}

const TZ = 'Asia/Jakarta';
const dayOf = (iso: string) => new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
const clock = (iso: string) => new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)).replace('.', ':');
const DAYS = [[1, 'Sen'], [2, 'Sel'], [3, 'Rab'], [4, 'Kam'], [5, 'Jum'], [6, 'Sab'], [0, 'Min']] as const;
const STATUS: Record<Meeting['status'], { label: string; cls: string }> = {
  booked: { label: 'Booked', cls: 'bg-brand-soft text-brand-dark' }, done: { label: 'Done', cls: 'bg-ok-soft text-ok' },
  no_show: { label: 'Did not come', cls: 'bg-warn-soft text-warn' }, cancelled: { label: 'Cancelled', cls: 'bg-[#eef2f6] text-ink-soft' },
};
const field = 'w-full rounded-lg border border-line bg-brand-softer px-3 py-2 text-[13px] outline-none focus:border-brand focus:bg-white';
const btnPrimary = 'rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50';
const btnGhost = 'rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold text-ink-soft transition hover:border-brand hover:text-brand-dark disabled:opacity-50';

export function JadwalApp({ demo }: { demo: boolean }) {
  const [d, setD] = useState<MeetingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const load = useCallback(async () => { const r = await api<MeetingsResponse>('/meetings'); if (r.ok) { setD(r.data); setError(null); } else setError(r.error); }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    // back from Google's sign-in
    const q = new URLSearchParams(window.location.search).get('google');
    if (!q) return;
    const reason = new URLSearchParams(window.location.search).get('reason');
    setNotice(q === 'connected' ? { kind: 'ok', text: 'Google Calendar is connected. New bookings get a Meet link.' } : { kind: 'error', text: q === 'expired' ? 'The sign-in took too long. Press Connect again.' : q === 'denied' ? 'Google access was not allowed.' : `Could not connect Google: ${reason || 'unknown error'}` });
    window.history.replaceState(null, '', '/jadwal');
  }, []);

  const setStatus = async (m: Meeting, status: Meeting['status']) => {
    if (status === 'cancelled' && !confirm(`Cancel the meeting with ${m.chat || m.lead_name || 'this lead'}? It is also removed from Google Calendar. The lead is not told automatically.`)) return;
    const r = await api<{ ok: true }>(`/meetings/${encodeURIComponent(m.id)}`, { method: 'POST', body: JSON.stringify({ status }) });
    if (!r.ok) setNotice({ kind: 'error', text: r.error }); else await load();
  };

  const groups = useMemo(() => {
    const out: Array<{ day: string; items: Meeting[] }> = [];
    for (const m of d?.meetings ?? []) { const k = dayOf(m.starts_at); const last = out[out.length - 1]; if (last?.day === k) last.items.push(m); else out.push({ day: k, items: [m] }); }
    return out;
  }, [d]);
  const upcoming = (d?.meetings ?? []).filter((m) => m.status === 'booked' && new Date(m.ends_at) > new Date()).length;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg text-ink max-md:pb-14">
      <Rail active="jadwal" />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <header className="mb-5">
            <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight">Jadwal {demo && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-bold text-warn">DEMO</span>}</h1>
            <p className="mt-1 text-[13.5px] text-ink-soft">Free consultations with the expert team. The bot invites every lead and books the time they pick; each meeting goes on Google Calendar with a Meet link, and the lead gets a reminder an hour before.</p>
          </header>
          {notice && <p role="alert" className={`mb-4 rounded-xl px-4 py-2.5 text-[13px] ${notice.kind === 'error' ? 'bg-bad-soft text-bad' : 'bg-ok-soft text-ok'}`}>{notice.text}</p>}
          {error && !d && <div className="rounded-xl bg-white p-6 text-center text-[13px]"><p className="text-bad">{error}</p><button onClick={() => void load()} className={`${btnPrimary} mt-3`}>Try again</button></div>}
          {!d && !error && <p className="p-6 text-center text-[13px] text-ink-soft">Loading...</p>}

          {d && (
            <div className="space-y-5">
              <section aria-label="Meetings" className="rounded-2xl border border-line bg-white p-5">
                <h2 className="text-[15px] font-extrabold">{upcoming ? `${upcoming} upcoming meeting${upcoming > 1 ? 's' : ''}` : 'No upcoming meetings'}</h2>
                {!d.settings.enabled && <p className="mt-1 text-[12.5px] text-warn">Booking is switched off: the bot does not invite leads yet. Switch it on below.</p>}
                {groups.length === 0 ? <p className="mt-2 text-[12.5px] text-ink-soft">When a lead books a time, it shows here.</p> : (
                  <div className="mt-3 space-y-4">
                    {groups.map((g) => (
                      <div key={g.day}>
                        <h3 className="mb-1.5 text-[12.5px] font-bold capitalize text-ink-soft">{g.day}</h3>
                        <ul className="space-y-2">
                          {g.items.map((m) => {
                            const past = new Date(m.ends_at) < new Date();
                            return (
                              <li key={m.id} className={`flex flex-wrap items-center gap-3 rounded-xl border border-line px-3 py-2.5 ${m.status === 'cancelled' ? 'opacity-60' : ''}`}>
                                <span className="w-14 shrink-0 text-[15px] font-extrabold">{clock(m.starts_at)}</span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[13.5px] font-bold">{m.chat || m.lead_name || 'Lead'}{m.store && m.store !== (m.chat || m.lead_name) ? <span className="font-normal text-ink-soft">, {m.store}</span> : null}</span>
                                  <span className="flex flex-wrap items-center gap-x-2 text-[11.5px] text-ink-soft">
                                    <span>Booked by {m.booked_by === 'bot' ? 'the bot' : m.booked_by}</span>
                                    {m.meet_url ? <a href={m.meet_url} target="_blank" rel="noreferrer" className="font-bold text-brand-dark underline-offset-2 hover:underline">Open Meet</a> : <span className="text-warn">No Meet link</span>}
                                    {m.note && <span className="text-warn">{m.note}</span>}
                                  </span>
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS[m.status].cls}`}>{STATUS[m.status].label}</span>
                                {m.status === 'booked' && (
                                  <span className="flex gap-1.5">
                                    {past && <button className={btnGhost} onClick={() => void setStatus(m, 'done')}>Done</button>}
                                    {past && <button className={btnGhost} onClick={() => void setStatus(m, 'no_show')}>Did not come</button>}
                                    {!past && <button className={`${btnGhost} hover:!border-bad hover:!text-bad`} onClick={() => void setStatus(m, 'cancelled')}>Cancel</button>}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
              <GoogleCard d={d} say={setNotice} reload={load} />
              <SettingsCard initial={d.settings} canEdit={d.canEdit} say={setNotice} reload={load} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function GoogleCard({ d, say, reload }: { d: MeetingsResponse; say: (n: { kind: 'ok' | 'error'; text: string }) => void; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const connect = async () => {
    setBusy(true);
    const r = await api<{ ok: true; url: string }>('/meetings/google', { method: 'POST', body: '{}' });
    setBusy(false);
    if (!r.ok) { say({ kind: 'error', text: r.error }); return; }
    window.location.href = r.data.url;
  };
  const disconnect = async () => {
    if (!confirm('Disconnect Google Calendar? New bookings will have no Meet link until you connect again.')) return;
    const r = await api<{ ok: true }>('/meetings/google', { method: 'DELETE' });
    if (!r.ok) say({ kind: 'error', text: r.error }); else { say({ kind: 'ok', text: 'Google Calendar disconnected.' }); await reload(); }
  };
  const g = d.google;
  return (
    <section aria-label="Google Calendar" className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-[15px] font-extrabold">Google Calendar</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">The shared calendar where meetings go. Busy times on it are never offered to leads, and every booking gets a Google Meet link.</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${g.connected ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}>{g.connected ? `Connected${g.email ? `: ${g.email}` : ''}` : 'Not connected'}</span>
        {d.canEdit && g.configured && <button className={btnPrimary} disabled={busy} onClick={() => void connect()}>{busy ? 'Opening Google...' : g.connected ? 'Connect again' : 'Connect Google Calendar'}</button>}
        {d.canEdit && g.connected && <button className={btnGhost} onClick={() => void disconnect()}>Disconnect</button>}
      </div>
      {!g.configured && <p className="mt-2 text-[12px] text-ink-soft">First put <code className="font-bold">GOOGLE_CLIENT_ID</code> and <code className="font-bold">GOOGLE_CLIENT_SECRET</code> on the ERP in Vercel and redeploy. Then the Connect button appears here.</p>}
      {!g.connected && <p className="mt-2 text-[12px] text-ink-soft">Without it, bookings still work, but you send the lead a meeting link yourself.</p>}
    </section>
  );
}

function SettingsCard({ initial, canEdit, say, reload }: { initial: MeetSettings; canEdit: boolean; say: (n: { kind: 'ok' | 'error'; text: string }) => void; reload: () => Promise<void> }) {
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const save = async (patch: Partial<MeetSettings>, ok: string) => {
    setBusy(true);
    const r = await api<{ ok: true }>('/meetings/settings', { method: 'POST', body: JSON.stringify(patch) });
    setBusy(false);
    say(r.ok ? { kind: 'ok', text: ok } : { kind: 'error', text: r.error });
    if (r.ok) await reload();
    return r.ok;
  };
  return (
    <section aria-label="Booking settings" className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-extrabold">Bookable times</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">The bot only offers times inside these hours that are free on the calendar.</p>
        </div>
        <label className={`flex items-center gap-2 text-[13px] font-bold ${canEdit ? 'cursor-pointer' : 'opacity-60'}`}>
          <input type="checkbox" checked={s.enabled} disabled={!canEdit || busy} onChange={async (e) => { const on = e.target.checked; setS({ ...s, enabled: on }); if (!(await save({ enabled: on }, on ? 'Booking is ON: the bot now invites leads to a free consultation.' : 'Booking is OFF.'))) setS((x) => ({ ...x, enabled: !on })); }} className="h-5 w-5 accent-[#2f9bf0]" />
          {s.enabled ? 'Bot invites leads' : 'Off'}
        </label>
      </div>
      <fieldset className="mt-4">
        <legend className="text-[12px] font-semibold text-ink-soft">Days</legend>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {DAYS.map(([n, label]) => {
            const on = s.days.includes(n);
            return <button key={n} type="button" disabled={!canEdit} aria-pressed={on} onClick={() => setS({ ...s, days: on ? s.days.filter((x) => x !== n) : [...s.days, n] })} className={`rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition ${on ? 'bg-brand text-white' : 'border border-line text-ink-soft hover:border-brand'}`}>{label}</button>;
          })}
        </div>
      </fieldset>
      <div className="mt-3 grid gap-3 sm:grid-cols-5">
        <label className="text-[12px] font-semibold text-ink-soft">From<input className={`${field} mt-1`} value={s.from} disabled={!canEdit} onChange={(e) => setS({ ...s, from: e.target.value })} placeholder="10:00" /></label>
        <label className="text-[12px] font-semibold text-ink-soft">Until<input className={`${field} mt-1`} value={s.to} disabled={!canEdit} onChange={(e) => setS({ ...s, to: e.target.value })} placeholder="17:00" /></label>
        <label className="text-[12px] font-semibold text-ink-soft">Meeting length
          <select className={`${field} mt-1`} value={s.minutes} disabled={!canEdit} onChange={(e) => setS({ ...s, minutes: Number(e.target.value) })}>{[15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} minutes</option>)}</select>
        </label>
        <label className="text-[12px] font-semibold text-ink-soft">Earliest (hours from now)<input type="number" min={0} max={72} className={`${field} mt-1`} value={s.noticeHours} disabled={!canEdit} onChange={(e) => setS({ ...s, noticeHours: Number(e.target.value) })} /></label>
        <label className="text-[12px] font-semibold text-ink-soft">Offer days ahead<input type="number" min={1} max={30} className={`${field} mt-1`} value={s.daysAhead} disabled={!canEdit} onChange={(e) => setS({ ...s, daysAhead: Number(e.target.value) })} /></label>
      </div>
      {canEdit && <button className={`${btnPrimary} mt-4`} disabled={busy} onClick={() => void save({ days: s.days, from: s.from, to: s.to, minutes: s.minutes, noticeHours: s.noticeHours, daysAhead: s.daysAhead }, 'Saved. The bot offers the new times within a minute.')}>{busy ? 'Saving...' : 'Save times'}</button>}
    </section>
  );
}
