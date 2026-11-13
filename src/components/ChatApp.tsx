'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatFilter, ChatStatus, ConversationSummary, Counts, ListResponse, Thread, ThreadMessage } from '@/lib/types';
import { dayLabel, timeLabel, shortTime } from '@/lib/format';

/**
 * The chat inbox: conversations on the left, the chat in the middle, the customer on the right (like an omnichannel inbox), in light blue.
 * It polls the ERP (through this app's own /api routes) every few seconds. A reply goes out from the sales number and pauses the bot for that chat.
 */

const POLL_LIST_MS = 6000;
const POLL_THREAD_MS = 3500;

const TABS: Array<{ key: ChatFilter; label: string }> = [{ key: 'all', label: 'All' }, { key: 'unserved', label: 'Unserved' }, { key: 'bot', label: 'Bot' }, { key: 'human', label: 'Served' }];
const AVATAR = ['#2f9bf0', '#14b8a6', '#8b7cf6', '#f59e0b', '#ef6b8a', '#4f9d69', '#0ea5e9'];
const avatarColor = (s: string) => AVATAR[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];

const STATUS_LABEL: Record<ChatStatus, string> = { bot: 'Bot is answering', human: 'With a salesperson', off: 'Bot is off for this chat', new: 'New chat' };

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  try {
    const res = await fetch(`/api${path}`, { cache: 'no-store', ...init, headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers } });
    const body = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, status: res.status, error: String(body?.error || (res.status === 401 ? 'Please sign in again.' : res.status === 403 ? 'You do not have access.' : 'Something went wrong.')) };
    return { ok: true, data: body as T };
  } catch {
    return { ok: false, status: 0, error: 'No connection.' };
  }
}

