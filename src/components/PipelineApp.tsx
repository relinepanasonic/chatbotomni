'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { BoardDeal, BoardResponse } from '@/lib/types';
import { DROP_OK, FILTER_STAGES, LOCKED, LOST, PAYMENT_CHIP, PAYMENT_LABEL, STAGE_CHIP, STAGE_HINT, STUCK_DAYS, stageLabel, stageTone } from '@/lib/pipeline';
import { rpShort } from '@/lib/format';
import { PageHeader } from './PageHeader';
import { Rail } from './Rail';

/**
 * Pipeline: the same deals as the ERP's Sales Pipeline, one column per stage. Drag a card to move it (or use "Move to" on the card, which also works
 * on a phone); the ERP applies its own rules: the three stages after Negotiation are set by the invoice request, the invoice and the payment, and a
 * salesperson only moves their own deals. A card opens its chat.
 */
async function load(): Promise<{ ok: true; data: BoardResponse } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/pipeline', { cache: 'no-store' });
    const j = await res.json().catch(() => null);
    return res.ok ? { ok: true, data: j as BoardResponse } : { ok: false, error: String(j?.error || (res.status === 401 ? 'Please sign in again.' : 'Could not load the pipeline.')) };
  } catch { return { ok: false, error: 'No connection.' }; }
}

