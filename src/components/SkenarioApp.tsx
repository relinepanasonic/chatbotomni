'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { NODE_LABEL, type Graph, type NodeType } from '@/lib/flow';
import { ageLabel, dateTimeLabel } from '@/lib/format';
import type { Agent, FlowFull, FlowListItem, FlowRun, FlowsResponse, LeadSource, SourcesResponse } from '@/lib/types';
import { FlowEditor } from './FlowEditor';
import { PageHeader, SettingTabs } from './PageHeader';
import { Rail } from './Rail';
import { useMe } from '@/lib/useMe';

/**
 * Skenario: the scenario flows of the sales bot, drawn as boxes and lines. A flow sits on top of the normal bot: a lead's message that matches no
 * active flow (or a flow that does not answer) goes to the bot exactly as before. The bot's ON switch also controls the flows.
 */

type Tab = 'flows' | 'log';

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  try {
    const res = await fetch(`/api${path}`, { cache: 'no-store', ...init, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, status: res.status, error: String(body?.error || (res.status === 401 ? 'Please sign in again.' : res.status === 403 ? 'Only admins can change this.' : 'Something went wrong.')) };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, error: 'No connection.' };
  }
}

const btnPrimary = 'inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold text-ink-soft transition hover:border-brand hover:text-brand-dark disabled:opacity-50';
const BLANK: Graph = { nodes: [], edges: [] };

