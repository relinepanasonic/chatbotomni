'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { BoardDeal, BoardResponse } from '@/lib/types';
import { COLD, DROP_OK, FILTER_STAGES, LOCKED, LOST, PAYMENT_CHIP, PAYMENT_LABEL, STAGE_CHIP, STAGE_HINT, STUCK_DAYS, stageLabel, stageTone } from '@/lib/pipeline';
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
  const [editing, setEditing] = useState<BoardDeal | null>(null);
  const [deleting, setDeleting] = useState<BoardDeal | null>(null);

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

  const columns = data?.stages?.length ? [...data.stages.filter((s) => s !== COLD && s !== LOST), COLD, LOST] : [...FILTER_STAGES];
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
                    {list.map((d) => <Card key={d.id} d={d} onDragStart={() => setDragId(d.id)} onDragEnd={() => { setDragId(null); setOver(null); }} onMove={(s) => void move(d, s)} onEdit={() => setEditing(d)} onDelete={() => setDeleting(d)} dragging={dragId === d.id} />)}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>
      {editing && <EditLead deal={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setNotice(null); void run(); }} />}
      {deleting && <DeleteLead deal={deleting} onClose={() => setDeleting(null)} onDeleted={() => { setData((d) => (d ? { ...d, deals: d.deals.filter((x) => x.id !== deleting.id) } : d)); setDeleting(null); void run(); }} />}
    </div>
  );
}

