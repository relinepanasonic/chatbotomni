'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { AfterInfo, AfterResult, Agent, Meeting, MeetingsResponse, MeetSettings, NudgeInfo } from '@/lib/types';
import { PageHeader, Tabs } from './PageHeader';
import { Rail } from './Rail';
import { clockWib, normalizeTime, timeChoices, toMinutes, weekPlan } from '@/lib/meet';

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
  const [view, setView] = useState<'meetings' | 'booking' | 'follow' | 'google'>('meetings');
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
    if (status === 'no_show' && d?.after?.noShow && !confirm(`Mark ${m.chat || m.lead_name || 'this lead'} as did not come? They get a message with 3 new times to book again.`)) return;
    const r = await api<{ ok: true; after?: AfterResult | null }>(`/meetings/${encodeURIComponent(m.id)}`, { method: 'POST', body: JSON.stringify({ status }) });
    if (!r.ok) { setNotice({ kind: 'error', text: r.error }); return; }
    if (r.data.after) setNotice({ kind: r.data.after.message === 'failed' ? 'error' : 'ok', text: r.data.after.detail });
    await load();
  };

  const groups = useMemo(() => {
    const out: Array<{ day: string; items: Meeting[] }> = [];
    for (const m of d?.meetings ?? []) { const k = dayOf(m.starts_at); const last = out[out.length - 1]; if (last?.day === k) last.items.push(m); else out.push({ day: k, items: [m] }); }
    return out;
  }, [d]);
  const upcoming = (d?.meetings ?? []).filter((m) => m.status === 'booked' && new Date(m.ends_at) > new Date()).length;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg text-ink max-md:pb-16">
      <Rail active="jadwal" />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <PageHeader title="Jadwal" demo={demo} description="Free consultations with the expert team: who is booked, and how the bot and follow-ups invite leads." />
          {notice && <p role="alert" className={`mb-4 rounded-xl px-4 py-2.5 text-[13px] ${notice.kind === 'error' ? 'bg-bad-soft text-bad' : 'bg-ok-soft text-ok'}`}>{notice.text}</p>}
          {error && !d && <div className="rounded-xl bg-white p-6 text-center text-[13px]"><p className="text-bad">{error}</p><button onClick={() => void load()} className={`${btnPrimary} mt-3`}>Try again</button></div>}
          {!d && !error && <p className="p-6 text-center text-[13px] text-ink-soft">Loading...</p>}

          {d && (
            <div className="space-y-5">
              <Tabs label="Jadwal sections" value={view} onChange={setView} items={[['meetings', `Meetings${upcoming ? ` (${upcoming})` : ''}`], ['booking', 'Booking settings'], ['follow', 'Follow-ups'], ['google', 'Google Calendar']]} />
              {view === 'meetings' && <section aria-label="Meetings" className="rounded-2xl border border-line bg-white p-5">
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
                                    <span>{m.owner_name ? `With ${m.owner_name}` : 'No salesperson yet'}</span>
                                    <span>Booked by {m.booked_by === 'bot' ? 'the bot' : m.booked_by}</span>
                                    {m.meet_url ? <a href={m.meet_url} target="_blank" rel="noreferrer" className="font-bold text-brand-dark underline-offset-2 hover:underline">Open Meet</a> : <span className="text-warn">No Meet link</span>}
                                    {m.note && <span className="text-warn">{m.note}</span>}
                                  </span>
                                </span>
                                {m.status === 'booked' && !past ? <Attendance m={m} /> : <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS[m.status].cls}`}>{STATUS[m.status].label}</span>}
                                {m.status === 'booked' && (
                                  <span className="flex gap-1.5">
                                    {past && <button className={btnGhost} title={d.after?.thanks ? 'The lead gets a thank-you, and the ERP lead moves to Meeting Done.' : 'The ERP lead moves to Meeting Done.'} onClick={() => void setStatus(m, 'done')}>Done</button>}
                                    {past && <button className={btnGhost} title={d.after?.noShow ? 'The lead gets 3 new times to book again.' : undefined} onClick={() => void setStatus(m, 'no_show')}>Did not come</button>}
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
              </section>}
              {view === 'booking' && <SettingsCard initial={d.settings} meetings={d.meetings} canEdit={d.canEdit} say={setNotice} reload={load} />}
              {view === 'follow' && (
                <div className="space-y-5">
                  {d.after && <AfterCard a={d.after} canEdit={d.canEdit} say={setNotice} reload={load} />}
                  {d.nudges && <FollowUpCard n={d.nudges} canEdit={d.canEdit} say={setNotice} reload={load} />}
                </div>
              )}
              {view === 'google' && <GoogleCard d={d} say={setNotice} reload={load} />}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/** Where the lead stands for an upcoming meeting: confirmed, asked (no answer yet), wants another time, or not asked yet (asked an hour before). */
function Attendance({ m }: { m: Meeting }) {
  const [label, cls, title] = m.confirmed_at ? ['Confirmed', 'bg-ok-soft text-ok', 'The lead replied YA to the confirmation.']
    : m.reschedule_asked_at ? ['Wants another time', 'bg-warn-soft text-warn', 'The lead asked to move it and got 3 other times to pick from.']
    : m.confirm_sent_at ? ['Asked to confirm', 'bg-warn-soft text-warn', 'The confirmation went out an hour before; no answer yet.']
    : ['Booked', 'bg-brand-soft text-brand-dark', 'The lead is asked to confirm an hour before, and gets the link 15 minutes before.'];
  return <span title={title} className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>{label}</span>;
}

/* ------------------------------------------------------------------ after the meeting: what happens when the team marks it Done or Did not come */
function AfterCard({ a, canEdit, say, reload }: { a: AfterInfo; canEdit: boolean; say: (x: { kind: 'ok' | 'error'; text: string }) => void; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const save = async (patch: Partial<AfterInfo>, done: string) => {
    setBusy(true);
    const r = await api<{ ok: true }>('/meetings/after', { method: 'POST', body: JSON.stringify(patch) });
    setBusy(false);
    if (!r.ok) { say({ kind: 'error', text: r.error }); return; }
    say({ kind: 'ok', text: done }); await reload();
  };
  const Switch = ({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) => (
    <label className={`flex shrink-0 items-center gap-2 text-[13px] font-bold ${canEdit ? 'cursor-pointer' : ''}`}>
      <input type="checkbox" role="switch" aria-label={label} className="h-4 w-4 accent-[var(--color-brand)]" checked={on} disabled={!canEdit || busy} onChange={(e) => onChange(e.target.checked)} />
      {on ? 'On' : 'Off'}
    </label>
  );
  return (
    <section aria-label="After the meeting" className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-[15px] font-extrabold">After the meeting</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">When a consultation has passed, mark it <b>Done</b> or <b>Did not come</b> in the list above. This is what happens next.</p>
      <div className="mt-4">
        <Row title="Done" hint="The ERP lead always moves to Meeting Done (made first if there is none).">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[12.5px] text-ink-soft">The lead gets a thank-you, and is told the salesperson sends the summary and recommendation.</p>
            <Switch on={a.thanks} label="Thank-you message" onChange={(v) => void save({ thanks: v }, v ? 'The thank-you is on.' : 'The thank-you is off.')} />
          </div>
        </Row>
        <Row title="Did not come" hint="No blame: maybe they were busy.">
          <div className="flex items-start justify-between gap-4">
            <p className="text-[12.5px] text-ink-soft">The lead gets 3 new free times. Replying with a number books it, with a new Meet link.</p>
            <Switch on={a.noShow} label="New times message" onChange={(v) => void save({ noShow: v }, v ? 'New times for no-shows are on.' : 'New times for no-shows are off.')} />
          </div>
        </Row>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ follow-ups: quiet leads who never booked get a nudge with three free times */
const TIMINGS: Array<[string, string]> = [['24', 'After 1 day'], ['24,72', 'After 1 and 3 days'], ['24,72,168', 'After 1, 3 and 7 days']];

function FollowUpCard({ n, canEdit, say, reload }: { n: NudgeInfo; canEdit: boolean; say: (x: { kind: 'ok' | 'error'; text: string }) => void; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const current = n.hours.join(',');
  const timing = TIMINGS.some(([v]) => v === current) ? current : TIMINGS[1][0];
  const save = async (patch: { enabled?: boolean; hours?: number[] }, done: string) => {
    setBusy(true);
    const r = await api<{ ok: true }>('/meetings/nudges', { method: 'POST', body: JSON.stringify(patch) });
    setBusy(false);
    if (!r.ok) { say({ kind: 'error', text: r.error }); return; }
    say({ kind: 'ok', text: done }); await reload();
  };
  return (
    <section aria-label="Follow-ups" className="rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-xl">
          <h2 className="text-[15px] font-extrabold">Follow up leads who did not book</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">When a WhatsApp lead goes quiet after our answer and has no consultation yet, they get a short message with three free times. Replying with a number books it.</p>
        </div>
        <label className={`flex items-center gap-2 text-[13px] font-bold ${canEdit ? 'cursor-pointer' : ''}`}>
          <input type="checkbox" role="switch" className="h-4 w-4 accent-[var(--color-brand)]" checked={n.enabled} disabled={!canEdit || busy}
            onChange={(e) => void save({ enabled: e.target.checked }, e.target.checked ? 'Follow-ups are on.' : 'Follow-ups are off.')} />
          {n.enabled ? 'On' : 'Off'}
        </label>
      </div>
      <div className="mt-4">
        <Row title="When" hint="Counted from the lead's last message. If they write again, it starts over.">
          <Choice label="When follow-ups go out" value={timing} options={TIMINGS} disabled={!canEdit || busy}
            onChange={(v) => void save({ hours: v.split(',').map(Number) }, 'Follow-up times saved.')} />
        </Row>
        <Row title="Who is left out" hint="So nobody is pushed too hard.">
          <ul className="list-disc space-y-0.5 pl-4 text-[12.5px] text-ink-soft">
            <li>Leads who booked, or ever had a consultation</li>
            <li>Chats handed over to the team, and anyone who replied STOP</li>
            <li>Instagram and Facebook (Meta allows no message a day after the lead&apos;s last one)</li>
            <li>Never more than 4 follow-ups to one lead, and only inside the broadcast hours</li>
          </ul>
        </Row>
        <Row title="The message" hint="The first one. Later ones are shorter.">
          <p className="whitespace-pre-line rounded-xl bg-brand-softer px-3.5 py-3 text-[12.5px] leading-relaxed text-ink">{`Hi kak Budi, kemarin sempat ngobrol soal toko online kakak ya. Biar lebih jelas langkahnya, tim ahli Prof Toko Online bisa bantu cek toko kakak lewat konsultasi gratis 30 menit (Google Meet).

Waktu yang masih kosong:
1. Senin 16 Nov, jam 10.00 WIB
2. Senin 16 Nov, jam 14.00 WIB
3. Selasa 17 Nov, jam 10.00 WIB

Balas angkanya ya kak (1, 2 atau 3). Balas STOP kalau tidak mau dihubungi lagi.`}</p>
        </Row>
        <Row title="Last 30 days">
          <p className="text-[13px]"><b>{n.chats30d}</b> {n.chats30d === 1 ? 'lead' : 'leads'} followed up, <b>{n.booked30d}</b> booked by replying with a number.</p>
        </Row>
      </div>
    </section>
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


/* ------------------------------------------------------------------ bookable times: plain choices, and a live week board of what leads can book */
const WEEK = [[1, 'Sen'], [2, 'Sel'], [3, 'Rab'], [4, 'Kam'], [5, 'Jum'], [6, 'Sab'], [0, 'Min']] as const;
const PRESETS: Array<{ label: string; days: number[] }> = [{ label: 'Weekdays', days: [1, 2, 3, 4, 5] }, { label: 'Mon to Sat', days: [1, 2, 3, 4, 5, 6] }, { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] }];
const LENGTHS = [15, 30, 45, 60, 90];
const NOTICE: Array<[number, string]> = [[0, 'Right away'], [1, '1 hour'], [3, '3 hours'], [24, 'Next day']];
const AHEAD: Array<[number, string]> = [[3, '3 days'], [7, '1 week'], [14, '2 weeks'], [30, '1 month']];
const HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

function Choice<T extends string | number>({ value, options, onChange, disabled, label }: { value: T; options: Array<[T, string]>; onChange: (v: T) => void; disabled: boolean; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map(([v, text]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} disabled={disabled} onClick={() => onChange(v)}
          className={`rounded-lg px-3 py-1.5 text-[12.5px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${value === v ? 'bg-brand text-white' : 'border border-line bg-white text-ink-soft hover:border-brand hover:text-brand-dark'}`}>{text}</button>
      ))}
    </div>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-t border-line py-4 first:border-t-0 first:pt-0 sm:grid-cols-[11rem_1fr] sm:gap-6">
      <div><p className="text-[13px] font-bold">{title}</p>{hint && <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{hint}</p>}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function SettingsCard({ initial, meetings, canEdit, say, reload }: { initial: MeetSettings; meetings: Meeting[]; canEdit: boolean; say: (n: { kind: 'ok' | 'error'; text: string }) => void; reload: () => Promise<void> }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  useEffect(() => { void api<{ agents: Agent[] }>('/agents').then((r) => r.ok && setAgents(r.data.agents)); }, []);
  const clean = (x: MeetSettings): MeetSettings => ({ ...x, from: normalizeTime(x.from) ?? '10:00', to: normalizeTime(x.to) ?? '17:00' });
  const [saved, setSaved] = useState(() => clean(initial));
  const [s, setS] = useState(() => clean(initial));
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000); return () => clearInterval(t); }, []);

  const dirty = JSON.stringify({ ...s, enabled: undefined }) !== JSON.stringify({ ...saved, enabled: undefined });
  const problem = !s.days.length ? 'Pick at least one day.' : toMinutes(s.to) <= toMinutes(s.from) ? 'The end time must be after the start time.' : toMinutes(s.to) - toMinutes(s.from) < s.minutes ? `The hours are shorter than one ${s.minutes}-minute meeting.` : null;

  const booked = useMemo(() => meetings.filter((m) => m.status === 'booked').map((m) => ({ start: new Date(m.starts_at), end: new Date(m.ends_at), who: m.chat || m.lead_name || 'Lead' })), [meetings]);
  const plan = useMemo(() => (problem ? [] : weekPlan(s, now, booked, 7)), [s, now, booked, problem]);
  const open = plan.reduce((n, d) => n + d.slots.length, 0);

  const save = async (patch: Partial<MeetSettings>, ok: string) => {
    setBusy(true);
    const r = await api<{ ok: true }>('/meetings/settings', { method: 'POST', body: JSON.stringify(patch) });
    setBusy(false);
    say(r.ok ? { kind: 'ok', text: ok } : { kind: 'error', text: r.error });
    if (r.ok) await reload();
    return r.ok;
  };
  const toggle = async () => {
    const on = !s.enabled;
    setS({ ...s, enabled: on });
    if (await save({ enabled: on }, on ? 'The bot now invites leads to book a free consultation.' : 'The bot stopped inviting leads. Booked meetings stay.')) setSaved((x) => ({ ...x, enabled: on }));
    else setS((x) => ({ ...x, enabled: !on }));
  };
  const saveTimes = async () => {
    const patch = { days: s.days, from: s.from, to: s.to, minutes: s.minutes, noticeHours: s.noticeHours, daysAhead: s.daysAhead, ownerId: s.ownerId ?? null, ownerName: s.ownerName ?? null };
    if (await save(patch, 'Saved. Leads are offered the new times within a minute.')) setSaved((x) => ({ ...x, ...patch }));
  };
  const withCurrent = (list: Array<[number, string]>, v: number, unit: string): Array<[number, string]> => (list.some(([x]) => x === v) ? list : [...list, [v, `${v} ${unit}`] as [number, string]].sort((a, b) => a[0] - b[0]));
  const lock = !canEdit || busy;

  return (
    <section aria-label="Bookable times" className="rounded-2xl border border-line bg-white">
      {/* the switch, first: what it does is the most important thing on the card */}
      <div className={`flex flex-wrap items-center gap-4 rounded-t-2xl px-5 py-4 ${s.enabled ? 'bg-ok-soft' : 'bg-[#f3f6f9]'}`}>
        <button type="button" role="switch" aria-checked={s.enabled} aria-label="Bot invites leads to book" disabled={lock} onClick={() => void toggle()}
          className={`relative h-7 w-12 shrink-0 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60 ${s.enabled ? 'bg-ok' : 'bg-[#c4d0dc]'}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${s.enabled ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-extrabold">{s.enabled ? 'The bot invites leads to book' : 'The bot does not invite leads yet'}</h2>
          <p className="text-[12.5px] text-ink-soft">{s.enabled ? 'In every chat it offers 2 or 3 of the free times below, and books the one the lead picks.' : 'Switch on to let the bot offer a free consultation in every chat. The team can still book from the inbox.'}</p>
        </div>
      </div>

      <div className="px-5 py-5">
        <Row title="Salesperson" hint="Takes a consultation when the chat has nobody assigned. It shows in their ERP Meetings and Today calendar.">
          <select aria-label="Salesperson" disabled={lock} value={s.ownerId ?? ''} onChange={(e) => setS({ ...s, ownerId: e.target.value || null, ownerName: agents.find((a) => a.id === e.target.value)?.name ?? null })} className="w-full max-w-xs rounded-lg border border-line bg-brand-softer px-3 py-2 text-[13px] font-bold outline-none focus:border-brand">
            <option value="">Nobody: the person who books it</option>
            {s.ownerId && !agents.some((a) => a.id === s.ownerId) && <option value={s.ownerId}>{s.ownerName || 'Salesperson'}</option>}
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {!s.ownerId && <p className="mt-1.5 text-[11.5px] text-warn">Meetings the bot books in unassigned chats will not reach anyone in the ERP until you pick someone.</p>}
        </Row>
        <Row title="Days" hint="When the team takes consultations.">
          <div className="flex flex-wrap items-center gap-1.5">
            {WEEK.map(([n, label]) => {
              const on = s.days.includes(n);
              return <button key={n} type="button" disabled={lock} aria-pressed={on} onClick={() => setS({ ...s, days: on ? s.days.filter((x) => x !== n) : [...s.days, n] })}
                className={`h-9 w-11 rounded-lg text-[12.5px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${on ? 'bg-brand text-white' : 'border border-line bg-white text-ink-soft hover:border-brand'}`}>{label}</button>;
            })}
            <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />
            {PRESETS.map((p) => <button key={p.label} type="button" disabled={lock} onClick={() => setS({ ...s, days: p.days })} className={`rounded-lg px-2 py-1 text-[12px] font-semibold underline-offset-2 transition ${sameSet(s.days, p.days) ? 'text-brand-dark underline' : 'text-ink-soft hover:text-brand-dark hover:underline'}`}>{p.label}</button>)}
          </div>
        </Row>
        <Row title="Hours" hint="Jakarta time (WIB).">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <select aria-label="Start time" disabled={lock} value={s.from} onChange={(e) => setS({ ...s, from: e.target.value })} className="rounded-lg border border-line bg-brand-softer px-3 py-2 font-bold outline-none focus:border-brand">{timeChoices(s.from).map((t) => <option key={t} value={t}>{t}</option>)}</select>
            <span className="text-ink-soft">until</span>
            <select aria-label="End time" disabled={lock} value={s.to} onChange={(e) => setS({ ...s, to: e.target.value })} className="rounded-lg border border-line bg-brand-softer px-3 py-2 font-bold outline-none focus:border-brand">{timeChoices(s.to).map((t) => <option key={t} value={t}>{t}</option>)}</select>
          </div>
        </Row>
        <Row title="Each meeting lasts">
          <Choice label="Meeting length" disabled={lock} value={s.minutes} onChange={(v) => setS({ ...s, minutes: v })} options={withCurrent(LENGTHS.map((m) => [m, `${m} min`]), s.minutes, 'min')} />
        </Row>
        <Row title="Earliest booking" hint="How soon after the chat a lead can book.">
          <Choice label="Earliest booking" disabled={lock} value={s.noticeHours} onChange={(v) => setS({ ...s, noticeHours: v })} options={withCurrent(NOTICE, s.noticeHours, 'hours')} />
        </Row>
        <Row title="Offer times up to" hint="How far ahead leads can book.">
          <Choice label="Offer times up to" disabled={lock} value={s.daysAhead} onChange={(v) => setS({ ...s, daysAhead: v })} options={withCurrent(AHEAD, s.daysAhead, 'days')} />
        </Row>
      </div>

      {/* what leads can book, live: every change above shows here before it is saved */}
      <div className="border-t border-line bg-brand-softer px-5 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[14px] font-extrabold">What leads can book in the next 7 days</h3>
          {!problem && <p className="text-[12.5px] text-ink-soft"><b className="text-ink">{open}</b> free time{open === 1 ? '' : 's'}{booked.length ? `, ${booked.filter((b) => b.end > now).length} booked` : ''}</p>}
        </div>
        {problem ? <p role="alert" className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-[12.5px] text-bad">{problem}</p> : (
          <div className="-mx-1 mt-3 overflow-x-auto pb-1">
            <ol className="grid min-w-[640px] grid-cols-7 gap-2 px-1">
              {plan.map((d) => {
                const dayBooked = booked.filter((b) => b.start.getTime() >= d.date.getTime() && b.start.getTime() < d.date.getTime() + 86400000);
                const items = [...d.slots.map((t) => ({ t, who: null as string | null })), ...dayBooked.map((b) => ({ t: b.start, who: b.who }))].sort((a, b) => a.t.getTime() - b.t.getTime());
                // booked meetings are always shown; free times fill the rest of the column
                const freeRoom = Math.max(0, 8 - dayBooked.length);
                const shown = [...dayBooked.map((b) => ({ t: b.start, who: b.who as string | null })), ...d.slots.slice(0, freeRoom).map((t) => ({ t, who: null as string | null }))].sort((a, b) => a.t.getTime() - b.t.getTime());
                const today = d.key === plan[0].key;
                return (
                  <li key={d.key} className={`flex min-h-36 flex-col rounded-xl border p-2 ${d.open ? 'border-line bg-white' : 'border-transparent bg-[#eaf0f6]'}`}>
                    <p className={`text-[11.5px] font-bold ${today ? 'text-brand-dark' : 'text-ink-soft'}`}>{today ? 'Today' : HARI[d.weekday]}</p>
                    <p className="text-[17px] font-extrabold leading-tight">{new Date(d.date.getTime() + 7 * 3600000).getUTCDate()}</p>
                    <div className="mt-2 flex flex-1 flex-col gap-1">
                      {!d.open && <p className="text-[11px] text-ink-soft">Closed</p>}
                      {d.open && items.length === 0 && <p className="text-[11px] leading-snug text-ink-soft">{today ? 'Too soon for today' : 'No free time'}</p>}
                      {shown.map((x) => x.who
                        ? <span key={x.t.toISOString()} title={`Booked: ${x.who}`} className="truncate rounded-md bg-ok px-1.5 py-1 text-[11px] font-bold text-white">{clockWib(x.t)} {x.who.split(/\s+/)[0]}</span>
                        : <span key={x.t.toISOString()} className="rounded-md border border-brand/40 bg-white px-1.5 py-1 text-center text-[11.5px] font-bold text-brand-dark">{clockWib(x.t)}</span>)}
                      {items.length > shown.length && <span className="text-center text-[11px] font-semibold text-ink-soft">+{items.length - shown.length} more</span>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
        <p className="mt-3 text-[11.5px] text-ink-soft">Times that are busy on your Google Calendar are also left out when the bot offers them; they are not shown here.</p>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center justify-end gap-3 rounded-b-2xl border-t border-line px-5 py-3">
          <span className={`text-[12.5px] ${dirty ? 'font-semibold text-warn' : 'text-ink-soft'}`}>{dirty ? 'You have changes that are not saved' : 'All changes saved'}</span>
          {dirty && <button type="button" className={btnGhost} disabled={busy} onClick={() => setS({ ...saved, enabled: s.enabled })}>Undo changes</button>}
          <button type="button" className={btnPrimary} disabled={busy || !dirty || !!problem} onClick={() => void saveTimes()}>{busy ? 'Saving...' : 'Save times'}</button>
        </div>
      )}
    </section>
  );
}
