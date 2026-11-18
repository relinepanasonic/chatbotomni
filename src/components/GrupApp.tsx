'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from './PageHeader';
import { Rail } from './Rail';
import { useMe } from '@/lib/useMe';

/**
 * Grup: the WhatsApp groups the sales number is in, where Fefe joins in like the smartest person in the group. Switch Fefe on or off per group, and see what she
 * saw and said there: each question she reacted to and her short answers (or why one did not go out). Group messages themselves are not saved, and nobody in a
 * group is shown by name or number. The BOD only.
 */
interface Group { id: string; name: string; active: boolean; lastAt: string | null; today: number; total: number }
interface Entry { at: string; question: string; reply: string; ok: boolean; detail: string }

const clock = (iso: string) => new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }).format(new Date(iso));
const ago = (iso: string | null) => {
  if (!iso) return 'No messages yet';
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? 'Just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};
/** The reason an answer did not go out, in plain words. */
const whyNot = (detail: string) => (/invalid group/i.test(detail) ? 'Fonnte did not accept this group yet. It refreshes by itself; the next question is tried again.' : detail ? `Not sent: ${detail}` : 'Not sent.');

async function getJson<T>(url: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { cache: 'no-store', ...init });
    const j = await res.json().catch(() => null);
    return res.ok ? { ok: true, data: j as T } : { ok: false, error: String(j?.error || (res.status === 401 ? 'Please sign in again.' : res.status === 403 ? 'Only the BOD can see this page.' : 'Something went wrong.')) };
  } catch { return { ok: false, error: 'No connection.' }; }
}

