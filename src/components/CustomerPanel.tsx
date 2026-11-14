'use client';

import React, { useEffect, useState } from 'react';
import { channelLabel, type Agent, type ChatLabel, type ChatStatus, type ConversationSummary, type LeadSource, type ReminderItem, type Thread, type FreeSlot } from '@/lib/types';
import { dateTimeLabel, timeLabel } from '@/lib/format';
import { LABEL_CLASS } from './ChatExtras';
import { ChannelMark } from './ChannelMark';
import { CHANNEL_NAME, chatChannel } from '@/lib/channel';
import { SlotPicker } from './SlotPicker';
import { clockOf, dayKeyOf, dayTitle } from '@/lib/calendar';

/**
 * The right-hand column of a chat, ordered by what a salesperson needs:
 *   1. who this is (name, number, where they came from, labels),
 *   2. what to do next (the next follow-up, and the two main actions),
 *   3. where the deal stands (a stage bar you click to move),
 *   4. details folded away (profile, source, bot, history), each showing its key fact while closed.
 */

async function call<T>(path: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api${path}`, { method: body === undefined ? 'GET' : 'POST', cache: 'no-store', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = await res.json().catch(() => null);
    return res.ok ? { ok: true, data: j as T } : { ok: false, error: String(j?.error || 'Something went wrong.') };
  } catch { return { ok: false, error: 'No connection.' }; }
}

const AVATAR = ['#2f9bf0', '#14b8a6', '#8b7cf6', '#f59e0b', '#ef6b8a', '#4f9d69', '#0ea5e9'];
const avatarColor = (s: string) => AVATAR[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];
const PIPELINE = ['Lead', 'Contacted', 'Negotiation', 'Invoice', 'Deal'] as const;
const MANUAL = new Set(['Lead', 'Contacted', 'Negotiation']);
const COLORS = Object.keys(LABEL_CLASS);

const input = 'w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] text-ink outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand/30';
const btnPrimary = 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[12.5px] font-bold text-white transition hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50';
const btnSecondary = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand/40 bg-white px-3 py-2 text-[12.5px] font-bold text-brand-dark transition hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50';
const btnText = 'text-[12px] font-semibold text-ink-soft underline-offset-2 hover:text-brand-dark hover:underline';

const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const I = {
  copy: 'M9 9h10v10H9V9zm-4 6V5h10',
  check: 'M20 6L9 17l-5-5',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  plus: 'M12 5v14M5 12h14',
  chevron: 'M9 6l6 6-6 6',
  funnel: 'M3 4h18l-7 8v6l-4 2v-8L3 4z',
};

interface Props {
  current: ConversationSummary;
  thread: Thread | null;
  me: { id: string; name: string; role: string } | null;
  agents: Agent[];
  allLabels: ChatLabel[];
  leadSources: LeadSource[];
  status: ChatStatus;
  assigned: { id: string; name: string } | null;
  resolved: boolean;
  onAct: (leaf: string, payload: unknown) => Promise<void>;
  onChanged: () => void;
}

export function CustomerPanel({ current, thread, me, agents, allLabels, leadSources, status, assigned, resolved, onAct, onChanged }: Props) {
  const [open, setOpen] = useState<'lead' | 'reminder' | 'meeting' | null>(null);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const name = thread?.client?.name || current.name;
  const openReminders = (thread?.reminders ?? []).filter((r) => !r.doneAt);
  const next = openReminders[0];
  const deals = thread?.deals ?? [];
  const deal = deals[0];
  const isSales = me?.role === 'sales';

  const copy = async () => { try { await navigator.clipboard.writeText(`+${current.phone}`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };
  const done = async (r: ReminderItem) => { const x = await call(`/reminders/${encodeURIComponent(r.id)}/done`, { done: !r.doneAt }); if (!x.ok) setErr(x.error); else onChanged(); };
  const moveStage = async (dealId: string, stage: string) => { setErr(''); const x = await call(`/deals/${encodeURIComponent(dealId)}/stage`, { stage }); if (!x.ok) setErr(x.error); else onChanged(); };

  const who = status === 'human' ? (assigned ? `With ${assigned.name}` : 'With a salesperson') : status === 'bot' ? 'Bot is answering' : status === 'off' ? 'Bot is off' : 'New chat';
  const whoClass = status === 'human' ? 'bg-ok-soft text-ok' : status === 'bot' ? 'bg-brand-soft text-brand-dark' : 'bg-[#eef2f6] text-ink-soft';

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col overflow-y-auto border-l border-line bg-panel xl:flex" aria-label="Customer">
      {/* ------------------------------------------------ 1. who this is */}
      <section className="px-5 pb-4 pt-5">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-full text-[17px] font-bold text-white" style={{ background: avatarColor(current.name) }} aria-hidden="true">{current.initials}</span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[16px] font-extrabold leading-tight">{name}</h2>
            {chatChannel(current.phone) === 'whatsapp' ? (
              <button onClick={copy} className="mt-0.5 inline-flex items-center gap-1 rounded text-[12.5px] text-ink-soft hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-brand" title="Copy the number">
                +{current.phone}<Icon d={copied ? I.check : I.copy} size={12} />{copied && <span className="text-[11px] text-ok">Copied</span>}
              </button>
            ) : <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12.5px] text-ink-soft"><ChannelMark channel={chatChannel(current.phone)} size={14} />{CHANNEL_NAME[chatChannel(current.phone)]} DM, no phone number</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${whoClass}`}>{who}</span>
              {resolved && <span className="rounded-full bg-[#eef2f6] px-2 py-0.5 text-[11px] font-bold text-ink-soft">Resolved</span>}
              {thread?.source && thread.source.channel !== 'unknown' && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-dark" title={thread.source.label ?? undefined}>From {channelLabel(thread.source.channel)}</span>}
              {thread?.client && <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-bold text-ok">Client in the ERP</span>}
            </div>
          </div>
        </div>
        {thread && <Labels groupId={thread.id} onChat={thread.labels ?? []} all={allLabels} onChanged={onChanged} />}
      </section>

      {/* ------------------------------------------------ 2. what to do next */}
      <section className="space-y-3 border-t border-line bg-brand-softer px-5 py-4" aria-label="Next step">
        {next && (
          <div className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${next.state === 'overdue' ? 'border-bad/30 bg-bad-soft' : next.state === 'today' ? 'border-warn/30 bg-warn-soft' : 'border-brand/20 bg-white'}`}>
            <span className={`mt-0.5 ${next.state === 'overdue' ? 'text-bad' : next.state === 'today' ? 'text-warn' : 'text-brand-dark'}`}><Icon d={I.bell} /></span>
            <div className="min-w-0 flex-1">
              <p className={`text-[12.5px] font-extrabold ${next.state === 'overdue' ? 'text-bad' : next.state === 'today' ? 'text-warn' : 'text-ink'}`}>
                {next.state === 'overdue' ? 'Follow-up overdue' : next.state === 'today' ? `Follow up today at ${timeLabel(next.dueAt)}` : `Follow up ${dateTimeLabel(next.dueAt)}`}
              </p>
              {next.note && <p className="text-[12.5px] text-ink">{next.note}</p>}
              <p className="text-[11px] text-ink-soft">For {next.assignedName || 'the team'}{openReminders.length > 1 ? `, and ${openReminders.length - 1} more` : ''}</p>
            </div>
            <button onClick={() => void done(next)} className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11.5px] font-bold text-ok ring-1 ring-ok/30 hover:bg-ok-soft">Done</button>
          </div>
        )}

        {thread?.meeting ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-ok/30 bg-ok-soft px-3 py-2.5">
            <span className="mt-0.5 text-ok"><Icon d={I.check} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-extrabold text-ok">Free consultation booked</p>
              <p className="text-[12.5px] text-ink">{dateTimeLabel(thread.meeting.startsAt)} WIB</p>
              <p className="text-[11px] text-ink-soft">{thread.meeting.confirmed ? 'The lead confirmed (YA).' : thread.meeting.wantsOtherTime ? 'The lead asked for another time.' : thread.meeting.confirmAsked ? 'Asked to confirm, no answer yet.' : 'The lead is asked to confirm an hour before.'}{thread.meeting.owner ? ` With ${thread.meeting.owner}.` : ''}{thread.meeting.meetUrl ? '' : ' No Meet link yet: send one yourself.'}</p>
            </div>
            {thread.meeting.meetUrl && <a href={thread.meeting.meetUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11.5px] font-bold text-ok ring-1 ring-ok/30 hover:bg-ok-soft">Open Meet</a>}
          </div>
        ) : thread && (
          <button className={`${btnSecondary} w-full`} onClick={() => setOpen(open === 'meeting' ? null : 'meeting')} aria-expanded={open === 'meeting'}><Icon d={I.bell} size={14} />Book a free consultation</button>
        )}
        {open === 'meeting' && thread && !thread.meeting && <MeetingForm groupId={thread.id} onDone={() => { setOpen(null); onChanged(); }} onCancel={() => setOpen(null)} />}

        <div className="grid grid-cols-2 gap-2">
          {!deal
            ? <button className={btnPrimary} onClick={() => setOpen(open === 'lead' ? null : 'lead')} aria-expanded={open === 'lead'}><Icon d={I.funnel} size={14} />Add to pipeline</button>
            : <button className={btnSecondary} onClick={() => setOpen(open === 'lead' ? null : 'lead')} aria-expanded={open === 'lead'}><Icon d={I.plus} size={14} />Another deal</button>}
          <button className={deal ? btnPrimary : btnSecondary} onClick={() => setOpen(open === 'reminder' ? null : 'reminder')} aria-expanded={open === 'reminder'}><Icon d={I.bell} size={14} />Set reminder</button>
        </div>

        {open === 'lead' && thread && <LeadForm thread={thread} me={me} agents={agents} onDone={() => { setOpen(null); onChanged(); }} onCancel={() => setOpen(null)} />}
        {open === 'reminder' && thread && <ReminderForm groupId={thread.id} agents={agents} me={me} onDone={() => { setOpen(null); onChanged(); }} onCancel={() => setOpen(null)} />}
        {err && <p role="alert" className="text-[12px] text-bad">{err}</p>}
      </section>

      {/* ------------------------------------------------ 3. where the deal stands */}
      {deals.length > 0 && (
        <section className="space-y-4 border-t border-line px-5 py-4" aria-label="Deals">
          {deals.map((d) => {
            const mine = !isSales || !d.salesId || d.salesId === me?.id;
            const cold = d.stage === 'Cold Case';
            const at = PIPELINE.indexOf(d.stage as (typeof PIPELINE)[number]);
            return (
              <div key={d.id}>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="min-w-0 truncate text-[13.5px] font-extrabold">{d.title}</h3>
                  <span className="shrink-0 text-[13px] font-bold text-ink">{d.value ? `Rp ${d.value.toLocaleString('id-ID')}` : ''}</span>
                </div>
                <p className="text-[11.5px] text-ink-soft">{d.sales ? `Owned by ${d.sales}` : 'No owner'}{!mine ? ', so only they can move it' : ''}</p>
                {cold ? (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-[#eef2f6] px-3 py-2 text-[12.5px]">
                    <span className="font-bold text-ink-soft">Gone cold</span>
                    {mine && <button className={btnText} onClick={() => void moveStage(d.id, 'Lead')}>Bring back as lead</button>}
                  </div>
                ) : (
                  <>
                    <ol className="mt-2 grid grid-cols-5 gap-1" aria-label="Stage">
                      {PIPELINE.map((s, i) => {
                        const reached = at >= i;
                        const now = at === i;
                        const can = mine && MANUAL.has(s) && !(d.stage === 'Invoice' || d.stage === 'Deal') && !now;
                        return (
                          <li key={s}>
                            <button disabled={!can} onClick={() => void moveStage(d.id, s)} aria-current={now ? 'step' : undefined}
                              title={can ? `Move to ${s}` : s === 'Invoice' || s === 'Deal' ? `${s} is set by the invoice and payment in the ERP` : now ? 'Current stage' : undefined}
                              className={`group w-full text-left ${can ? 'cursor-pointer' : 'cursor-default'}`}>
                              <span className={`block h-1.5 rounded-full transition ${reached ? (s === 'Deal' ? 'bg-ok' : 'bg-brand') : 'bg-[#dbe8f4]'} ${can ? 'group-hover:bg-brand/50' : ''}`} />
                              <span className={`mt-1 block truncate text-[10.5px] ${now ? 'font-extrabold text-ink' : 'text-ink-soft'} ${can ? 'group-hover:text-brand-dark' : ''}`}>{s === 'Negotiation' ? 'Nego' : s}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                    {mine && MANUAL.has(d.stage) && <button className={`${btnText} mt-2`} onClick={() => void moveStage(d.id, 'Cold Case')}>Mark as gone cold</button>}
                  </>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* ------------------------------------------------ 4. details, folded */}
      <div className="border-t border-line">
        <Fold title="Profile" hint={thread?.client ? `${thread.client.sales ? `Sales: ${thread.client.sales}` : 'Client'}` : thread?.bot.lead?.store || 'Not a client yet'}>
          <dl className="space-y-1.5 text-[12.5px]">
            <Row k="In the ERP" v={thread?.client ? thread.client.name : 'Not yet'} />
            {thread?.client?.sales && <Row k="Salesperson" v={thread.client.sales} />}
            {thread?.client?.serviceEnd && <Row k="Project ends" v={thread.client.serviceEnd} />}
            {thread?.bot.lead?.name && <Row k="Name (told the bot)" v={thread.bot.lead.name} />}
            {thread?.bot.lead?.store && <Row k="Store" v={thread.bot.lead.store} />}
            {thread?.bot.lead?.need && <Row k="Needs" v={thread.bot.lead.need} />}
            {(thread?.answers ?? []).map((a) => <Row key={a.field} k={`Answered: ${a.field}`} v={a.value} />)}
          </dl>
        </Fold>

        <Fold title="Source" hint={thread?.source ? (thread.source.label || channelLabel(thread.source.channel)) : 'Not known yet'}>
          {thread?.firstMessage && <blockquote className="mb-2 border-l-4 border-brand/40 pl-2.5 text-[12.5px] italic text-ink-soft">&ldquo;{thread.firstMessage}&rdquo;</blockquote>}
          <dl className="mb-2 space-y-1.5 text-[12.5px]">
            <Row k="Channel" v={thread?.source ? channelLabel(thread.source.channel) : 'Unknown'} />
            <Row k="Ad" v={thread?.source?.label || 'No ad matched'} />
            {thread?.source?.by && <Row k="Set by" v={thread.source.by} />}
          </dl>
          <label className="block text-[11.5px] font-semibold text-ink-soft">Wrong? Pick the right ad
            <select value={thread?.sourceId ?? ''} onChange={(e) => void onAct('source', { sourceId: e.target.value || null })} className={`${input} mt-1 py-1.5 text-[12.5px]`}>
              <option value="">No ad / unknown</option>
              {thread?.sourceId && !leadSources.some((x) => x.id === thread.sourceId) && <option value={thread.sourceId}>{thread.source?.label}</option>}
              {leadSources.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </label>
        </Fold>

        <Fold title="Bot" hint={status === 'bot' ? `Answering, ${thread?.bot.replies ?? current.botReplies} sent` : status === 'off' ? 'Off for this chat' : status === 'human' ? 'Stepped back' : 'Not started'}>
          <dl className="space-y-1.5 text-[12.5px]">
            <Row k="Messages sent" v={String(thread?.bot.replies ?? current.botReplies)} />
            {thread?.bot.reason && <Row k="Why it stopped" v={thread.bot.reason} />}
            {thread?.flowWaiting && <Row k={`Flow "${thread.flowWaiting.flow}"`} v={thread.flowWaiting.kind === 'answer' ? `waiting for the answer (${thread.flowWaiting.field})` : `waiting until ${thread.flowWaiting.until ? timeLabel(thread.flowWaiting.until) : 'later'}`} />}
          </dl>
          {status !== 'off' && <button onClick={() => void onAct('status', { status: 'off' })} className={`${btnText} mt-2`}>Switch the bot off for this chat</button>}
        </Fold>

        {(thread?.reminders ?? []).length > 0 && (
          <Fold title="Follow-ups" hint={`${openReminders.length} open`}>
            <ul className="space-y-1.5">
              {(thread?.reminders ?? []).map((r) => (
                <li key={r.id} className={`flex items-start gap-2 text-[12.5px] ${r.doneAt ? 'opacity-60' : ''}`}>
                  <input type="checkbox" checked={!!r.doneAt} onChange={() => void done(r)} aria-label="Done" className="mt-0.5 h-4 w-4 accent-[#2f9bf0]" />
                  <div className="min-w-0">
                    <div className={`font-semibold ${r.doneAt ? 'line-through' : r.state === 'overdue' ? 'text-bad' : ''}`}>{dateTimeLabel(r.dueAt)}</div>
                    {r.note && <div>{r.note}</div>}
                    <div className="text-[11px] text-ink-soft">For {r.assignedName || 'the team'}{r.doneAt ? `, done by ${r.doneBy || 'someone'}` : ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Fold>
        )}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ small pieces */
function Fold({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-line">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-[13px] hover:bg-brand-softer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
        <span className="text-ink-soft transition group-open:rotate-90"><Icon d={I.chevron} size={14} /></span>
        <span className="font-bold">{title}</span>
        <span className="ml-auto max-w-[60%] truncate text-right text-[12px] text-ink-soft">{hint}</span>
      </summary>
      <div className="px-5 pb-4 pt-0.5">{children}</div>
    </details>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-3"><dt className="text-ink-soft">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
);

function Labels({ groupId, onChat, all, onChanged }: { groupId: string; onChat: ChatLabel[]; all: ChatLabel[]; onChanged: () => void }) {
  const [picking, setPicking] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const has = new Set(onChat.map((l) => l.id));
  const setTo = async (ids: string[]) => { setBusy(true); setErr(''); const r = await call(`/conversations/${encodeURIComponent(groupId)}/labels`, { labelIds: ids }); setBusy(false); if (!r.ok) setErr(r.error); else onChanged(); };
  const create = async () => {
    setBusy(true); setErr('');
    const r = await call('/labels', { name, color });
    if (!r.ok) { setBusy(false); setErr(r.error); return; }
    const list = await call<{ labels: ChatLabel[] }>('/labels');
    const made = list.ok ? list.data.labels.find((l) => l.name.toLowerCase() === name.trim().toLowerCase()) : undefined;
    setName(''); setBusy(false);
    if (made) await setTo([...has, made.id]); else onChanged();
  };
  const unused = all.filter((l) => !has.has(l.id));

  return (
    <div className="mt-3 pl-[60px]">
      <div className="flex flex-wrap items-center gap-1.5">
        {onChat.map((l) => (
          <span key={l.id} className={`inline-flex items-center gap-1 rounded-full py-0.5 pl-2 pr-1 text-[11.5px] font-bold ${LABEL_CLASS[l.color] ?? LABEL_CLASS.blue}`}>
            {l.name}
            <button disabled={busy} onClick={() => void setTo([...has].filter((x) => x !== l.id))} aria-label={`Remove the label ${l.name}`} className="rounded-full px-1 leading-none opacity-60 hover:opacity-100">×</button>
          </span>
        ))}
        <button onClick={() => setPicking(!picking)} aria-expanded={picking} className="rounded-full border border-dashed border-ink-soft/40 px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft hover:border-brand hover:text-brand-dark">+ Label</button>
      </div>
      {picking && (
        <div className="mt-2 rounded-xl border border-line bg-white p-2.5 shadow-sm">
          {unused.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {unused.map((l) => <button key={l.id} disabled={busy} onClick={() => { void setTo([...has, l.id]); setPicking(false); }} className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${LABEL_CLASS[l.color] ?? LABEL_CLASS.blue} hover:ring-1 hover:ring-current`}>{l.name}</button>)}
            </div>
          )}
          <form className="flex items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); if (name.trim()) void create(); }}>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder={unused.length ? 'Or make a new one' : 'New label, e.g. Hot lead'} className={`${input} py-1.5 text-[12.5px]`} aria-label="New label name" />
            <button className={`${btnPrimary} px-2.5 py-1.5`} disabled={busy || !name.trim()}>Add</button>
          </form>
          {name.trim() && <div className="mt-1.5 flex gap-1" role="radiogroup" aria-label="Colour">{COLORS.map((c) => <button type="button" key={c} role="radio" aria-checked={color === c} aria-label={c} onClick={() => setColor(c)} className={`h-4 w-4 rounded-full ${LABEL_CLASS[c]} ${color === c ? 'ring-2 ring-ink ring-offset-1' : ''}`} />)}</div>}
          {err && <p role="alert" className="mt-1 text-[11.5px] text-bad">{err}</p>}
        </div>
      )}
    </div>
  );
}

