'use client';

import React, { useState } from 'react';
import type { Agent, ChatLabel, ReminderItem, Thread } from '@/lib/types';
import { dateTimeLabel } from '@/lib/format';

/**
 * The customer panel's batch-2 blocks: labels on the chat, the lead and its deals in the ERP pipeline (with the stage), and follow-up reminders.
 * Each block talks to this app's own /api routes, which forward to the ERP with the person's login.
 */

async function call<T>(path: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api${path}`, { method: body === undefined ? 'GET' : 'POST', cache: 'no-store', headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = await res.json().catch(() => null);
    return res.ok ? { ok: true, data: j as T } : { ok: false, error: String(j?.error || 'Something went wrong.') };
  } catch { return { ok: false, error: 'No connection.' }; }
}

export const LABEL_CLASS: Record<string, string> = {
  blue: 'bg-brand-soft text-brand-dark', green: 'bg-ok-soft text-ok', amber: 'bg-warn-soft text-warn', red: 'bg-bad-soft text-bad',
  violet: 'bg-[#efeafe] text-[#6b5bd6]', teal: 'bg-[#dff6f3] text-[#0f8a7e]', pink: 'bg-[#fde7f1] text-[#c2367a]', gray: 'bg-[#eef2f6] text-ink-soft',
};
const COLORS = Object.keys(LABEL_CLASS);
const STAGES = ['Lead', 'Contacted', 'Negotiation', 'Cold Case'];
const field = 'w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12px] text-ink outline-none focus:border-brand';
const small = 'rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-bold text-ink-soft transition hover:border-brand hover:text-brand-dark disabled:opacity-50';
const primary = 'rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50';

function Err({ text }: { text: string }) { return text ? <p role="alert" className="mt-1 text-[11.5px] text-bad">{text}</p> : null; }

/* ------------------------------------------------------------------ labels */
export function LabelsBlock({ groupId, onChat, all, onChanged }: { groupId: string; onChat: ChatLabel[]; all: ChatLabel[]; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState('blue');
  const has = new Set(onChat.map((l) => l.id));

  const setTo = async (ids: string[]) => {
    setBusy(true); setErr('');
    const r = await call(`/conversations/${encodeURIComponent(groupId)}/labels`, { labelIds: ids });
    setBusy(false);
    if (!r.ok) setErr(r.error); else onChanged();
  };
  const create = async () => {
    setBusy(true); setErr('');
    const r = await call('/labels', { name, color });
    if (!r.ok) { setBusy(false); setErr(r.error); return; }
    const list = await call<{ labels: ChatLabel[] }>('/labels');
    const made = list.ok ? list.data.labels.find((l) => l.name.toLowerCase() === name.trim().toLowerCase()) : undefined;
    setName(''); setAdding(false); setBusy(false);
    if (made) await setTo([...has, made.id]); else onChanged();
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {all.length === 0 && !adding && <p className="text-[12px] text-ink-soft">No labels yet.</p>}
        {all.map((l) => {
          const on = has.has(l.id);
          return (
            <button key={l.id} disabled={busy} onClick={() => void setTo(on ? [...has].filter((x) => x !== l.id) : [...has, l.id])} aria-pressed={on}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${on ? `${LABEL_CLASS[l.color] ?? LABEL_CLASS.blue} ring-1 ring-current` : 'bg-white text-ink-soft ring-1 ring-line hover:ring-brand'}`}>
              {on ? '✓ ' : '+ '}{l.name}
            </button>
          );
        })}
      </div>
      {adding ? (
        <form className="mt-2 space-y-1.5" onSubmit={(e) => { e.preventDefault(); void create(); }}>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={30} placeholder="Label name, e.g. Hot lead" className={field} />
          <div className="flex flex-wrap gap-1">{COLORS.map((c) => <button type="button" key={c} onClick={() => setColor(c)} aria-label={c} className={`h-5 w-5 rounded-full ${LABEL_CLASS[c]} ${color === c ? 'ring-2 ring-ink' : ''}`} />)}</div>
          <div className="flex gap-1.5"><button className={primary} disabled={busy || !name.trim()}>Add label</button><button type="button" className={small} onClick={() => setAdding(false)}>Cancel</button></div>
        </form>
      ) : <button onClick={() => setAdding(true)} className="mt-2 text-[11.5px] font-semibold text-brand-dark hover:underline">+ New label</button>}
      <Err text={err} />
    </div>
  );
}