const clock = (iso: string) => new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(new Date(iso));
const initials = (n: string | null) => (n || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export function PipelineApp({ demo }: { demo: boolean }) {
  const [data, setData] = useState<BoardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [who, setWho] = useState('');
  const [q, setQ] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [phoneStage, setPhoneStage] = useState('Lead');      // on a phone one stage is shown at a time

  const run = useCallback(async () => {
    const r = await load();
    if (!r.ok) setError(r.error); else { setError(null); setData(r.data); }
  }, []);
  useEffect(() => { void run(); const t = setInterval(() => { if (!document.hidden) void run(); }, 60000); return () => clearInterval(t); }, [run]);

  const people = useMemo(() => [...new Set((data?.deals ?? []).map((d) => d.sales).filter(Boolean) as string[])].sort(), [data]);
  const shown = useMemo(() => (data?.deals ?? []).filter((d) => (!who || d.sales === who) && (!q.trim() || `${d.client} ${d.title} ${d.sales ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))), [data, who, q]);

  const move = async (deal: BoardDeal, stage: string) => {
    if (deal.stage === stage) return;
    if (LOCKED.has(deal.stage)) { setNotice(deal.stage === 'Invoice Requested' ? 'The invoice is requested. Cancel the request in the ERP first to move this card.' : 'From here the invoice and the payment in the ERP move it on.'); return; }
    if (!DROP_OK.has(stage)) { setNotice(stage === 'Deal' ? 'A card becomes an Active Client when its invoice is paid.' : 'A card moves there with Request invoice in the ERP, and when Accounting makes the invoice.'); return; }
    const before = data;
    setNotice(null);
    setData((d) => (d ? { ...d, deals: d.deals.map((x) => (x.id === deal.id ? { ...x, stage, daysInStage: 0 } : x)) } : d));
    try {
      const res = await fetch(`/api/deals/${encodeURIComponent(deal.id)}/stage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }) });
      const j = await res.json().catch(() => null);
      if (!res.ok) { setData(before); setNotice(String(j?.error || 'Could not move the card.')); } else void run();
    } catch { setData(before); setNotice('No connection.'); }
  };

  const columns = data?.stages?.length ? [...data.stages.filter((s) => s !== LOST), LOST] : [...FILTER_STAGES];
  const byId = (id: string | null) => data?.deals.find((d) => d.id === id) ?? null;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg text-ink max-md:pb-16">
      <Rail active="pipeline" />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="px-4 pt-6 sm:px-6"><PageHeader title="Pipeline" demo={demo} description="The same deals as the ERP. Drag a card to move it, or click it to open the chat.">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a client" aria-label="Search a client" className="w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-brand sm:w-44" />
          <select value={who} onChange={(e) => setWho(e.target.value)} aria-label="Filter by salesperson" className="rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] font-semibold text-ink-soft outline-none focus:border-brand">
            <option value="">All salespeople</option>{people.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </PageHeader></div>

        {notice && <div role="status" className="mx-4 mb-2 flex items-start justify-between gap-3 rounded-xl bg-warn-soft px-4 py-2 text-[12.5px] font-semibold text-warn sm:mx-6"><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss" className="font-bold">×</button></div>}
        {error && !data && <div className="m-6 rounded-xl bg-white p-6 text-center text-[13px]"><p className="text-bad">{error}</p><button onClick={() => void run()} className="mt-3 rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-dark">Try again</button></div>}
        {!data && !error && <p className="p-6 text-center text-[13px] text-ink-soft">Loading the pipeline...</p>}

        {data && (
          <div className="-mt-1 mb-3 overflow-x-auto px-4 md:hidden" role="tablist" aria-label="Stage">
            <div className="flex min-w-max gap-1.5">
              {columns.map((st) => {
                const n = shown.filter((d) => d.stage === st).length;
                return <button key={st} type="button" role="tab" aria-selected={phoneStage === st} onClick={() => setPhoneStage(st)} className={`rounded-full px-3 py-1.5 text-[12.5px] font-bold ${phoneStage === st ? 'bg-brand text-white' : 'border border-line bg-white text-ink-soft'}`}>{stageLabel(st)} {n > 0 ? n : ''}</button>;
              })}
            </div>
          </div>
        )}
        {data && (
          <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto px-4 pb-4 sm:px-6" aria-label="Pipeline board">
            {columns.map((stage) => {
              const list = shown.filter((d) => d.stage === stage);
              const total = list.reduce((s, d) => s + d.value, 0);
              const ok = dragId ? DROP_OK.has(stage) && byId(dragId)?.stage !== stage : false;
              return (
                <section key={stage} aria-label={stageLabel(stage)}
                  onDragOver={(e) => { if (dragId) { e.preventDefault(); setOver(stage); } }} onDragLeave={() => setOver((o) => (o === stage ? null : o))}
                  onDrop={(e) => { e.preventDefault(); const d = byId(dragId); setDragId(null); setOver(null); if (d) void move(d, stage); }}
                  className={`${stage === phoneStage ? 'flex' : 'max-md:hidden md:flex'} w-full shrink-0 flex-col rounded-2xl border bg-[#eef4fb] transition md:w-[264px] ${over === stage ? (ok ? 'border-brand ring-2 ring-brand/30' : 'border-bad/50') : 'border-line'}`}>
                  <div className="px-3 pb-2 pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="flex items-center gap-1.5 text-[13.5px] font-extrabold"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STAGE_CHIP[stageTone(stage)]}`}>{stageLabel(stage)}</span></h2>
                      <span className="text-[12px] font-bold text-ink-soft">{list.length}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-ink-soft">{STAGE_HINT[stage]}{total > 0 ? ` · ${rpShort(total)}` : ''}</p>
                  </div>
                  <ul className="flex-1 space-y-2 overflow-y-auto px-2 pb-3">
                    {list.length === 0 && <li className="px-2 py-4 text-center text-[11.5px] text-ink-soft/70">No cards</li>}
                    {list.map((d) => <Card key={d.id} d={d} onDragStart={() => setDragId(d.id)} onDragEnd={() => { setDragId(null); setOver(null); }} onMove={(s) => void move(d, s)} dragging={dragId === d.id} />)}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Card({ d, dragging, onDragStart, onDragEnd, onMove }: { d: BoardDeal; dragging: boolean; onDragStart: () => void; onDragEnd: () => void; onMove: (stage: string) => void }) {
  const locked = LOCKED.has(d.stage);
  const limit = STUCK_DAYS[d.stage];
  const late = !!limit && d.daysInStage > limit;
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-[13px] font-extrabold">{d.client}</span>
        {d.value > 0 && <span className="shrink-0 text-[12px] font-bold">{rpShort(d.value)}</span>}
      </span>
      <span className="mt-0.5 block truncate text-[11.5px] text-ink-soft">{d.title}</span>
      <span className="mt-1.5 flex flex-wrap items-center gap-1">
        {d.payment && <span className={`rounded-full px-1.5 py-px text-[10px] font-bold ${PAYMENT_CHIP[d.payment]}`}>{PAYMENT_LABEL[d.payment]}</span>}
        {d.nextMeetingAt && <span className="rounded-full bg-[#ece7ff] px-1.5 py-px text-[10px] font-bold text-[#5b3fd1]" title="Next consultation">📅 {clock(d.nextMeetingAt)}</span>}
        <span className={`rounded-full px-1.5 py-px text-[10px] font-bold ${late ? 'bg-warn-soft text-warn' : 'bg-white text-ink-soft'}`} title={late ? `More than ${limit} days in this stage` : undefined}>{d.daysInStage === 0 ? 'Today' : `${d.daysInStage}d`}</span>
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-brand-soft text-[9px] font-extrabold text-brand-dark" title={d.sales ?? 'No owner'}>{initials(d.sales)}</span>
      </span>
    </>
  );
  return (
    <li draggable={!locked} onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', d.id); onDragStart(); }} onDragEnd={onDragEnd}
      className={`rounded-xl border border-line bg-white p-2.5 shadow-sm transition ${dragging ? 'opacity-40' : ''} ${locked ? '' : 'cursor-grab active:cursor-grabbing'}`}>
      {d.groupId
        ? <a href={`/?chat=${d.groupId}`} draggable={false} className="block rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" title="Open the chat">{body}</a>
        : <div title="This deal has no chat on the sales number">{body}</div>}
      {!locked && (
        <select aria-label={`Move ${d.client} to another stage`} value="" onChange={(e) => { if (e.target.value) onMove(e.target.value); }}
          className="mt-2 w-full rounded-lg border border-line bg-brand-softer px-2 py-1 text-[11.5px] font-semibold text-brand-dark outline-none focus:border-brand">
          <option value="">Move to...</option>
          {[...DROP_OK].filter((s) => s !== d.stage).map((s) => <option key={s} value={s}>{stageLabel(s)}</option>)}
        </select>
      )}
      {locked && <p className="mt-1.5 text-[10.5px] text-ink-soft">{d.stage === 'Deal' ? 'Active client' : 'Moved on by the invoice and payment in the ERP'}</p>}
    </li>
  );
}
