'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { BibleDoc, BibleDocFull, BibleLogEntry, BibleResponse, BotSettings, UploadTarget } from '@/lib/types';
import { ageLabel, dateTimeLabel, isStale, sizeLabel } from '@/lib/format';
import { uploadToSignedUrl } from '@/lib/upload';
import { Rail } from './Rail';
import { ChannelsCard } from './ChannelsCard';

/**
 * The AI Kamus (the AI's dictionary): what the sales bot and "Suggest reply" know. The Sales Deck (a PDF) is uploaded here, Claude reads it, and the text can be corrected
 * by hand when a price changes. Also: the bot's switch, name, hours and script, and a box to ask the AI a question to check it read the deck right.
 */

type Tab = 'docs' | 'settings' | 'ask' | 'history';
type Step = 'idle' | 'preparing' | 'uploading' | 'reading';

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

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const I = {
  upload: 'M12 16V4m0 0l-4 4m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2',
  file: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5M9 13h6M9 17h6',
  alert: 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  check: 'M20 6L9 17l-5-5',
  spark: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z',
};

const field = 'w-full rounded-lg border border-line bg-brand-softer px-3 py-2 text-[13px] outline-none focus:border-brand focus:bg-white disabled:opacity-60';
const btnPrimary = 'inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] font-bold text-ink-soft transition hover:border-brand hover:text-brand-dark disabled:opacity-50';

const STATUS: Record<BibleDoc['status'], { label: string; cls: string }> = {
  ready: { label: 'Ready', cls: 'bg-ok-soft text-ok' },
  processing: { label: 'Reading...', cls: 'bg-warn-soft text-warn' },
  failed: { label: 'Failed', cls: 'bg-bad-soft text-bad' },
};

const EXAMPLES = ['Berapa harga Paket Sultan?', 'Apa bedanya Paket Lapak dan Juragan?', 'Paket apa yang cocok untuk toko baru?', 'Apakah ada kontrak minimal?'];