/* ------------------------------------------------------------------ the lead and its deals */
export function LeadBlock({ thread, me, agents, onChanged }: { thread: Thread; me: { id: string; role: string } | null; agents: Agent[]; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [f, setF] = useState({ name: thread.client?.name || thread.bot.lead?.name || thread.name, title: '', value: '', store: thread.bot.lead?.store || '', notes: thread.bot.lead?.need || '', salesmanId: '' });
  const isSales = me?.role === 'sales';

  const create = async () => {
    setBusy(true); setErr('');
    const r = await call<{ ok: true; newClient: boolean }>(`/conversations/${encodeURIComponent(thread.id)}/lead`, f);
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setOpen(false); onChanged();
  };
  const move = async (dealId: string, stage: string) => {
    setErr('');
    const r = await call(`/deals/${encodeURIComponent(dealId)}/stage`, { stage });
    if (!r.ok) setErr(r.error); else onChanged();
  };

  return (
    <div>
      {thread.deals.length > 0 && (
        <ul className="mb-2 space-y-2">
          {thread.deals.map((d) => {
            const locked = d.stage === 'Invoice' || d.stage === 'Deal';
            const mine = !isSales || !d.salesId || d.salesId === me?.id;
            return (
              <li key={d.id} className="rounded-lg border border-line p-2 text-[12.5px]">
                <div className="font-semibold">{d.title}</div>
                <div className="mt-1 flex items-center justify-between gap-2 text-ink-soft">
                  {locked || !mine ? <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10.5px] font-bold text-brand-dark" title={locked ? 'Moves on through the invoice in the ERP' : 'Another salesperson owns this deal'}>{d.stage}</span> : (
                    <select value={d.stage} onChange={(e) => void move(d.id, e.target.value)} aria-label="Deal stage" className="rounded-lg border border-line bg-white px-2 py-1 text-[11.5px] font-bold text-brand-dark outline-none focus:border-brand">
                      {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  <span>{d.value ? `Rp ${d.value.toLocaleString('id-ID')}` : ''}</span>
                </div>
                {d.sales && <div className="mt-0.5 text-[11px] text-ink-soft">Sales: {d.sales}</div>}
              </li>
            );
          })}
        </ul>
      )}
      {!open ? (
        <button onClick={() => setOpen(true)} className={primary}>{thread.deals.length ? '+ Another deal' : 'Make this a lead'}</button>
      ) : (
        <form className="space-y-1.5" onSubmit={(e) => { e.preventDefault(); void create(); }}>
          {!thread.client && <label className="block text-[11px] font-semibold text-ink-soft">Client name<input className={field} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={160} /></label>}
          <label className="block text-[11px] font-semibold text-ink-soft">What is the deal about<input className={field} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={160} placeholder="Paket Optimize Shopee" /></label>
          <label className="block text-[11px] font-semibold text-ink-soft">Value (Rp)<input className={field} inputMode="numeric" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} placeholder="3000000" /></label>
          {!thread.client && <label className="block text-[11px] font-semibold text-ink-soft">Store<input className={field} value={f.store} onChange={(e) => setF({ ...f, store: e.target.value })} maxLength={160} /></label>}
          <label className="block text-[11px] font-semibold text-ink-soft">Notes<textarea className={`${field} h-14 resize-none`} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} maxLength={1000} /></label>
          {!isSales && agents.length > 0 && (
            <label className="block text-[11px] font-semibold text-ink-soft">Salesperson
              <select className={field} value={f.salesmanId} onChange={(e) => setF({ ...f, salesmanId: e.target.value })}><option value="">Me</option>{agents.filter((a) => a.id !== me?.id).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
            </label>
          )}
          <p className="text-[11px] text-ink-soft">{thread.client ? 'A new deal is added to this client in the ERP pipeline, in the stage "Lead".' : 'A new prospect client (with this number and where the lead came from) and a deal in the stage "Lead" are added to the ERP pipeline.'}</p>
          <div className="flex gap-1.5"><button className={primary} disabled={busy}>{busy ? 'Saving...' : 'Add to the pipeline'}</button><button type="button" className={small} onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      )}
      <Err text={err} />
    </div>
  );
}

/* ------------------------------------------------------------------ follow-up reminders */
const pad = (n: number) => String(n).padStart(2, '0');
/** A value for <input type="datetime-local"> in the browser's own time. */
const localInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const at = (days: number, hour: number) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(hour, 0, 0, 0); return d; };
const PRESETS: Array<[string, () => Date]> = [['In 1 hour', () => new Date(Date.now() + 3600000)], ['Tomorrow 09:00', () => at(1, 9)], ['In 3 days', () => at(3, 9)], ['Next week', () => at(7, 9)]];
const STATE_CLASS = { overdue: 'text-bad', today: 'text-warn', later: 'text-ink-soft' } as const;