export function GrupApp({ demo }: { demo: boolean }) {
  const me = useMe();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await getJson<{ groups: Group[] }>('/api/groups');
    if (!r.ok) { setError(r.error); return; }
    setError(null); setGroups(r.data.groups);
  }, []);
  useEffect(() => { void load(); const t = setInterval(() => { if (!document.hidden) void load(); }, 30000); return () => clearInterval(t); }, [load]);

  const open = useCallback(async (id: string) => {
    setSelected(id); setEntries(null);
    const r = await getJson<{ entries: Entry[] }>(`/api/groups/${encodeURIComponent(id)}/log`);
    setEntries(r.ok ? r.data.entries : []);
    if (!r.ok) setMsg(r.error);
  }, []);
  useEffect(() => { if (!selected) return; const t = setInterval(() => { if (!document.hidden) void open(selected); }, 30000); return () => clearInterval(t); }, [selected, open]);

  const current = useMemo(() => groups?.find((g) => g.id === selected) ?? null, [groups, selected]);
  const toggle = async (g: Group, active: boolean) => {
    setGroups((l) => (l ? l.map((x) => (x.id === g.id ? { ...x, active } : x)) : l)); setBusy(true); setMsg(null);
    const r = await getJson<{ ok: true }>('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: g.id, active }) });
    setBusy(false);
    if (!r.ok) { setMsg(r.error); void load(); } else setMsg(active ? `Fefe will join in at ${g.name}.` : `Fefe is quiet at ${g.name}.`);
  };

  return (
    <div className={`flex h-dvh w-full overflow-hidden bg-bg text-ink ${selected ? '' : 'max-md:pb-16'}`}>
      <Rail active="grup" phoneBar={!selected} />
      <main className="flex min-w-0 flex-1">
        {/* ------------------------------------------------ the groups */}
        <section className={`${selected ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r border-line bg-panel md:w-[360px]`} aria-label="Groups">
          <div className="px-4 pt-6"><PageHeader title="Grup" demo={demo} description="Seller groups where Fefe joins in. Switch her on per group." /></div>
          {me && !me.isBod && <p className="m-4 rounded-xl bg-white p-4 text-[13px] text-ink-soft">Only the BOD can see the groups.</p>}
          {error && !groups && <div className="m-4 rounded-xl bg-white p-4 text-center text-[13px]"><p className="text-bad">{error}</p><button onClick={() => void load()} className="mt-3 rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white hover:bg-brand-dark">Try again</button></div>}
          {!groups && !error && <p className="p-6 text-center text-[13px] text-ink-soft">Loading the groups...</p>}
          {groups && groups.length === 0 && (
            <div className="m-4 rounded-xl bg-brand-softer p-4 text-[12.5px] leading-relaxed text-ink-soft">
              <p className="font-bold text-ink">No group yet.</p>
              <p className="mt-1">Add the sales number to a seller group (only where the admin allows it), turn on <b>Group</b> in the Fonnte device settings, and send one message in the group. It appears here within a minute.</p>
            </div>
          )}
          <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
            {(groups ?? []).map((g) => (
              <li key={g.id} className={`flex items-center gap-3 px-4 py-3 ${selected === g.id ? 'bg-brand-softer' : ''}`}>
                <button type="button" onClick={() => void open(g.id)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-[14px] font-extrabold">{g.name}</div>
                  <div className="text-[11.5px] text-ink-soft">{g.active ? `${g.today} today, ${g.total} in all` : 'Fefe is quiet here'} · {ago(g.lastAt)}</div>
                </button>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[12px] font-bold text-ink-soft">
                  <input type="checkbox" className="h-5 w-5 accent-[#2f9bf0]" checked={g.active} disabled={busy} onChange={(e) => void toggle(g, e.target.checked)} aria-label={`Fefe answers in ${g.name}`} />
                  {g.active ? 'On' : 'Off'}
                </label>
              </li>
            ))}
          </ul>
          {msg && <p role="status" className="border-t border-line px-4 py-2 text-[12px] text-ink-soft">{msg}</p>}
        </section>

        {/* ------------------------------------------------ what Fefe saw and said */}
        <section className={`${selected ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col bg-[#f6fafe]`} aria-label="Fefe in the group">
          {!selected || !current ? (
            <div className="m-auto max-w-sm px-6 text-center">
              <h2 className="text-[16px] font-extrabold">Pick a group</h2>
              <p className="mt-1 text-[13px] text-ink-soft">You see each question Fefe reacted to and what she said back. Group chats are not saved, and nobody in a group is shown by name or number. Fefe talks short and casual, never sells, and at most 5 times a day per group.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-2 border-b border-line bg-panel px-3 py-2.5 md:px-4 md:py-3">
                <button type="button" className="rounded-lg p-2 text-ink-soft hover:bg-brand-soft md:hidden" onClick={() => setSelected(null)} aria-label="Back to the groups">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-extrabold">{current.name}</div>
                  <div className="text-[11.5px] text-ink-soft">{current.active ? 'Fefe is on' : 'Fefe is quiet'} · {current.today} today, {current.total} in all</div>
                </div>
              </header>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-4 md:px-4" role="log">
                {!entries && <p className="text-center text-[13px] text-ink-soft">Loading...</p>}
                {entries && entries.length === 0 && <p className="mx-auto max-w-xs rounded-xl bg-white p-4 text-center text-[12.5px] text-ink-soft">Fefe has not said anything here yet. She only reacts to a real marketplace question, or to someone showing their store, and waits at least 20 minutes between times.</p>}
                {(entries ?? []).map((e, i) => (
                  <div key={`${e.at}-${i}`} className="space-y-1.5">
                    <div className="flex justify-start">
                      <div className="max-w-[86%] md:max-w-[70%]">
                        <div className="mb-0.5 text-[10px] font-semibold text-ink-soft">Someone in the group · {clock(e.at)}</div>
                        <div className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-md border border-line bg-white px-3 py-1.5 text-[13.5px] leading-snug">{e.question}</div>
                      </div>
                    </div>
                    {e.ok && e.reply.split('\n').filter(Boolean).map((line, j) => (
                      <div key={j} className="flex justify-end">
                        <div className="max-w-[86%] md:max-w-[70%]">
                          {j === 0 && <div className="mb-0.5 text-right text-[10px] font-semibold text-ink-soft">Fefe</div>}
                          <div className="whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-brand px-3 py-1.5 text-[13.5px] leading-snug text-white">{line}</div>
                        </div>
                      </div>
                    ))}
                    {!e.ok && <p className="ml-auto w-fit max-w-[86%] rounded-lg bg-warn-soft px-3 py-1.5 text-[11.5px] font-semibold text-warn md:max-w-[70%]">{whyNot(e.detail)}</p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