export function BibleApp({ demo, erpUrl }: { demo: boolean; erpUrl: string }) {
  const [tab, setTab] = useState<Tab>('docs');
  const [data, setData] = useState<BibleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [editing, setEditing] = useState<BibleDocFull | null>(null);
  const [replacing, setReplacing] = useState<BibleDoc | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const r = await api<BibleResponse>('/bible');
    if (!r.ok) { setError(r.error); return; }
    setError(null); setData(r.data);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const say = (kind: 'ok' | 'error', text: string) => setNotice({ kind, text });
  const canEdit = !!data?.canEdit;

  /* ---------------------------------------------------------------- upload a deck (new, or a new version of `replacing`) */
  const startUpload = (replace: BibleDoc | null) => { setReplacing(replace); setNotice(null); fileRef.current?.click(); };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const title = (replacing?.title || file.name.replace(/\.pdf$/i, '')).slice(0, 100);
    setStep('preparing'); setNotice(null);
    const t = await api<UploadTarget>('/bible/upload-url', { method: 'POST', body: JSON.stringify({ fileName: file.name, size: file.size }) });
    if (!t.ok) { setStep('idle'); say('error', t.error); return; }
    if (!demo) {
      setStep('uploading');
      const problem = await uploadToSignedUrl(t.data, file);
      if (problem) { setStep('idle'); say('error', problem); return; }
    }
    setStep('reading');
    const r = await api<{ ok: true; doc: BibleDocFull }>('/bible/ingest', { method: 'POST', body: JSON.stringify({ path: t.data.path, title, replaces: replacing?.id ?? null }) });
    setStep('idle'); setReplacing(null);
    if (!r.ok) { say('error', r.error); await load(); return; }
    say('ok', 'The deck was read and is now what the AI knows. Please read the text once and fix anything that looks wrong.');
    await load();
    setEditing(r.data.doc);
  };

  const openDoc = async (d: BibleDoc) => {
    const r = await api<BibleDocFull>(`/bible/${encodeURIComponent(d.id)}`);
    if (r.ok) setEditing(r.data); else say('error', r.error);
  };
  const toggle = async (d: BibleDoc) => {
    const r = await api<{ ok: true }>(`/bible/${encodeURIComponent(d.id)}`, { method: 'POST', body: JSON.stringify({ active: !d.active }) });
    if (!r.ok) say('error', r.error); else { say('ok', d.active ? `"${d.title}" is off: the AI no longer uses it.` : `"${d.title}" is on: the AI uses it.`); await load(); }
  };
  const remove = async (d: BibleDoc) => {
    if (!confirm(`Delete "${d.title}" and its file? This cannot be undone.`)) return;
    const r = await api<{ ok: true }>(`/bible/${encodeURIComponent(d.id)}`, { method: 'DELETE' });
    if (!r.ok) say('error', r.error); else { say('ok', 'Deleted.'); await load(); }
  };

  const docs = data?.docs ?? [];
  const active = docs.filter((d) => d.active);
  const older = docs.filter((d) => !d.active);
  const stale = active.filter((d) => isStale(d.text_updated_at));

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg text-ink max-md:pb-14">
      <Rail active="kamus" />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <header className="mb-5">
            <h1 className="flex items-center gap-2 text-[22px] font-extrabold tracking-tight">AI Kamus {demo && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[10px] font-bold text-warn">DEMO</span>}</h1>
            <p className="mt-1 text-[13.5px] text-ink-soft">What the sales bot and &quot;Suggest reply&quot; know about your packages and prices. Upload the Sales Deck, check what the AI understood, and update it whenever a price changes.</p>
          </header>

          <div className="mb-4 flex gap-1 rounded-xl bg-[#e3edf7] p-1 text-[13px] font-bold" role="tablist">
            {([['docs', 'Documents'], ['settings', 'Bot script & settings'], ['ask', 'Ask the AI'], ['history', 'History']] as Array<[Tab, string]>).map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`flex-1 rounded-lg px-3 py-2 transition ${tab === k ? 'bg-white text-brand-dark shadow-sm' : 'text-ink-soft hover:text-ink'}`}>{label}</button>
            ))}
          </div>

          {notice && <p role="alert" className={`mb-4 flex items-start gap-2 rounded-xl px-4 py-2.5 text-[13px] ${notice.kind === 'error' ? 'bg-bad-soft text-bad' : 'bg-ok-soft text-ok'}`}><Icon d={notice.kind === 'error' ? I.alert : I.check} size={16} /><span>{notice.text}</span></p>}
          {error && !data && (
            <div className="rounded-xl bg-white p-6 text-center text-[13px]"><p className="text-bad">{error}</p><button onClick={() => void load()} className={`${btnPrimary} mt-3`}>Try again</button></div>
          )}
          {!data && !error && <p className="p-6 text-center text-[13px] text-ink-soft">Loading...</p>}

          {data && tab === 'docs' && (
            <section aria-label="Documents">
              <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onFile} />

              {step !== 'idle' ? (
                <div className="mb-4 rounded-2xl border border-brand/30 bg-brand-soft p-5" role="status" aria-live="polite">
                  <p className="text-[14px] font-extrabold text-brand-deep">{step === 'preparing' ? 'Preparing the upload...' : step === 'uploading' ? 'Uploading the deck...' : 'The AI is reading every page of the deck...'}</p>
                  <p className="mt-1 text-[12.5px] text-ink-soft">{step === 'reading' ? 'This takes about 30 to 60 seconds, longer for a big deck. Please keep this page open.' : 'Please keep this page open.'}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white"><div className={`h-full rounded-full bg-brand transition-all duration-700 ${step === 'preparing' ? 'w-1/6' : step === 'uploading' ? 'w-1/2' : 'w-5/6 animate-pulse'}`} /></div>
                </div>
              ) : canEdit ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-brand/50 bg-white p-4">
                  <div>
                    <p className="text-[14px] font-extrabold">Upload the Sales Deck (PDF)</p>
                    <p className="text-[12.5px] text-ink-soft">The AI reads every page, including pictures and price tables. In PowerPoint: File &gt; Save as &gt; PDF.</p>
                  </div>
                  <button className={btnPrimary} onClick={() => startUpload(null)}><Icon d={I.upload} />Upload PDF</button>
                </div>
              ) : <p className="mb-4 rounded-xl bg-white px-4 py-3 text-[12.5px] text-ink-soft">You can read the AI Kamus and ask it questions. Only admins can upload or change documents.</p>}

              <InUse active={active} />

              {stale.length > 0 && (
                <p className="mb-4 flex items-start gap-2 rounded-xl bg-warn-soft px-4 py-2.5 text-[13px] text-[#7a4f06]"><Icon d={I.alert} size={16} /><span><b>Are these prices still right?</b> {stale.map((d) => `"${d.title}"`).join(', ')} {stale.length === 1 ? 'was' : 'were'} last updated {ageLabel(stale[0].text_updated_at)}. The AI keeps quoting what is written here until you update it.</span></p>
              )}

              {docs.length === 0 && step === 'idle' && <p className="rounded-2xl bg-white p-8 text-center text-[13.5px] text-ink-soft">No documents yet. Upload the Sales Deck and the AI will know your packages and prices.</p>}

              <ul className="space-y-3">
                {active.map((d) => <DocCard key={d.id} d={d} canEdit={canEdit} onOpen={() => openDoc(d)} onToggle={() => toggle(d)} onReplace={() => startUpload(d)} onDelete={() => remove(d)} />)}
              </ul>

              {older.length > 0 && (
                <details className="mt-5">
                  <summary className="cursor-pointer text-[12.5px] font-bold text-ink-soft">Switched off or older versions ({older.length})</summary>
                  <ul className="mt-3 space-y-3 opacity-80">
                    {older.map((d) => <DocCard key={d.id} d={d} canEdit={canEdit} onOpen={() => openDoc(d)} onToggle={() => toggle(d)} onReplace={() => startUpload(d)} onDelete={() => remove(d)} />)}
                  </ul>
                </details>
              )}
            </section>
          )}

          {data && tab === 'settings' && <div className="space-y-4"><ChannelsCard erpOrigin={erpUrl} /><SettingsTab initial={data.settings} canEdit={canEdit} say={say} /></div>}
          {data && tab === 'ask' && <AskTab />}
          {data && tab === 'history' && <HistoryTab log={data.log ?? []} />}
        </div>
      </main>

      {editing && <DocEditor doc={editing} canEdit={canEdit} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); say('ok', 'Saved. The AI uses the new text within a minute.'); await load(); }} />}
    </div>
  );
}

