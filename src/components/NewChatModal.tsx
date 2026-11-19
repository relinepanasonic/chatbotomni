'use client';

import React, { useState } from 'react';

/**
 * A new chat: the first message to a number, sent from the sales number and kept here, so the chat is in the inbox from the first message. A message typed by
 * hand on the phone is never seen by this app (the WhatsApp provider only reports incoming messages), so introductions are sent from here. At most 20 new
 * numbers a day, to protect the sales number.
 */
const INTRO = 'Halo kak, salam kenal! Perkenalkan, saya {nama} dari Prof Toko Online. Kami membantu toko online naik penjualannya di marketplace. Boleh kenalan dulu kak, toko kakak jualan apa ya?';

export function NewChatModal({ myName, onClose, onStarted }: { myName: string; onClose: () => void; onStarted: (id: string) => void }) {
  const [phone, setPhone] = useState('');
  const [text, setText] = useState(INTRO.replace('{nama}', myName.split(/\s+/)[0] || 'tim'));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/conversations/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, text }) });
      const j = await res.json().catch(() => null);
      if (!res.ok) { setErr(String(j?.error || 'Could not send.')); setBusy(false); return; }
      onStarted(String(j?.id || ''));
    } catch { setErr('No connection.'); setBusy(false); }
  };
  const field = 'mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-[16px] outline-none focus:border-brand md:text-[13.5px]';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label="New chat">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[#0b2a4a]/40" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl md:rounded-3xl">
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0">
            <h2 className="text-[16px] font-extrabold">New chat</h2>
            <p className="text-[12px] text-ink-soft">Sent from the sales number and kept here, so the reply lands in this chat.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg px-2 text-[20px] font-bold text-ink-soft hover:bg-brand-soft">×</button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-3">
          <label className="block text-[12px] font-bold text-ink-soft">WhatsApp number
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="0812 3456 7890" autoFocus className={field} />
          </label>
          <label className="block text-[12px] font-bold text-ink-soft">First message
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={1500} className={field} />
          </label>
          <p className="rounded-lg bg-brand-softer px-3 py-2 text-[11.5px] leading-snug text-ink-soft">Start with a few people a day and write like a person, not a blast: WhatsApp is strict with numbers that have not saved ours. At most 20 new numbers a day. Do not type first messages on the phone itself: this app cannot see them.</p>
          {err && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-[12.5px] text-bad">{err}</p>}
        </div>
        <div className="flex gap-2 border-t border-line px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-line px-4 py-2.5 text-[13.5px] font-bold text-ink-soft hover:bg-brand-soft">Cancel</button>
          <button type="button" onClick={() => void send()} disabled={busy || !phone.trim() || !text.trim()} className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-[13.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50">{busy ? 'Sending...' : 'Send'}</button>
        </div>
      </div>
    </div>
  );
}