function LeadForm({ thread, me, agents, onDone, onCancel }: { thread: Thread; me: { id: string; role: string } | null; agents: Agent[]; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({ name: thread.client?.name || thread.bot.lead?.name || thread.name, title: '', value: '', store: thread.bot.lead?.store || '', notes: thread.bot.lead?.need || '', salesmanId: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => { setBusy(true); setErr(''); const r = await call(`/conversations/${encodeURIComponent(thread.id)}/lead`, f); setBusy(false); if (!r.ok) setErr(r.error); else onDone(); };
  return (
    <form className="space-y-2 rounded-xl border border-line bg-white p-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      {!thread.client && <label className="block text-[11.5px] font-semibold text-ink-soft">Client name<input className={`${input} mt-1`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={160} /></label>}
      <label className="block text-[11.5px] font-semibold text-ink-soft">What they want<input className={`${input} mt-1`} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={160} placeholder="Paket Optimize Shopee" autoFocus /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[11.5px] font-semibold text-ink-soft">Value (Rp)<input className={`${input} mt-1`} inputMode="numeric" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder="3000000" /></label>
        {!thread.client && <label className="block text-[11.5px] font-semibold text-ink-soft">Store<input className={`${input} mt-1`} value={f.store} onChange={(e) => setF({ ...f, store: e.target.value })} maxLength={160} /></label>}
      </div>
      <label className="block text-[11.5px] font-semibold text-ink-soft">Notes<textarea className={`${input} mt-1 h-14 resize-none`} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} maxLength={1000} /></label>
      {me?.role !== 'sales' && agents.length > 0 && (
        <label className="block text-[11.5px] font-semibold text-ink-soft">Owner<select className={`${input} mt-1`} value={f.salesmanId} onChange={(e) => setF({ ...f, salesmanId: e.target.value })}><option value="">Me</option>{agents.filter((a) => a.id !== me?.id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
      )}
      <p className="text-[11px] text-ink-soft">{thread.client ? 'Adds a deal for this client in the ERP pipeline, at "Lead".' : 'Adds this number as a prospect client in the ERP, with a deal at "Lead".'}</p>
      {err && <p role="alert" className="text-[12px] text-bad">{err}</p>}
      <div className="flex gap-2"><button className={btnPrimary} disabled={busy}>{busy ? 'Adding...' : 'Add to pipeline'}</button><button type="button" className={btnText} onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const at = (days: number, hour: number) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return d; };
const PRESETS: Array<[string, () => Date]> = [['In 1 hour', () => new Date(Date.now() + 3600000)], ['Tomorrow 9:00', () => at(1, 9)], ['In 3 days', () => at(3, 9)], ['Next week', () => at(7, 9)]];

/** The team books a free consultation for this chat: pick a free time; the lead gets the time and Meet link in the chat. */
function MeetingForm({ groupId, onDone, onCancel }: { groupId: string; onDone: () => void; onCancel: () => void }) {
  const [slots, setSlots] = useState<FreeSlot[] | null>(null);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { void call<{ slots: FreeSlot[] }>('/meetings/slots').then((r) => (r.ok ? setSlots(r.data.slots) : setErr(r.error))); }, []);
  const book = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pick) return;
    setBusy(true); setErr(null);
    const r = await call<{ ok: true; sent: boolean; detail: string }>(`/conversations/${encodeURIComponent(groupId)}/meeting`, { start: pick });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    if (!r.data.sent) setErr(`Booked, but the message to the lead failed: ${r.data.detail}`);
    onDone();
  };
  return (
    <form onSubmit={book} className="space-y-2 rounded-xl border border-line bg-white p-3">
      {slots === null && !err && <p className="text-[12px] text-ink-soft">Finding free times...</p>}
      {slots?.length === 0 && <p className="text-[12px] text-ink-soft">No free time in the bookable hours. Change them in Jadwal, or check that booking is switched on.</p>}
      {slots && slots.length > 0 && <SlotPicker codes={slots.map((x) => x.code)} value={pick} onChange={setPick} disabled={busy} />}
      {pick && <p className="rounded-lg bg-brand-soft px-3 py-2 text-[12.5px] font-bold text-brand-dark">{dayTitle(dayKeyOf(pick))}, {clockOf(pick)} WIB</p>}
      <p className="text-[11px] text-ink-soft">The lead gets the time and the Google Meet link in this chat.</p>
      {err && <p role="alert" className="text-[12px] text-bad">{err}</p>}
      <div className="flex gap-2"><button className={btnPrimary} disabled={busy || !pick}>{busy ? 'Booking...' : pick ? `Book ${clockOf(pick)} and send` : 'Pick a time'}</button><button type="button" className={btnText} onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function ReminderForm({ groupId, agents, me, onDone, onCancel }: { groupId: string; agents: Agent[]; me: { id: string } | null; onDone: () => void; onCancel: () => void }) {
  const [when, setWhen] = useState(localInput(at(1, 9)));
  const [preset, setPreset] = useState('Tomorrow 9:00');
  const [note, setNote] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => { setBusy(true); setErr(''); const r = await call(`/conversations/${encodeURIComponent(groupId)}/reminders`, { dueAt: new Date(when).toISOString(), note, assignTo: assignTo || undefined }); setBusy(false); if (!r.ok) setErr(r.error); else onDone(); };
  return (
    <form className="space-y-2 rounded-xl border border-line bg-white p-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="When">
        {PRESETS.map(([label, fn]) => (
          <button type="button" key={label} role="radio" aria-checked={preset === label} onClick={() => { setPreset(label); setWhen(localInput(fn())); }}
            className={`rounded-lg px-2 py-1.5 text-[12px] font-bold transition ${preset === label ? 'bg-brand text-white' : 'bg-brand-soft text-brand-dark hover:bg-[#d4e9fb]'}`}>{label}</button>
        ))}
      </div>
      <input type="datetime-local" value={when} onChange={(e) => { setWhen(e.target.value); setPreset(''); }} aria-label="Or pick a date and time" className={input} />
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="What to do, e.g. send the proposal" className={input} aria-label="What to do" autoFocus />
      {agents.length > 1 && <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} aria-label="Who" className={input}><option value="">For me</option>{agents.filter((a) => a.id !== me?.id).map((a) => <option key={a.id} value={a.id}>For {a.name}</option>)}</select>}
      <p className="text-[11px] text-ink-soft">Also added as a task in the ERP planner.</p>
      {err && <p role="alert" className="text-[12px] text-bad">{err}</p>}
      <div className="flex gap-2"><button className={btnPrimary} disabled={busy || !when}>{busy ? 'Saving...' : 'Set reminder'}</button><button type="button" className={btnText} onClick={onCancel}>Cancel</button></div>
    </form>
  );
}