export function SkenarioApp({ demo }: { demo: boolean }) {
  const me = useMe();
  const [tab, setTab] = useState<Tab>('flows');
  const [data, setData] = useState<FlowsResponse | null>(null);
  const [runs, setRuns] = useState<FlowRun[] | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [editing, setEditing] = useState<{ flow: FlowFull | null; key: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveWarnings, setSaveWarnings] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [f, a, s] = await Promise.all([api<FlowsResponse>('/flows'), api<{ agents: Agent[] }>('/agents'), api<SourcesResponse>('/sources')]);
    if (!f.ok) { setError(f.error); return; }
    setError(null); setData(f.data);
    if (a.ok) setAgents(a.data.agents);
    if (s.ok) setSources(s.data.sources.filter((x) => x.active));
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (tab === 'log') void api<{ runs: FlowRun[] }>('/flows/runs').then((r) => r.ok && setRuns(r.data.runs)); }, [tab]);

  const say = (kind: 'ok' | 'error', text: string) => setNotice({ kind, text });
  const canEdit = !!data?.canEdit;

  const open = async (id: string | null) => {
    setSaveError(null); setSaveWarnings([]);
    if (!id) { setEditing({ flow: null, key: Date.now() }); return; }
    const r = await api<FlowFull>(`/flows/${encodeURIComponent(id)}`);
    if (!r.ok) { say('error', r.error); return; }
    setEditing({ flow: r.data, key: Date.now() });
  };

  const save = async (v: { id?: string; name: string; description: string; active: boolean; graph: Graph }) => {
    setSaving(true); setSaveError(null);
    const r = await api<{ ok: true; id: string; warnings: string[] }>('/flows', { method: 'POST', body: JSON.stringify(v) });
    if (!r.ok) { setSaving(false); setSaveError(r.error); return; }
    const full = await api<FlowFull>(`/flows/${encodeURIComponent(r.data.id)}`);
    setSaving(false);
    setSaveWarnings(r.data.warnings);
    if (full.ok) setEditing({ flow: full.data, key: Date.now() });     // reopen with what was saved, so "Saved" is true
    await load();
  };

  const toggle = async (f: FlowListItem) => {
    const r = await api<{ ok: true }>(`/flows/${encodeURIComponent(f.id)}/active`, { method: 'POST', body: JSON.stringify({ active: !f.active }) });
    if (!r.ok) say('error', r.error); else { say('ok', f.active ? `"${f.name}" is off.` : `"${f.name}" is on: it runs for new leads.`); await load(); }
  };
  const remove = async (f: FlowListItem) => {
    if (!confirm(`Delete the flow "${f.name}"?`)) return;
    const r = await api<{ ok: true }>(`/flows/${encodeURIComponent(f.id)}`, { method: 'DELETE' });
    if (!r.ok) say('error', r.error); else { say('ok', 'Deleted.'); await load(); }
  };
  const move = async (i: number, by: -1 | 1) => {
    if (!data) return;
    const list = [...data.flows];
    const j = i + by;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setData({ ...data, flows: list });                                   // show it at once; the server keeps the same order
    const r = await api<{ ok: true }>('/flows/order', { method: 'POST', body: JSON.stringify({ ids: list.map((f) => f.id) }) });
    if (!r.ok) { say('error', r.error); await load(); }
  };
  const examples = async () => {
    const r = await api<{ ok: true; created: number }>('/flows/examples', { method: 'POST' });
    if (!r.ok) say('error', r.error); else { say('ok', r.data.created ? `${r.data.created} example flows were added, all switched OFF. Open one, try it, then switch it on.` : 'The example flows are already there.'); await load(); }
  };

  if (me && !me.isBod) {
    return (
      <div className="flex h-dvh w-full overflow-hidden bg-bg text-ink max-md:pb-16">
        <Rail active="skenario" />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
            <PageHeader title="Setting" demo={demo} />
            <SettingTabs active="skenario" />
            <p className="rounded-2xl border border-line bg-white p-5 text-[13.5px] text-ink-soft">Skenario is only for the BOD (founder and superadmin). Ask them if a flow needs to change.</p>
          </div>
        </main>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex w-full">
        <div className="hidden md:block"><Rail active="skenario" /></div>
        <div className="min-w-0 flex-1">
          <FlowEditor key={editing.key} initial={editing.flow ?? { id: '', name: 'New flow', description: '', active: false, graph: BLANK, updated_at: '', updated_by: null }} agents={agents} sources={sources} canEdit={canEdit} saving={saving} error={saveError} warnings={saveWarnings}
            onSave={(v) => save({ ...v, id: v.id || undefined })} onClose={() => { setEditing(null); void load(); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg text-ink max-md:pb-16">
      <Rail active="skenario" />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <PageHeader title="Setting" demo={demo} description="Skenario: draw what the bot does for each kind of lead. A flow sits on top of the normal bot; when none fits, the bot answers as usual." />
          <SettingTabs active="skenario" />

          <div className="mb-4 flex gap-1 rounded-xl bg-[#e3edf7] p-1 text-[13px] font-bold" role="tablist">
            {([['flows', 'Flows'], ['log', 'What the flows did']] as Array<[Tab, string]>).map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 rounded-lg px-3 py-2 transition ${tab === k ? 'bg-white text-brand-dark shadow-sm' : 'text-ink-soft hover:text-ink'}`}>{label}</button>
            ))}
          </div>

          {notice && <p role="alert" className={`mb-4 rounded-xl px-4 py-2.5 text-[13px] ${notice.kind === 'error' ? 'bg-bad-soft text-bad' : 'bg-ok-soft text-ok'}`}>{notice.text}</p>}
          {error && !data && <div className="rounded-xl bg-white p-6 text-center text-[13px]"><p className="text-bad">{error}</p><button onClick={() => void load()} className={`${btnPrimary} mt-3`}>Try again</button></div>}
          {!data && !error && <p className="p-6 text-center text-[13px] text-ink-soft">Loading...</p>}

          {data && tab === 'flows' && (
            <section aria-label="Flows" className="space-y-3">
              {canEdit ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-brand/50 bg-white p-4">
                  <div><p className="text-[14px] font-extrabold">Your flows</p><p className="text-[12.5px] text-ink-soft">A new flow starts switched OFF. Try it with a sample message, then switch it on.</p></div>
                  <div className="flex gap-2"><button className={btnGhost} onClick={examples}>Add the example flows</button><button className={btnPrimary} onClick={() => void open(null)}>New flow</button></div>
                </div>
              ) : <p className="rounded-xl bg-white px-4 py-3 text-[12.5px] text-ink-soft">You can look at the flows and try them. Only admins can change them.</p>}

              {data.flows.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-[13.5px] text-ink-soft">No flows yet. Press &quot;Add the example flows&quot; to start from ready-made ones, or &quot;New flow&quot; to draw your own.</p>}
              {data.flows.length > 1 && <p className="px-1 text-[12.5px] text-ink-soft">Flows are checked from top to bottom, and only the first one that fits a message runs. Put the most specific flows first.</p>}
              <ol className="space-y-3">
                {data.flows.map((f, i) => (
                  <li key={f.id} className="flex gap-3 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(23,49,77,0.05)]">
                    <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-[12px] font-extrabold text-brand-dark" aria-label={`Checked as number ${i + 1}`}>{i + 1}</span>
                      {canEdit && data.flows.length > 1 && (
                        <>
                          <button onClick={() => void move(i, -1)} disabled={i === 0} aria-label={`Move "${f.name}" up`} title="Check this flow earlier" className="flex h-6 w-6 items-center justify-center rounded-md text-ink-soft hover:bg-brand-soft hover:text-brand-dark disabled:opacity-25"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg></button>
                          <button onClick={() => void move(i, 1)} disabled={i === data.flows.length - 1} aria-label={`Move "${f.name}" down`} title="Check this flow later" className="flex h-6 w-6 items-center justify-center rounded-md text-ink-soft hover:bg-brand-soft hover:text-brand-dark disabled:opacity-25"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg></button>
                        </>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="flex flex-wrap items-center gap-2 text-[14.5px] font-extrabold">{f.name}
                          <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${f.active ? 'bg-ok-soft text-ok' : 'bg-[#eef2f6] text-ink-soft'}`}>{f.active ? 'ON' : 'OFF'}</span>
                          {f.problems > 0 && <span className="rounded-full bg-bad-soft px-2 py-0.5 text-[10.5px] font-bold text-bad">{f.problems} problem{f.problems > 1 ? 's' : ''}</span>}
                        </h3>
                        {f.description && <p className="mt-1 text-[12.5px] text-ink-soft">{f.description}</p>}
                        <p className="mt-1.5 text-[12px] text-ink-soft">Starts when: <b>{f.trigger ? NODE_LABEL[f.trigger as NodeType] : 'no trigger yet'}</b> · {f.boxes} boxes · ran {f.runs7d} time{f.runs7d === 1 ? '' : 's'} in 7 days · changed {ageLabel(f.updated_at)}{f.updated_by ? ` by ${f.updated_by}` : ''}</p>
                      </div>
                      <label className={`flex items-center gap-2 text-[12px] font-bold ${canEdit ? 'cursor-pointer' : 'opacity-60'}`}>
                        <input type="checkbox" checked={f.active} disabled={!canEdit} onChange={() => void toggle(f)} className="h-4 w-4 accent-[#2f9bf0]" />{f.active ? 'Runs for new leads' : 'Switched off'}
                      </label>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className={btnGhost} onClick={() => void open(f.id)}>{canEdit ? 'Open and edit' : 'Open'}</button>
                      {canEdit && <button className={`${btnGhost} hover:!border-bad hover:!text-bad`} onClick={() => void remove(f)}>Delete</button>}
                    </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {data && tab === 'log' && (
            <section aria-label="What the flows did">
              <p className="mb-3 text-[13px] text-ink-soft">The latest times a flow ran for a real lead. Newest first.</p>
              {runs === null && <p className="p-6 text-center text-[13px] text-ink-soft">Loading...</p>}
              {runs?.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-[13.5px] text-ink-soft">No flow has run yet. Switch a flow on and wait for a new lead.</p>}
              <ol className="space-y-2">
                {runs?.map((r) => (
                  <li key={r.id} className="rounded-xl border border-line bg-white px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-[13.5px]"><b>{r.flow_name}</b><span className="text-ink-soft">for {r.chat}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${r.outcome === 'ok' ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}>{r.outcome === 'ok' ? (r.handled ? 'Answered the lead' : 'Bot continued') : 'Failed'}</span></div>
                    {r.trigger_text && <p className="mt-1 text-[12.5px] italic text-ink-soft">&ldquo;{r.trigger_text}&rdquo;</p>}
                    <p className="mt-1 text-[12px] text-ink-soft">{(r.actions || []).join(' → ') || 'no actions'}{r.detail ? ` · ${r.detail}` : ''}</p>
                    <p className="mt-1 text-[11.5px] text-ink-soft">{dateTimeLabel(r.created_at)} · {ageLabel(r.created_at)}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
