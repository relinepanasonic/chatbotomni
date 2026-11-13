'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ChannelMark } from './ChannelMark';
import type { ChatChannel } from '@/lib/channel';

/**
 * "Channels": where the sales chat comes from. WhatsApp (the sales number, through Fonnte) and Instagram + Facebook Messenger (through Meta).
 * Owners connect the Facebook Page (and the Instagram account linked to it) here, after putting Meta's settings on the server.
 * The secrets are never shown: only whether each one is there.
 */
interface ChannelsResponse {
  accounts: Array<{ id: string; channel: ChatChannel; name: string; active: boolean }>;
  meta: { pageToken: boolean; appSecret: boolean; verifyToken: boolean; appId: boolean; webhookPath: string };
  canEdit: boolean;
}

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api${path}`, { cache: 'no-store', ...init, headers: init?.body ? { 'Content-Type': 'application/json' } : undefined });
    const body = await res.json().catch(() => null);
    return res.ok ? { ok: true, data: body as T } : { ok: false, error: String(body?.error || (res.status === 403 ? 'Only the owner can change this.' : 'Something went wrong.')) };
  } catch { return { ok: false, error: 'No connection.' }; }
}

const SETTINGS: Array<[keyof Omit<ChannelsResponse['meta'], 'webhookPath'>, string, string]> = [
  ['pageToken', 'META_PAGE_TOKEN', 'The Page access token (Meta app → Messenger / Instagram → Generate token)'],
  ['appSecret', 'META_APP_SECRET', 'The app secret (App settings → Basic), to check that a message really comes from Meta'],
  ['verifyToken', 'META_VERIFY_TOKEN', 'Any long random word you choose; the same word goes in the webhook setup'],
  ['appId', 'META_APP_ID', 'The app id (App settings → Basic), so our own replies are not saved twice'],
];

export function ChannelsCard({ erpOrigin }: { erpOrigin: string }) {
  const [d, setD] = useState<ChannelsResponse | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const load = useCallback(async () => { const r = await api<ChannelsResponse>('/channels'); if (r.ok) setD(r.data); else setMsg({ kind: 'error', text: r.error }); }, []);
  useEffect(() => { void load(); }, [load]);

  const connect = async () => {
    setBusy(true); setMsg(null);
    const r = await api<{ ok: true; page: string; instagram: string | null; subscribed: boolean; warning: string | null }>('/channels', { method: 'POST', body: '{}' });
    setBusy(false);
    if (!r.ok) { setMsg({ kind: 'error', text: r.error }); return; }
    setMsg({ kind: r.data.warning ? 'error' : 'ok', text: r.data.warning || `Connected: ${r.data.page}${r.data.instagram ? ` and ${r.data.instagram}` : ''}. New messages now arrive in the inbox.` });
    await load();
  };
  const toggle = async (id: string, active: boolean) => {
    const r = await api<{ ok: true }>(`/channels/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ active }) });
    if (!r.ok) setMsg({ kind: 'error', text: r.error }); else await load();
  };

  const webhook = `${erpOrigin.replace(/\/$/, '')}${d?.meta.webhookPath ?? '/api/meta/webhook'}`;
  const ready = !!d && d.meta.pageToken && d.meta.appSecret && d.meta.verifyToken;
  const hasMeta = !!d?.accounts.some((a) => a.channel !== 'whatsapp');

  return (
    <section aria-label="Channels" className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-[15px] font-extrabold">Channels</h2>
      <p className="mt-0.5 text-[12.5px] text-ink-soft">Where the sales chat comes from. Every channel lands in the same inbox and gets the same bot, flows and numbers.</p>
      {msg && <p role="alert" className={`mt-3 rounded-lg px-3 py-2 text-[12.5px] ${msg.kind === 'error' ? 'bg-bad-soft text-bad' : 'bg-ok-soft text-ok'}`}>{msg.text}</p>}
      {!d && !msg && <p className="mt-3 text-[12.5px] text-ink-soft">Loading...</p>}
      {d && (
        <>
          <ul className="mt-3 space-y-2">
            {d.accounts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5">
                <ChannelMark channel={a.channel} size={22} />
                <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-bold">{a.name}</span><span className="text-[11.5px] text-ink-soft">{a.active ? 'Connected: messages arrive in the inbox' : 'Switched off: new messages are not taken in'}</span></span>
                {a.channel !== 'whatsapp' && d.canEdit && <button onClick={() => void toggle(a.id, !a.active)} className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-bold text-ink-soft hover:border-brand hover:text-brand-dark">{a.active ? 'Switch off' : 'Switch on'}</button>}
              </li>
            ))}
          </ul>

          <div className="mt-4 rounded-xl bg-brand-softer p-4">
            <h3 className="flex items-center gap-2 text-[13.5px] font-extrabold"><ChannelMark channel="instagram" /><ChannelMark channel="messenger" />Instagram and Messenger</h3>
            <p className="mt-1 text-[12.5px] text-ink-soft">Through your own Meta app and Facebook Page. Meta allows a reply only within 24 hours of the customer&apos;s last message, so these chats cannot get broadcasts.</p>
            <ol className="mt-3 space-y-1.5 text-[12.5px]">
              {SETTINGS.map(([k, name, what]) => (
                <li key={k} className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 rounded-full px-1.5 text-[10.5px] font-extrabold ${d.meta[k] ? 'bg-ok-soft text-ok' : 'bg-[#eef2f6] text-ink-soft'}`}>{d.meta[k] ? 'Set' : 'Missing'}</span>
                  <span><code className="font-bold">{name}</code> <span className="text-ink-soft">{what}</span></span>
                </li>
              ))}
            </ol>
            <div className="mt-3 text-[12.5px]">
              <p className="font-semibold">Webhook address for the Meta app (Messenger and Instagram, field &quot;messages&quot;)</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-white px-2.5 py-1.5">{webhook}</code>
                <button onClick={() => { void navigator.clipboard?.writeText(webhook).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }} className="rounded-lg border border-line bg-white px-2.5 py-1.5 font-bold text-ink-soft hover:border-brand hover:text-brand-dark">{copied ? 'Copied' : 'Copy'}</button>
              </div>
            </div>
            {d.canEdit ? (
              <button onClick={() => void connect()} disabled={busy || !ready} title={ready ? '' : 'Put the settings above on the server first'} className="mt-4 rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50">{busy ? 'Connecting...' : hasMeta ? 'Connect again' : 'Connect the Page and Instagram'}</button>
            ) : <p className="mt-3 text-[12px] text-ink-soft">Only the owner can connect accounts.</p>}
            {!ready && <p className="mt-2 text-[11.5px] text-ink-soft">The settings go in Vercel (ERP project → Settings → Environment Variables). After adding them, redeploy the ERP, then press Connect.</p>}
          </div>
        </>
      )}
    </section>
  );
}