export function RemindersBlock({ thread, agents, me, onChanged }: { thread: Thread; agents: Agent[]; me: { id: string } | null; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState(localInput(at(1, 9)));
  const [note, setNote] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const add = async () => {
    setBusy(true); setErr('');
    const r = await call(`/conversations/${encodeURIComponent(thread.id)}/reminders`, { dueAt: new Date(when).toISOString(), note, assignTo: assignTo || undefined });
    setBusy(false);
    if (!r.ok) { setErr(r.error); return; }
    setOpen(false); setNote(''); onChanged();
  };
  const done = async (r: ReminderItem) => {
    const res = await call(`/reminders/${encodeURIComponent(r.id)}/done`, { done: !r.doneAt });
    if (!res.ok) setErr(res.error); else onChanged();
  };

  return (
    <div>
      {thread.reminders.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {thread.reminders.map((r) => (
            <li key={r.id} className={`flex items-start gap-2 rounded-lg border border-line p-2 text-[12px] ${r.doneAt ? 'opacity-60' : ''}`}>
              <input type="checkbox" checked={!!r.doneAt} onChange={() => void done(r)} aria-label="Done" className="mt-0.5 h-4 w-4 accent-[#2f9bf0]" />
              <div className="min-w-0">
                <div className={`font-bold ${r.doneAt ? 'line-through' : STATE_CLASS[r.state]}`}>{r.state === 'overdue' && !r.doneAt ? 'Overdue · ' : ''}{dateTimeLabel(r.dueAt)}</div>
                {r.note && <div className="text-ink">{r.note}</div>}
                <div className="text-[11px] text-ink-soft">For {r.assignedName || 'Team'}{r.doneAt ? ` · done by ${r.doneBy || 'someone'}` : ''}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {!open ? <button onClick={() => setOpen(true)} className={primary}>+ Follow-up reminder</button> : (
        <form className="space-y-1.5" onSubmit={(e) => { e.preventDefault(); void add(); }}>
          <div className="flex flex-wrap gap-1">{PRESETS.map(([label, fn]) => <button type="button" key={label} onClick={() => setWhen(localInput(fn()))} className={small}>{label}</button>)}</div>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="When" className={field} />
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="What to do, e.g. send the proposal" className={field} />
          {agents.length > 0 && (
            <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} aria-label="For" className={field}>
              <option value="">For me</option>{agents.filter((a) => a.id !== me?.id).map((a) => <option key={a.id} value={a.id}>For {a.name}</option>)}
            </select>
          )}
          <p className="text-[11px] text-ink-soft">It also appears as a task in the ERP planner.</p>
          <div className="flex gap-1.5"><button className={primary} disabled={busy || !when}>{busy ? 'Saving...' : 'Set reminder'}</button><button type="button" className={small} onClick={() => setOpen(false)}>Cancel</button></div>
        </form>
      )}
      <Err text={err} />
    </div>
  );
}