/* ------------------------------------------------------------------ one document */
function DocCard({ d, canEdit, onOpen, onToggle, onReplace, onDelete }: { d: BibleDoc; canEdit: boolean; onOpen: () => void; onToggle: () => void; onReplace: () => void; onDelete: () => void }) {
  const st = STATUS[d.status];
  const old = isStale(d.text_updated_at);
  return (
    <li className="rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(23,49,77,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark"><Icon d={I.file} size={20} /></span>
          <div className="min-w-0">
            <h3 className="truncate text-[14.5px] font-extrabold">{d.title}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-soft">
              <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${st.cls}`}>{st.label}</span>
              {d.active && d.status === 'ready' && <span className="rounded-full bg-brand px-2 py-0.5 text-[10.5px] font-bold text-white">In use now</span>}
              <span>Version {d.version}</span>
              <span>Uploaded {dateTimeLabel(d.created_at)}{d.uploaded_by ? ` by ${d.uploaded_by}` : ''}</span>
              {d.file_size ? <span>{sizeLabel(d.file_size)}</span> : null}
              <span className={old ? 'font-bold text-warn' : ''}>Text updated {ageLabel(d.text_updated_at)}{d.text_updated_by ? ` by ${d.text_updated_by}` : ''}</span>
            </p>
            {d.status === 'failed' && d.error && <p className="mt-1 text-[12px] text-bad">{d.error}</p>}
          </div>
        </div>
        <label className={`flex items-center gap-2 text-[12px] font-bold ${canEdit ? 'cursor-pointer' : 'opacity-60'}`}>
          <input type="checkbox" checked={d.active} disabled={!canEdit || d.status !== 'ready'} onChange={onToggle} className="h-4 w-4 accent-[#2f9bf0]" />
          {d.active ? 'The AI uses this' : 'Off'}
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className={btnGhost} onClick={onOpen} disabled={d.status === 'processing'}>{canEdit ? 'View and edit text' : 'View text'}</button>
        {canEdit && <button className={btnGhost} onClick={onReplace}><Icon d={I.upload} size={14} />Upload a new version</button>}
        {canEdit && <button className={`${btnGhost} hover:!border-bad hover:!text-bad`} onClick={onDelete}>Delete</button>}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ read and fix the text the AI reads */
function DocEditor({ doc, canEdit, onClose, onSaved }: { doc: BibleDocFull; canEdit: boolean; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(doc.title);
  const [text, setText] = useState(doc.text);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const changed = title !== doc.title || text !== doc.text;
  const unreadable = (text.match(/\[TIDAK TERBACA[^\]]*\]/g) || []).length;

  const save = async () => {
    setBusy(true); setErr('');
    const r = await api<{ ok: true }>(`/bible/${encodeURIComponent(doc.id)}`, { method: 'POST', body: JSON.stringify({ ...(title !== doc.title ? { title } : {}), ...(text !== doc.text ? { text } : {}) }) });
    setBusy(false);
    if (!r.ok) setErr(r.error); else onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2a4a]/40 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Document text" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-panel shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} maxLength={100} aria-label="Title" className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-[16px] font-extrabold outline-none hover:border-line focus:border-brand disabled:hover:border-transparent" />
            <p className="px-1 text-[11.5px] text-ink-soft">Version {doc.version} · {doc.chars.toLocaleString('id-ID')} characters · updated {ageLabel(doc.text_updated_at)}</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-[12px] font-bold text-ink-soft hover:bg-brand-soft">Close</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-2 text-[12.5px] text-ink-soft">This is exactly what the AI reads. {canEdit ? 'Fix a price or a package here and the AI uses it within a minute.' : 'Only admins can change it.'}</p>
          {unreadable > 0 && <p className="mb-2 flex items-center gap-2 rounded-lg bg-warn-soft px-3 py-1.5 text-[12px] font-semibold text-[#7a4f06]"><Icon d={I.alert} size={14} />{unreadable} part{unreadable > 1 ? 's' : ''} of the deck could not be read. Search for &quot;TIDAK TERBACA&quot; and fill in what is missing.</p>}
          <textarea value={text} onChange={(e) => setText(e.target.value)} readOnly={!canEdit} aria-label="Text the AI reads" spellCheck={false} className={`${field} h-[52dvh] resize-none font-mono text-[12.5px] leading-relaxed`} />
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
          <p role={err ? 'alert' : 'status'} className={`text-[12.5px] ${err ? 'text-bad' : changed ? 'font-bold text-warn' : 'text-ok'}`}>
            {err || (!canEdit ? '' : changed ? 'You have changes that are not saved yet.' : '✓ Saved. This is the text the AI uses now. Change something here to enable "Save changes".')}
          </p>
          {canEdit && <button onClick={save} disabled={busy || !changed || !title.trim()} className={btnPrimary}>{busy ? 'Saving...' : changed ? 'Save changes' : 'Saved'}</button>}
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ the bot's switch, name, hours and script */
function SettingsTab({ initial, canEdit, say }: { initial: BotSettings; canEdit: boolean; say: (k: 'ok' | 'error', t: string) => void }) {
  const [s, setS] = useState<BotSettings>(initial);
  const [busy, setBusy] = useState(false);
  const save = async (patch: Partial<BotSettings>, okText: string) => {
    setBusy(true);
    const r = await api<{ ok: true }>('/bible/settings', { method: 'POST', body: JSON.stringify(patch) });
    setBusy(false);
    say(r.ok ? 'ok' : 'error', r.ok ? okText : r.error);
    return r.ok;
  };
  const toggle = async (on: boolean) => { const before = s.enabled; setS({ ...s, enabled: on }); if (!(await save({ enabled: on }, on ? 'The bot is ON: it answers new leads on the sales number.' : 'The bot is OFF.'))) setS((x) => ({ ...x, enabled: before })); };

  return (
    <section aria-label="Bot script and settings" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
        <div>
          <h2 className="text-[14.5px] font-extrabold">Auto-reply bot ({s.persona_name})</h2>
          <p className="text-[12.5px] text-ink-soft">Answers a new lead&apos;s first message in a warm &quot;kak&quot; style, from the script below and the documents. It stops when a salesperson writes, after {s.max_replies} messages, or when the lead asks for a person, a price deal, a call or payment.</p>
        </div>
        <label className={`flex items-center gap-2 text-[13px] font-bold ${canEdit ? 'cursor-pointer' : 'opacity-60'}`}>
          <input type="checkbox" checked={s.enabled} disabled={!canEdit || busy} onChange={(e) => void toggle(e.target.checked)} className="h-5 w-5 accent-[#2f9bf0]" />{s.enabled ? 'ON' : 'OFF'}
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4">
        <div className="max-w-xl">
          <h2 className="text-[14.5px] font-extrabold">Send photos from the inbox</h2>
          <p className="text-[12.5px] text-ink-soft">Needs a Fonnte package with attachments (Super or higher) on the sales number. While it is off, the Photo button in the inbox shows as locked.</p>
        </div>
        <label className={`flex items-center gap-2 text-[13px] font-bold ${canEdit ? 'cursor-pointer' : 'opacity-60'}`}>
          <input type="checkbox" checked={!!s.media_enabled} disabled={!canEdit || busy} onChange={async (e) => { const on = e.target.checked; setS({ ...s, media_enabled: on }); if (!(await save({ media_enabled: on }, on ? 'Photos are unlocked in the inbox.' : 'Photos are locked in the inbox.'))) setS((x) => ({ ...x, media_enabled: !on })); }} className="h-5 w-5 accent-[#2f9bf0]" />{s.media_enabled ? 'ON' : 'OFF'}
        </label>
      </div>
      <div className="grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-[12px] font-semibold text-ink-soft">Name<input className={`${field} mt-1`} value={s.persona_name} disabled={!canEdit} onChange={(e) => setS({ ...s, persona_name: e.target.value })} /></label>
        <label className="text-[12px] font-semibold text-ink-soft">Company<input className={`${field} mt-1`} value={s.company_name} disabled={!canEdit} onChange={(e) => setS({ ...s, company_name: e.target.value })} /></label>
        <label className="text-[12px] font-semibold text-ink-soft">Team opens<input className={`${field} mt-1`} value={s.hours_from} disabled={!canEdit} onChange={(e) => setS({ ...s, hours_from: e.target.value })} placeholder="08:00" /></label>
        <label className="text-[12px] font-semibold text-ink-soft">Team closes<input className={`${field} mt-1`} value={s.hours_to} disabled={!canEdit} onChange={(e) => setS({ ...s, hours_to: e.target.value })} placeholder="21:00" /></label>
        <label className="text-[12px] font-semibold text-ink-soft">Bot messages per chat<input type="number" min={1} max={10} className={`${field} mt-1`} value={s.max_replies} disabled={!canEdit} onChange={(e) => setS({ ...s, max_replies: Number(e.target.value) })} /></label>
      </div>
      <div className="rounded-2xl border border-line bg-white p-4">
        <label className="block text-[12px] font-semibold text-ink-soft">Script (the way to talk, the answers to common questions; lines starting with ISI: are blanks to fill)
          <textarea className={`${field} mt-1 h-80 resize-y font-mono text-[12px] leading-relaxed`} value={s.knowledge} disabled={!canEdit} spellCheck={false} onChange={(e) => setS({ ...s, knowledge: e.target.value })} />
        </label>
        {canEdit && <button className={`${btnPrimary} mt-3`} disabled={busy} onClick={() => void save({ persona_name: s.persona_name, company_name: s.company_name, hours_from: s.hours_from, hours_to: s.hours_to, max_replies: s.max_replies, knowledge: s.knowledge }, 'Saved. The bot uses it within a minute.')}>{busy ? 'Saving...' : 'Save settings and script'}</button>}
        <p className="mt-2 text-[11.5px] text-ink-soft">Package names and prices should come from the Sales Deck in Documents. If the script and a document ever differ, the AI trusts the document with the newest date.</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ ask the AI */
function AskTab() {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<Array<{ q: string; a: string; ok: boolean }>>([]);
  const ask = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true); setQ('');
    const r = await api<{ ok: true; answer: string }>('/bible/ask', { method: 'POST', body: JSON.stringify({ question: text }) });
    setBusy(false);
    setLog((l) => [{ q: text, a: r.ok ? r.data.answer : r.error, ok: r.ok }, ...l]);
  };
  return (
    <section aria-label="Ask the AI" className="space-y-4">
      <div className="rounded-2xl border border-line bg-white p-4">
        <p className="text-[13px] text-ink-soft">Ask what a customer might ask. The AI answers only from the script and the documents, so you can check it read the Sales Deck correctly. Nothing is sent to anyone.</p>
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void ask(q); }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={500} placeholder="Berapa harga Paket Sultan?" aria-label="Your question" className={field} />
          <button className={btnPrimary} disabled={busy || !q.trim()}><Icon d={I.spark} />{busy ? 'Thinking...' : 'Ask'}</button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((x) => <button key={x} onClick={() => void ask(x)} disabled={busy} className="rounded-full bg-brand-soft px-3 py-1 text-[12px] font-semibold text-brand-dark transition hover:bg-[#d4e9fb] disabled:opacity-50">{x}</button>)}
        </div>
      </div>
      <ul className="space-y-3">
        {log.map((x, i) => (
          <li key={i} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-[12px] font-bold text-ink-soft">You asked</p>
            <p className="text-[13.5px] font-semibold">{x.q}</p>
            <p className="mt-3 text-[12px] font-bold text-ink-soft">The AI answers</p>
            <p className={`whitespace-pre-wrap text-[13.5px] leading-relaxed ${x.ok ? '' : 'text-bad'}`}>{x.a}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ which deck is in use now */
function InUse({ active }: { active: BibleDoc[] }) {
  const live = active.filter((d) => d.status === 'ready').sort((a, b) => b.text_updated_at.localeCompare(a.text_updated_at));
  if (live.length === 0) {
    return <p className="mb-4 flex items-start gap-2 rounded-xl bg-warn-soft px-4 py-2.5 text-[13px] text-[#7a4f06]"><Icon d={I.alert} size={16} /><span><b>No document is in use.</b> The AI only knows the bot script. Upload the Sales Deck, or switch a document on.</span></p>;
  }
  return (
    <div className="mb-4 rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3" aria-label="Documents in use now">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-brand-deep">The AI is using now</p>
      <ul className="mt-1 space-y-0.5">
        {live.map((d) => (
          <li key={d.id} className="text-[13.5px]"><b>{d.title}</b> <span className="text-ink-soft">· version {d.version} · uploaded {dateTimeLabel(d.created_at)}{d.uploaded_by ? ` by ${d.uploaded_by}` : ''} · text updated {ageLabel(d.text_updated_at)}</span></li>
        ))}
      </ul>
      {live.length > 1 && <p className="mt-1 text-[11.5px] text-ink-soft">More than one document is on. If their prices differ, the AI trusts the one whose text was updated most recently.</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ history: every deck entered and every change */
const VERB: Record<string, string> = {
  uploaded: 'uploaded the deck', new_version: 'uploaded a new version of', edited: 'edited the text of', renamed: 'renamed', switched_on: 'switched on', switched_off: 'switched off',
  deleted: 'deleted', settings: 'changed', upload_failed: 'tried to upload (it failed)',
};
const BADGE: Record<string, string> = {
  uploaded: 'bg-ok-soft text-ok', new_version: 'bg-ok-soft text-ok', edited: 'bg-brand-soft text-brand-dark', renamed: 'bg-brand-soft text-brand-dark', switched_on: 'bg-ok-soft text-ok',
  switched_off: 'bg-[#eef2f6] text-ink-soft', deleted: 'bg-bad-soft text-bad', settings: 'bg-brand-soft text-brand-dark', upload_failed: 'bg-bad-soft text-bad',
};
const BADGE_TEXT: Record<string, string> = { uploaded: 'Uploaded', new_version: 'New version', edited: 'Edited', renamed: 'Renamed', switched_on: 'Switched on', switched_off: 'Switched off', deleted: 'Deleted', settings: 'Settings', upload_failed: 'Failed' };

function HistoryTab({ log }: { log: BibleLogEntry[] }) {
  return (
    <section aria-label="History">
      <p className="mb-3 text-[13px] text-ink-soft">Every deck that was entered, and every change to what the AI knows: who did it and when. The newest is first.</p>
      {log.length === 0 && <p className="rounded-2xl bg-white p-8 text-center text-[13.5px] text-ink-soft">Nothing has happened yet.</p>}
      <ol className="space-y-2">
        {log.map((e) => (
          <li key={e.id} className="rounded-xl border border-line bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${BADGE[e.action] ?? 'bg-[#eef2f6] text-ink-soft'}`}>{BADGE_TEXT[e.action] ?? e.action}</span>
              <p className="text-[13.5px]"><b>{e.by_name || 'Someone'}</b> {VERB[e.action] ?? e.action} <b>{e.doc_title}</b></p>
            </div>
            {e.detail && <p className="mt-1 text-[12.5px] text-ink-soft">{e.detail}</p>}
            <p className="mt-1 text-[11.5px] text-ink-soft">{dateTimeLabel(e.created_at)} · {ageLabel(e.created_at)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