function Card({ d, dragging, onDragStart, onDragEnd, onMove, onEdit, onDelete }: { d: BoardDeal; dragging: boolean; onDragStart: () => void; onDragEnd: () => void; onMove: (stage: string) => void; onEdit: () => void; onDelete: () => void }) {
  const locked = LOCKED.has(d.stage);
  const limit = STUCK_DAYS[d.stage];
  const late = !!limit && d.daysInStage > limit;
  const body = (
    <>
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-[13px] font-extrabold">{d.client}</span>
        {d.value > 0 && <span className="shrink-0 text-[12px] font-bold">{rpShort(d.value)}</span>}
      </span>
      <span className="mt-0.5 block truncate text-[11.5px] text-ink-soft">{d.title}{d.clientNo ? <span className="font-bold text-brand-dark" title="Client ID. Tell Fefe: Hi Fefe ID ..."> · ID {d.clientNo}</span> : d.code ? <span className="font-semibold" title="Tell Fefe: Hi Fefe #code ..."> · #{d.code}</span> : null}</span>
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
      <div className="mt-2 flex gap-1.5">
        <button type="button" onClick={onEdit} className="flex-1 rounded-lg border border-line bg-white px-2 py-1.5 text-[11.5px] font-bold text-brand-dark transition hover:bg-brand-soft max-md:py-2">Edit</button>
        {!locked && <button type="button" onClick={onDelete} className="flex-1 rounded-lg border border-line bg-white px-2 py-1.5 text-[11.5px] font-bold text-bad transition hover:bg-bad-soft max-md:py-2">Delete</button>}
      </div>
    </li>
  );
}

/** The edit form of a lead: the same client and deal as the ERP. A real client (one that has invoices) keeps its name and phone. */
function EditLead({ deal, onClose, onSaved }: { deal: BoardDeal; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Record<string, string> | null>(null);
  const [real, setReal] = useState(false);
  const [no, setNo] = useState<number | null>(deal.clientNo ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await fetch(`/api/deals/${encodeURIComponent(deal.id)}`, { cache: 'no-store' });
        const j = await res.json().catch(() => null);
        if (!live) return;
        if (!res.ok) { setErr(String(j?.error || 'Could not load the lead.')); return; }
        setReal(!!j.realClient); if (j.clientNo) setNo(Number(j.clientNo));
        setF({ name: j.name || '', store: j.store || '', pic: j.pic || '', phone: j.phone || '', address: j.address || '', value: j.value ? String(j.value) : '', title: j.title || '', notes: j.notes || '' });
      } catch { if (live) setErr('No connection.'); }
    })();
    return () => { live = false; };
  }, [deal.id]);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => (x ? { ...x, [k]: e.target.value } : x));
  const save = async () => {
    if (!f) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/deals/${encodeURIComponent(deal.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const j = await res.json().catch(() => null);
      if (!res.ok) { setErr(String(j?.error || 'Could not save.')); setBusy(false); return; }
      onSaved();
    } catch { setErr('No connection.'); setBusy(false); }
  };
  const input = 'mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[16px] outline-none focus:border-brand disabled:bg-[#f3f6fa] disabled:text-ink-soft md:text-[13.5px]';
  const label = 'block text-[12px] font-bold text-ink-soft';
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label="Edit lead">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[#0b2a4a]/40" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl md:rounded-3xl">
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-extrabold">Edit lead</h2>
            {(no || deal.code) && <p className="text-[12px] text-ink-soft">{no ? <>Client ID <b>{no}</b>. Tell Fefe: Hi Fefe ID {no} pindah ke Warm</> : <>Code #{deal.code}. Tell Fefe: Hi Fefe #{deal.code} pindah ke Warm</>}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg px-2 text-[20px] font-bold text-ink-soft hover:bg-brand-soft">×</button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-3">
          {!f && !err && <p className="py-6 text-center text-[13px] text-ink-soft">Loading...</p>}
          {f && (
            <>
              <label className={label}>Name (brand, store or person)<input value={f.name} onChange={set('name')} disabled={real} className={input} /></label>
              <label className={label}>Store name<input value={f.store} onChange={set('store')} className={input} /></label>
              <label className={label}>PIC (the person we talk to)<input value={f.pic} onChange={set('pic')} className={input} /></label>
              <label className={label}>Phone<input value={f.phone} onChange={set('phone')} disabled={real} inputMode="tel" placeholder="0812 3456 7890" className={input} /></label>
              {real && <p className="-mt-1 text-[11.5px] text-ink-soft">This is a client with invoices, so its name and phone are changed in the ERP.</p>}
              <label className={label}>Address<input value={f.address} onChange={set('address')} className={input} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className={label}>Deal title<input value={f.title} onChange={set('title')} className={input} /></label>
                <label className={label}>Value (Rp)<input value={f.value} onChange={set('value')} inputMode="numeric" className={input} /></label>
              </div>
              <label className={label}>Notes<textarea value={f.notes} onChange={set('notes')} rows={3} className={input} /></label>
            </>
          )}
          {err && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-[12.5px] text-bad">{err}</p>}
        </div>
        <div className="flex gap-2 border-t border-line px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-line px-4 py-2.5 text-[13.5px] font-bold text-ink-soft hover:bg-brand-soft">Cancel</button>
          <button type="button" onClick={() => void save()} disabled={!f || busy} className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-[13.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50">{busy ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

/** Delete a lead: asks first, says what goes, and the ERP refuses a lead that has an invoice, a request or a project. */
function DeleteLead({ deal, onClose, onDeleted }: { deal: BoardDeal; onClose: () => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/deals/${encodeURIComponent(deal.id)}`, { method: 'DELETE' });
      const j = await res.json().catch(() => null);
      if (!res.ok) { setErr(String(j?.error || 'Could not delete.')); setBusy(false); return; }
      onDeleted();
    } catch { setErr('No connection.'); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="alertdialog" aria-modal="true" aria-label="Delete lead">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[#0b2a4a]/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl md:rounded-3xl">
        <h2 className="text-[16px] font-extrabold">Delete {deal.client}?</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">The lead is deleted for good, in the ERP too. If it is only a prospect with nothing else attached, its client record goes with it. A lead with an invoice cannot be deleted: move it to Lost instead.</p>
        {err && <p role="alert" className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-[12.5px] text-bad">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-line px-4 py-2.5 text-[13.5px] font-bold text-ink-soft hover:bg-brand-soft">Keep it</button>
          <button type="button" onClick={() => void go()} disabled={busy} className="flex-1 rounded-xl bg-bad px-4 py-2.5 text-[13.5px] font-bold text-white transition hover:brightness-95 disabled:opacity-50">{busy ? 'Deleting...' : 'Delete'}</button>
        </div>
      </div>
    </div>
  );
}