/* ------------------------------------------------------------------ icons (inline, no library) */
const Icon = ({ d, size = 20, fill = false }: { d: string; size?: number; fill?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const I = {
  inbox: 'M3 13l2.5-7.5A2 2 0 017.4 4h9.2a2 2 0 011.9 1.5L21 13m-18 0v5a2 2 0 002 2h14a2 2 0 002-2v-5m-18 0h5l1 2h6l1-2h5',
  users: 'M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 10a4 4 0 100-8 4 4 0 000 8zm11 10v-2a4 4 0 00-3-3.9M16 2.1a4 4 0 010 7.8',
  bot: 'M12 8V4m-4 4h8a3 3 0 013 3v5a3 3 0 01-3 3H8a3 3 0 01-3-3v-5a3 3 0 013-3zm-3 5H3m18 0h-2M9.5 13v1m5-1v1',
  search: 'M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  back: 'M15 18l-6-6 6-6',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7.5 7.5 0 00-2-1.2L14.6 3h-4l-.4 2.7a7.5 7.5 0 00-2 1.2l-2.3-1-2 3.4 2 1.5a7.4 7.4 0 000 2.4l-2 1.5 2 3.4 2.3-1a7.5 7.5 0 002 1.2l.4 2.7h4l.4-2.7a7.5 7.5 0 002-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
  phone: 'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1 1 .4 1.9.7 2.8a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.8.7a2 2 0 011.7 2z',
  alert: 'M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
};

/* ------------------------------------------------------------------ small pieces */
function Avatar({ name, initials, size = 40 }: { name: string; initials: string; size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none" style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.36 }} aria-hidden="true">{initials}</span>
  );
}

function StatusChip({ c }: { c: ConversationSummary }) {
  if (c.unserved) return <span className="rounded-full bg-bad-soft px-2 py-0.5 text-[10px] font-bold text-bad">Unserved</span>;
  if (c.status === 'bot') return <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-dark">Bot</span>;
  if (c.status === 'human') return <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[10px] font-bold text-ok">Served</span>;
  return <span className="rounded-full bg-[#eef2f6] px-2 py-0.5 text-[10px] font-bold text-ink-soft">{c.status === 'off' ? 'Bot off' : 'New'}</span>;
}

function Rail({ erpUrl }: { erpUrl: string }) {
  const item = 'flex h-11 w-11 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-white';
  return (
    <nav className="hidden w-[68px] shrink-0 flex-col items-center gap-2 bg-gradient-to-b from-[#4aaaf5] to-[#2380d8] py-4 md:flex" aria-label="Main">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Professor Online chat" width={46} height={46} className="mb-3 h-[46px] w-[46px] drop-shadow-[0_2px_4px_rgba(10,60,120,0.35)]" />
      <span className={`${item} bg-white/20 !text-white`} title="Inbox" aria-current="page"><Icon d={I.inbox} /></span>
      <a className={item} href={`${erpUrl}/hrd/wa/sales`} title="Bot script and settings (in the ERP)"><Icon d={I.bot} /></a>
      <a className={item} href={`${erpUrl}/contacts`} title="Contacts (in the ERP)"><Icon d={I.users} /></a>
      <a className={`${item} mt-auto`} href={erpUrl} title="Back to the ERP"><Icon d={I.gear} /></a>
    </nav>
  );
}

function Bubble({ m }: { m: ThreadMessage }) {
  const mine = m.sender !== 'lead';
  const style = m.sender === 'lead' ? 'bg-white text-ink border border-line rounded-2xl rounded-tl-md' : m.sender === 'bot' ? 'bg-brand-soft text-ink border border-[#c9e3f9] rounded-2xl rounded-tr-md' : 'bg-brand text-white rounded-2xl rounded-tr-md';
  const label = m.sender === 'bot' ? 'Fefe · bot' : m.sender === 'team' ? (m.senderName || 'Team') : null;
  return (
    <div className={`pop flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[78%]">
        {label && <div className={`mb-0.5 text-[10px] font-semibold ${mine ? 'text-right' : ''} text-ink-soft`}>{label}</div>}
        <div className={`${style} whitespace-pre-wrap break-words px-3.5 py-2 text-[13.5px] leading-relaxed shadow-[0_1px_2px_rgba(23,49,77,0.06)]`}>
          {m.text || (m.mediaType ? <em className="opacity-80">({m.mediaType})</em> : '')}
        </div>
        <div className={`mt-0.5 text-[10px] text-ink-soft ${mine ? 'text-right' : ''}`}>{timeLabel(m.at)}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ the app */
export function ChatApp({ demo, erpUrl }: { demo: boolean; erpUrl: string }) {
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [q, setQ] = useState('');
  const [list, setList] = useState<ConversationSummary[] | null>(null);
  const [counts, setCounts] = useState<Counts>({ all: 0, unserved: 0, bot: 0, human: 0 });
  const [me, setMe] = useState<{ name: string; role: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [authLost, setAuthLost] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  const loadList = useCallback(async () => {
    const qs = new URLSearchParams({ filter, ...(q.trim() ? { q: q.trim() } : {}) });
    const r = await api<ListResponse>(`/conversations?${qs}`);
    if (!r.ok) { if (r.status === 401 || r.status === 403) setAuthLost(true); else setNotice({ kind: 'error', text: r.error }); return; }
    setAuthLost(false); setList(r.data.conversations); setCounts(r.data.counts); if (r.data.me) setMe(r.data.me);
  }, [filter, q]);

  useEffect(() => { const t = setTimeout(loadList, q ? 250 : 0); return () => clearTimeout(t); }, [loadList, q]);
  useEffect(() => { const t = setInterval(loadList, POLL_LIST_MS); return () => clearInterval(t); }, [loadList]);

  const loadThread = useCallback(async (id: string) => {
    const r = await api<Thread>(`/conversations/${encodeURIComponent(id)}`);
    if (r.ok) setThread((cur) => (cur && cur.id !== id ? cur : r.data)); else if (r.status === 404) { setSelected(null); setThread(null); }
  }, []);

  useEffect(() => {
    if (!selected) return;
    setThread(null); lastCount.current = 0; loadThread(selected);
    const t = setInterval(() => loadThread(selected), POLL_THREAD_MS);
    return () => clearInterval(t);
  }, [selected, loadThread]);

  useEffect(() => {
    const n = thread?.messages.length ?? 0;
    if (n !== lastCount.current) { endRef.current?.scrollIntoView({ behavior: lastCount.current ? 'smooth' : 'auto', block: 'end' }); lastCount.current = n; }
  }, [thread]);

  const send = async () => {
    const body = text.trim();
    if (!selected || !body || sending) return;
    setSending(true); setNotice(null);
    const r = await api<{ ok: true }>(`/conversations/${encodeURIComponent(selected)}/send`, { method: 'POST', body: JSON.stringify({ text: body }) });
    setSending(false);
    if (!r.ok) { setNotice({ kind: 'error', text: r.error }); return; }
    setText(''); await Promise.all([loadThread(selected), loadList()]);
  };

  const setStatus = async (status: 'bot' | 'human' | 'off') => {
    if (!selected) return;
    const r = await api<{ ok: true }>(`/conversations/${encodeURIComponent(selected)}/status`, { method: 'POST', body: JSON.stringify({ status }) });
    if (!r.ok) setNotice({ kind: 'error', text: r.error }); else { setNotice(null); await Promise.all([loadThread(selected), loadList()]); }
  };

  const current = useMemo(() => list?.find((c) => c.id === selected) ?? null, [list, selected]);
  const status = thread?.bot.status ?? current?.status ?? 'new';
  const groups = useMemo(() => {
    const out: Array<{ day: string; items: ThreadMessage[] }> = [];
    for (const m of thread?.messages ?? []) { const d = dayLabel(m.at); const last = out[out.length - 1]; if (last && last.day === d) last.items.push(m); else out.push({ day: d, items: [m] }); }
    return out;
  }, [thread]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg text-ink">
      <Rail erpUrl={erpUrl} />

      {/* ------------------------------------------------ 1. inbox list */}
      <section className={`${selected ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col border-r border-line bg-panel lg:w-[340px]`} aria-label="Conversations">
        <header className="flex items-center justify-between px-4 pb-2 pt-4">
          <h1 className="text-[17px] font-extrabold tracking-tight">Inbox</h1>
          <div className="flex items-center gap-2 text-[11px] text-ink-soft">
            {demo && <span className="rounded-full bg-warn-soft px-2 py-0.5 font-bold text-warn">DEMO</span>}
            {me && <span>{me.name}</span>}
          </div>
        </header>
        <div className="px-4 pb-2">
          <label className="flex items-center gap-2 rounded-xl border border-line bg-brand-softer px-3 py-2 text-ink-soft focus-within:border-brand focus-within:bg-white">
            <Icon d={I.search} size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, number or message" aria-label="Search conversations" className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-[#8aa0b6]" />
          </label>
        </div>
        <div className="grid grid-cols-4 gap-1 border-b border-line px-3 pb-2" role="tablist">
          {TABS.map((t) => {
            const on = filter === t.key;
            const n = t.key === 'human' ? counts.human : counts[t.key];
            return (
              <button key={t.key} role="tab" aria-selected={on} onClick={() => setFilter(t.key)} className={`rounded-lg px-1 py-1.5 text-center text-[12px] font-semibold transition ${on ? 'bg-brand text-white' : 'text-ink-soft hover:bg-brand-soft'}`}>
                {t.label}
                <span className={`ml-1 rounded-full px-1.5 text-[10px] ${on ? 'bg-white/25' : 'bg-[#e8eff7]'}`}>{n}</span>
              </button>
            );
          })}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto" role="list">
          {list === null && !authLost && <li className="p-6 text-center text-[13px] text-ink-soft">Loading chats...</li>}
          {authLost && <li className="p-6 text-center text-[13px] text-bad">Please sign in to the ERP again, then refresh this page.</li>}
          {list?.length === 0 && <li className="p-6 text-center text-[13px] text-ink-soft">{q ? 'No chat matches your search.' : 'No chats here yet.'}</li>}
          {list?.map((c) => (
            <li key={c.id}>
              <button onClick={() => { setSelected(c.id); setNotice(null); }} className={`flex w-full items-start gap-3 border-b border-[#eef3f8] px-4 py-3 text-left transition hover:bg-brand-softer ${selected === c.id ? 'bg-brand-soft' : ''}`} aria-current={selected === c.id ? 'true' : undefined}>
                <Avatar name={c.name} initials={c.initials} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2"><span className="truncate text-[13.5px] font-bold">{c.name}</span><span className="shrink-0 text-[10.5px] text-ink-soft">{shortTime(c.lastAt)}</span></span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className={`truncate text-[12.5px] ${c.unserved ? 'font-semibold text-ink' : 'text-ink-soft'}`}>{c.lastFromMe ? 'You: ' : ''}{c.lastText}</span>
                    <StatusChip c={c} />
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------ 2. the chat */}
      <section className={`${selected ? 'flex' : 'hidden lg:flex'} min-w-0 flex-1 flex-col bg-[#f6fafe]`} aria-label="Chat">
        {!selected || !current ? (
          <div className="m-auto max-w-xs px-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Icon d={I.inbox} size={30} /></div>
            <h2 className="text-[16px] font-extrabold">Pick a chat</h2>
            <p className="mt-1 text-[13px] text-ink-soft">Chats with new leads appear on the left. The bot answers the first messages; you can take over any chat.</p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-line bg-panel px-4 py-3">
              <button className="rounded-lg p-1.5 text-ink-soft hover:bg-brand-soft lg:hidden" onClick={() => setSelected(null)} aria-label="Back to the inbox"><Icon d={I.back} /></button>
              <Avatar name={current.name} initials={current.initials} size={38} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14.5px] font-extrabold">{current.name}</div>
                <div className="flex items-center gap-1.5 text-[11.5px] text-ink-soft"><Icon d={I.phone} size={12} />+{current.phone}</div>
              </div>
              <span className={`hidden rounded-full px-2.5 py-1 text-[11px] font-bold sm:inline ${status === 'bot' ? 'bg-brand-soft text-brand-dark' : status === 'human' ? 'bg-ok-soft text-ok' : 'bg-[#eef2f6] text-ink-soft'}`}>{STATUS_LABEL[status]}</span>
              {status === 'bot' || status === 'new'
                ? <button onClick={() => setStatus('human')} className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-brand-dark">Take over</button>
                : <button onClick={() => setStatus('bot')} className="rounded-lg border border-brand px-3 py-1.5 text-[12px] font-bold text-brand-dark transition hover:bg-brand-soft">Give back to bot</button>}
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
              {!thread && <p className="text-center text-[13px] text-ink-soft">Loading the conversation...</p>}
              {groups.map((g) => (
                <React.Fragment key={g.day}>
                  <div className="flex justify-center"><span className="rounded-full bg-white px-3 py-0.5 text-[10.5px] font-semibold text-ink-soft shadow-[0_1px_2px_rgba(23,49,77,0.06)]">{g.day}</span></div>
                  {g.items.map((m) => <Bubble key={m.id} m={m} />)}
                </React.Fragment>
              ))}
              <div ref={endRef} />
            </div>

            <footer className="border-t border-line bg-panel px-4 py-3">
              {notice && <p role="alert" className={`mb-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] ${notice.kind === 'error' ? 'bg-bad-soft text-bad' : 'bg-brand-soft text-brand-dark'}`}><Icon d={I.alert} size={14} />{notice.text}</p>}
              <div className="flex items-end gap-2">
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={1500} aria-label="Type a message"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
                  placeholder="Type a message... (Enter to send, Shift+Enter for a new line)"
                  className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-line bg-brand-softer px-3.5 py-2.5 text-[13.5px] outline-none placeholder:text-[#8aa0b6] focus:border-brand focus:bg-white" />
                <button onClick={send} disabled={sending || !text.trim()} aria-label="Send message" className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-brand text-white transition hover:bg-brand-dark disabled:opacity-40"><Icon d={I.send} size={18} /></button>
              </div>
              <p className="mt-1.5 text-[10.5px] text-ink-soft">Sent from the sales number. Replying pauses the bot for this chat.</p>
            </footer>
          </>
        )}
      </section>

      {/* ------------------------------------------------ 3. customer info */}
      {selected && current && (
        <aside className="hidden w-[300px] shrink-0 flex-col overflow-y-auto border-l border-line bg-panel xl:flex" aria-label="Chat and customer info">
          <div className="px-5 pb-4 pt-5 text-center">
            <div className="flex justify-center"><Avatar name={current.name} initials={current.initials} size={64} /></div>
            <h3 className="mt-2 text-[15px] font-extrabold">{thread?.client?.name || current.name}</h3>
            <p className="text-[12px] text-ink-soft">+{current.phone}</p>
            <p className="text-[11px] text-ink-soft">WhatsApp · Sales number</p>
          </div>

          <Block title="Customer">
            {thread?.client ? (
              <dl className="space-y-1 text-[12.5px]">
                <Row k="Client" v={thread.client.name} />
                <Row k="Sales" v={thread.client.sales || '-'} />
                {thread.client.serviceEnd && <Row k="Project ends" v={thread.client.serviceEnd} />}
              </dl>
            ) : <p className="text-[12.5px] text-ink-soft">Not in the ERP yet (no client with this number).</p>}
          </Block>

          <Block title="What the bot learned">
            {thread?.bot.lead && (thread.bot.lead.name || thread.bot.lead.store || thread.bot.lead.need) ? (
              <dl className="space-y-1 text-[12.5px]">
                {thread.bot.lead.name && <Row k="Name" v={thread.bot.lead.name} />}
                {thread.bot.lead.store && <Row k="Store" v={thread.bot.lead.store} />}
                {thread.bot.lead.need && <Row k="Need" v={thread.bot.lead.need} />}
              </dl>
            ) : <p className="text-[12.5px] text-ink-soft">Nothing yet.</p>}
          </Block>

          <Block title="Bot">
            <dl className="space-y-1 text-[12.5px]">
              <Row k="Status" v={STATUS_LABEL[status]} />
              <Row k="Bot messages" v={String(thread?.bot.replies ?? current.botReplies)} />
              {thread?.bot.reason && <Row k="Why" v={thread.bot.reason} />}
            </dl>
            {status !== 'off' && <button onClick={() => setStatus('off')} className="mt-2 text-[11.5px] font-semibold text-ink-soft underline decoration-dotted hover:text-brand-dark">Switch the bot off for this chat</button>}
          </Block>

          <Block title={`Deals (${thread?.deals.length ?? 0})`}>
            {thread?.deals.length ? (
              <ul className="space-y-2">
                {thread.deals.map((d) => (
                  <li key={d.id} className="rounded-lg border border-line p-2 text-[12.5px]">
                    <div className="font-semibold">{d.title}</div>
                    <div className="mt-0.5 flex items-center justify-between text-ink-soft"><span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10.5px] font-bold text-brand-dark">{d.stage}</span><span>{d.value ? `Rp ${d.value.toLocaleString('id-ID')}` : ''}</span></div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-[12.5px] text-ink-soft">No deal yet.</p>}
          </Block>
        </aside>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line px-5 py-3.5">
      <h4 className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-ink-soft">{title}</h4>
      {children}
    </section>
  );
}
const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-3"><dt className="text-ink-soft">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
);
