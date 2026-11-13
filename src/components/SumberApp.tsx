'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CHANNELS, channelLabel, type Channel, type LeadSource, type SourceReport, type SourcesResponse } from '@/lib/types';
import { dateTimeLabel } from '@/lib/format';
import { Rail } from './Rail';

/**
 * Sumber Lead: where each lead came from. An ad (Meta, Google, TikTok) opens WhatsApp with a ready-made first message; each ad has its own text, so a new
 * lead's first message tells us the ad. Here the team keeps the list of ads and their messages, and reads how many leads, clients and sales each one brought.
 */

type Tab = 'report' | 'ads' | 'unmatched';

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

const rp = (n: number) => (n ? `Rp ${Math.round(n).toLocaleString('id-ID')}` : '-');
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '-');
const field = 'w-full rounded-lg border border-line bg-brand-softer px-3 py-2 text-[13px] outline-none focus:border-brand focus:bg-white disabled:opacity-60';
const btnPrimary = 'inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold text-ink-soft transition hover:border-brand hover:text-brand-dark disabled:opacity-50';
const CH_COLOR: Record<string, string> = { meta_ads: '#2f9bf0', google_ads: '#f59e0b', tiktok_ads: '#8b7cf6', organic: '#16a37a', referral: '#14b8a6', other: '#9aa9b9', unknown: '#c9d3de' };
const CH_CHIP: Record<string, string> = { meta_ads: 'bg-brand-soft text-brand-dark', google_ads: 'bg-warn-soft text-warn', tiktok_ads: 'bg-[#efeafe] text-[#6b5bd6]', organic: 'bg-ok-soft text-ok', referral: 'bg-ok-soft text-ok', other: 'bg-[#eef2f6] text-ink-soft', unknown: 'bg-[#eef2f6] text-ink-soft' };

interface Draft { id?: string; name: string; channel: Channel; first_message: string; active: boolean }
const emptyDraft = (): Draft => ({ name: '', channel: 'meta_ads', first_message: '', active: true });

