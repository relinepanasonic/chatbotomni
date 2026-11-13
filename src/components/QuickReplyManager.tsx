'use client';

import React, { useState } from 'react';
import type { QuickReply } from '@/lib/types';

/** The shared quick replies: typed as /shortcut in the message box. Add, change, delete. */
export function QuickReplyManager({ items, onClose, onChanged }: { items: QuickReply[]; onClose: () => void; onChanged: () => void }) {
  const [editing, setEditing] = useState<QuickReply | null>(null);
  const [shortcut, setShortcut] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setEditing(null); setShortcut(''); setTitle(''); setBody(''); setError(''); };
  const edit = (q: QuickReply) => { setEditing(q); setShortcut(q.shortcut); setTitle(q.title); setBody(q.body); setError(''); };

  const call = async (path: string, init: RequestInit) => {
    setBusy(true); setError('');
    try {
      const res = await fetch(path, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json' } });
      const j = await res.json().catch(() => null);
      if (!res.ok) { setError(String(j?.error || 'Something went wrong.')); return false; }
      onChanged(); return true;
    } catch { setError('No connection.'); return false; } finally { setBusy(false); }
  };

  const save = async () => { if (await call('/api/quick-replies', { method: 'POST', body: JSON.stringify({ id: editing?.id, shortcut, title, body }) })) reset(); };
  const remove = async (q: QuickReply) => { if (confirm(`Delete /${q.shortcut}?`) && (await call(`/api/quick-replies/${encodeURIComponent(q.id)}`, { method: 'DELETE' })) && editing?.id === q.id) reset(); };

  const field = 'w-full rounded-lg border border-line bg-brand-softer px-3 py-2 text-[13px] outline-none focus:border-brand focus:bg-white';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b2a4a]/40 p-4" role="dialog" aria-modal="true" aria-label="Quick replies" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-panel shadow-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div>
            <h2 className="text-[15px] font-extrabold">Quick replies</h2>
            <p className="text-[11.5px] text-ink-soft">Type <b>/</b> and the shortcut in the message box. Shared by the whole team.</p>
          </div>
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-[12px] font-bold text-ink-soft hover:bg-brand-soft" aria-label="Close">Close</button>
        </header>
        <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto md:grid-cols-2">
          <ul className="divide-y divide-line border-b border-line md:border-b-0 md:border-r">
            {items.length === 0 && <li className="p-5 text-[13px] text-ink-soft">No quick replies yet. Add the first one.</li>}
            {items.map((q) => (
              <li key={q.id} className={`flex items-start justify-between gap-3 px-5 py-3 ${editing?.id === q.id ? 'bg-brand-soft' : ''}`}>
                <button onClick={() => edit(q)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2 text-[13px] font-bold"><code className="rounded bg-brand-soft px-1.5 py-0.5 text-[11.5px] text-brand-dark">/{q.shortcut}</code><span className="truncate">{q.title}</span></div>
                  <p className="mt-1 line-clamp-2 text-[12px] text-ink-soft">{q.body}</p>
                </button>
                <button onClick={() => remove(q)} disabled={busy} className="shrink-0 text-[11.5px] font-semibold text-bad hover:underline disabled:opacity-40">Delete</button>
              </li>
            ))}
          </ul>
          <form className="space-y-3 p-5" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <h3 className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-ink-soft">{editing ? `Change /${editing.shortcut}` : 'New quick reply'}</h3>
            <label className="block text-[12px] font-semibold text-ink-soft">Shortcut
              <div className="mt-1 flex items-center gap-1"><span className="text-[14px] font-bold text-brand-dark">/</span><input value={shortcut} onChange={(e) => setShortcut(e.target.value)} maxLength={24} placeholder="harga" className={field} /></div>
            </label>
            <label className="block text-[12px] font-semibold text-ink-soft">Title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Info harga paket" className={`${field} mt-1`} /></label>
            <label className="block text-[12px] font-semibold text-ink-soft">Message<textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={1500} placeholder="Hi kak, untuk paket ..." className={`${field} mt-1 resize-y`} /></label>
            {error && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-1.5 text-[12px] text-bad">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={busy || !shortcut.trim() || !title.trim() || !body.trim()} className="rounded-lg bg-brand px-4 py-2 text-[12.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-40">{editing ? 'Save changes' : 'Add quick reply'}</button>
              {editing && <button type="button" onClick={reset} className="rounded-lg border border-line px-4 py-2 text-[12.5px] font-bold text-ink-soft hover:bg-brand-soft">Cancel</button>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