export function SumberApp({ demo }: { demo: boolean }) {
  const [tab, setTab] = useState<Tab>('report');
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<SourceReport | null>(null);
  const [list, setList] = useState<SourcesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    const [r, l] = await Promise.all([api<SourceReport>(`/sources/report?days=${days}`), api<SourcesResponse>('/sources')]);
    if (!r.ok) { setError(r.error); return; }
    if (!l.ok) { setError(l.error); return; }
    setError(null); setReport(r.data); setList(l.data);
  }, [days]);
  useEffect(() => { void loadAll(); }, [loadAll]);

  const say = (kind: 'ok' | 'error', text: string) => setNotice({ kind, text });
  const canEdit = !!list?.canEdit;

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    const r = await api<{ ok: true }>('/sources', { method: 'POST', body: JSON.stringify(draft) });
    setBusy(false);
    if (!r.ok) { say('error', r.error); return; }
    say('ok', draft.id ? 'Saved.' : 'Source added. Press "Re-check chats" so chats that already came in are matched to it.');
    setDraft(null); await loadAll();
  };
  const remove = async (s: LeadSource) => {
    if (!confirm(`Delete "${s.name}"? Chats keep the name it had.`)) return;
    const r = await api<{ ok: true }>(`/sources/${encodeURIComponent(s.id)}`, { method: 'DELETE' });
    if (!r.ok) say('error', r.error); else { say('ok', 'Deleted.'); await loadAll(); }
  };
  const toggle = async (s: LeadSource) => {
    const r = await api<{ ok: true }>('/sources', { method: 'POST', body: JSON.stringify({ ...s, active: !s.active }) });
    if (!r.ok) say('error', r.error); else await loadAll();
  };
  const rescan = async () => {
    setBusy(true); say('ok', 'Checking every chat...');
    const r = await api<{ ok: true; checked: number; matched: number }>('/sources/rescan', { method: 'POST' });
    setBusy(false);
    if (!r.ok) { say('error', r.error); return; }
    say('ok', `Checked ${r.data.checked} chat${r.data.checked === 1 ? '' : 's'}: ${r.data.matched} matched an ad.`);
    await loadAll();
  };

  const maxLeads = Math.max(1, ...(report?.channels.map((c) => c.leads) ?? [1]));

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg text-ink max-md:pb-14">
      <Rail active="sumber" />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <header className="mb-5">
            <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight">Sumber Lead {demo && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-bold text-warn">DEMO</span>}</h1>
            <p className="mt-1 text-[13.5px] text-ink-soft">Where each lead came from. Every ad opens WhatsApp with its own first message, so the first message tells us which ad brought the lead. It is saved on the chat and on the ERP client.</p>
          </header>

          <div className="mb-4 flex gap-1 rounded-xl bg-[#e3edf7] p-1 text-[13px] font-bold" role="tablist">
            {([['report', 'Report'], ['ads', 'Ads & first messages'], ['unmatched', `No source yet${report ? ` (${report.unmatched.length})` : ''}`]] as Array<[Tab, string]>).map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 rounded-lg px-3 py-2 transition ${tab === k ? 'bg-white text-brand-dark shadow-sm' : 'text-ink-soft hover:text-ink'}`}>{label}</button>
            ))}
          </div>

          {notice && <p role="alert" className={`mb-4 rounded-xl px-4 py-2.5 text-[13px] ${notice.kind === 'error' ? 'bg-bad-soft text-bad' : 'bg-ok-soft text-ok'}`}>{notice.text}</p>}
          {error && !report && <div className="rounded-xl bg-white p-6 text-center text-[13px]"><p className="text-bad">{error}</p><button onClick={() => void loadAll()} className={`${btnPrimary} mt-3`}>Try again</button></div>}
          {!report && !error && <p className="p-6 text-center text-[13px] text-ink-soft">Loading...</p>}

          {/* ------------------------------------------------ the report */}
          {report && tab === 'report' && (
            <section aria-label="Report">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[13px] text-ink-soft">New chats that started in the last</p>
                <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Period" className="rounded-lg border border-line bg-white px-3 py-1.5 text-[13px] font-semibold outline-none focus:border-brand">
                  {[7, 30, 90, 365].map((d) => <option key={d} value={d}>{d === 365 ? '12 months' : `${d} days`}</option>)}
                </select>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {([['Leads', String(report.total.leads)], ['Already clients', `${report.total.clients} · ${pct(report.total.clients, report.total.leads)}`], ['Deals', String(report.total.deals)], ['Won', String(report.total.won)], ['Won value', rp(report.total.wonValue)]] as Array<[string, string]>).map(([k, v]) => (
                  <div key={k} className="rounded-2xl border border-line bg-white p-3.5"><p className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-ink-soft">{k}</p><p className="mt-1 text-[18px] font-extrabold">{v}</p></div>
                ))}
              </div>

              {report.rows.length === 0 ? <p className="rounded-2xl bg-white p-8 text-center text-[13.5px] text-ink-soft">No new chats in this period yet.</p> : (
                <>
                  <div className="mb-4 rounded-2xl border border-line bg-white p-4">
                    <h2 className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.08em] text-ink-soft">Leads by channel</h2>
                    <ul className="space-y-2">
                      {report.channels.map((c) => (
                        <li key={c.channel} className="flex items-center gap-3 text-[13px]">
                          <span className="w-24 shrink-0 font-semibold">{channelLabel(c.channel)}</span>
                          <span className="h-3 flex-1 rounded-full bg-[#eef3f8]"><span className="block h-3 rounded-full" style={{ width: `${Math.max(3, (c.leads / maxLeads) * 100)}%`, background: CH_COLOR[c.channel] }} /></span>
                          <span className="w-10 shrink-0 text-right font-extrabold">{c.leads}</span>
                          <span className="hidden w-28 shrink-0 text-right text-[11.5px] text-ink-soft sm:block">{c.won ? `${c.won} won · ${rp(c.wonValue)}` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                    <table className="w-full min-w-[640px] text-left text-[13px]">
                      <thead><tr className="border-b border-line text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-ink-soft"><th className="px-4 py-3">Source</th><th className="px-2 py-3 text-right">Leads</th><th className="px-2 py-3 text-right">Clients</th><th className="px-2 py-3 text-right">Deals</th><th className="px-2 py-3 text-right">Won</th><th className="px-4 py-3 text-right">Won value</th></tr></thead>
                      <tbody>
                        {report.rows.map((r) => (
                          <tr key={r.key} className="border-b border-[#eef3f8] last:border-0">
                            <td className="px-4 py-2.5"><span className="font-bold">{r.label}</span> <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${CH_CHIP[r.channel]}`}>{channelLabel(r.channel)}</span></td>
                            <td className="px-2 py-2.5 text-right font-extrabold">{r.leads}</td>
                            <td className="px-2 py-2.5 text-right">{r.clients}</td>
                            <td className="px-2 py-2.5 text-right">{r.deals}</td>
                            <td className="px-2 py-2.5 text-right">{r.won}</td>
                            <td className="px-4 py-2.5 text-right">{rp(r.wonValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[11.5px] text-ink-soft">Clients, deals and won are counted when the lead&apos;s phone number matches a client in the ERP. Won = deals in the stage &quot;Deal&quot;.</p>
                </>
              )}
            </section>
          )}

          {/* ------------------------------------------------ the ads and their messages */}
          {list && tab === 'ads' && (
            <section aria-label="Ads and first messages" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-brand/50 bg-white p-4">
                <div className="max-w-xl">
                  <p className="text-[14px] font-extrabold">The first message of each ad</p>
                  <p className="text-[12.5px] text-ink-soft">Paste the exact message your ad pre-fills when someone taps it (in the Meta, Google or TikTok ad that opens WhatsApp). When a new lead writes the same words, the lead is marked with that ad.</p>
                </div>
                {canEdit ? (
                  <div className="flex gap-2">
                    <button className={btnGhost} onClick={rescan} disabled={busy}>Re-check chats</button>
                    <button className={btnPrimary} onClick={() => setDraft(emptyDraft())}>Add an ad</button>
                  </div>
                ) : <p className="text-[12px] text-ink-soft">Only admins can change this list.</p>}
              </div>

              {list.sources.length === 0 && !draft && <p className="rounded-2xl bg-white p-8 text-center text-[13.5px] text-ink-soft">No ads yet. Add the first one, and new leads will be matched to it.</p>}
              <ul className="space-y-3">
                {list.sources.map((s) => (
                  <li key={s.id} className={`rounded-2xl border border-line bg-white p-4 ${s.active ? '' : 'opacity-70'}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-extrabold">{s.name}<span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${CH_CHIP[s.channel]}`}>{channelLabel(s.channel)}</span>{!s.active && <span className="rounded-full bg-[#eef2f6] px-2 py-0.5 text-[10.5px] font-bold text-ink-soft">Off</span>}</p>
                        <blockquote className="mt-2 border-l-4 border-brand/40 pl-3 text-[13px] italic text-ink-soft">&ldquo;{s.first_message}&rdquo;</blockquote>
                        <p className="mt-1 text-[11.5px] text-ink-soft">Added {dateTimeLabel(s.created_at)}{s.created_by ? ` by ${s.created_by}` : ''}</p>
                      </div>
                      {canEdit && (
                        <div className="flex flex-wrap gap-2">
                          <button className={btnGhost} onClick={() => setDraft({ id: s.id, name: s.name, channel: s.channel, first_message: s.first_message, active: s.active })}>Edit</button>
                          <button className={btnGhost} onClick={() => toggle(s)}>{s.active ? 'Switch off' : 'Switch on'}</button>
                          <button className={`${btnGhost} hover:!border-bad hover:!text-bad`} onClick={() => remove(s)}>Delete</button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ------------------------------------------------ chats whose first message matched no ad */}
          {report && tab === 'unmatched' && (
            <section aria-label="No source yet">
              <p className="mb-3 text-[13px] text-ink-soft">First messages that did not match any ad (last {report.days} days). If one of them is the pre-filled text of an ad, press &quot;Make this an ad&quot;, then &quot;Re-check chats&quot; so the leads are matched.</p>
              {report.unmatched.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-[13.5px] text-ink-soft">Every new lead has a source. </p>}
              <ul className="space-y-2">
                {report.unmatched.map((u) => (
                  <li key={u.group_id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-bold">{u.name} <span className="font-normal text-ink-soft">· {dateTimeLabel(u.at)}</span></p>
                      <p className="mt-1 text-[13px] text-ink-soft">&ldquo;{u.first_message}&rdquo;</p>
                    </div>
                    {canEdit && <button className={btnGhost} onClick={() => { setDraft({ ...emptyDraft(), first_message: u.first_message }); setTab('ads'); }}>Make this an ad</button>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2a4a]/40 p-4" role="dialog" aria-modal="true" aria-label={draft.id ? 'Edit ad' : 'Add an ad'} onClick={(e) => { if (e.target === e.currentTarget) setDraft(null); }}>
          <form className="w-full max-w-lg space-y-3 rounded-2xl bg-panel p-5 shadow-2xl" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <h2 className="text-[16px] font-extrabold">{draft.id ? 'Edit ad' : 'Add an ad'}</h2>
            <label className="block text-[12px] font-semibold text-ink-soft">Name<input className={`${field} mt-1`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} placeholder="Meta Ads: Promo Paket Sultan" autoFocus /></label>
            <label className="block text-[12px] font-semibold text-ink-soft">Where does the ad run?
              <select className={`${field} mt-1`} value={draft.channel} onChange={(e) => setDraft({ ...draft, channel: e.target.value as Channel })}>{CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
            </label>
            <label className="block text-[12px] font-semibold text-ink-soft">First message the ad pre-fills in WhatsApp
              <textarea className={`${field} mt-1 h-28 resize-none`} value={draft.first_message} onChange={(e) => setDraft({ ...draft, first_message: e.target.value })} maxLength={600} placeholder="Halo kak, saya mau tanya Paket Sultan dari iklan Instagram" />
            </label>
            <p className="text-[11.5px] text-ink-soft">Use words that only this ad uses. Capital letters and punctuation do not matter, and a small edit by the customer still matches.</p>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className={btnGhost} onClick={() => setDraft(null)}>Cancel</button>
              <button type="submit" className={btnPrimary} disabled={busy || !draft.name.trim() || !draft.first_message.trim()}>{busy ? 'Saving...' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
