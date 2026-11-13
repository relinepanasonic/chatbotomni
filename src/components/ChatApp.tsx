'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { channelLabel, type Agent, type ChatFilter, type ChatStatus, type ConversationSummary, type Counts, type LeadSource, type ListResponse, type QuickReply, type SourcesResponse, type Thread, type ThreadMessage, type ChatLabel } from '@/lib/types';
import { dayLabel, timeLabel, shortTime, waitLabel, waitMinutes, waitTone } from '@/lib/format';
import { askNotifyPermission, beep, notify, notifySupported } from '@/lib/alerts';
import { QuickReplyManager } from './QuickReplyManager';
import { LABEL_CLASS, LabelsBlock, LeadBlock, RemindersBlock } from './ChatExtras';
import { uploadToSignedUrl } from '@/lib/upload';
import { timeLabel as clock } from '@/lib/format';
import { Rail } from './Rail';

/**
 * The chat inbox: conversations on the left, the chat in the middle, the customer on the right (like an omnichannel inbox), in light blue.
 * It polls the ERP (through this app's own /api routes) every few seconds. A reply goes out from the sales number, takes the chat for the sender
 * and pauses the bot for that chat. Also: assign a chat, resolve it, private notes, /quick replies, an AI suggested reply, new-chat alerts and a waiting timer.
 */

const POLL_LIST_MS = 8000;
const POLL_THREAD_MS = 5000;

const TABS: Array<{ key: ChatFilter; label: string; count: (c: Counts) => number }> = [
  { key: 'mine', label: 'Mine', count: (c) => c.mine },
  { key: 'all', label: 'All', count: (c) => c.all },
  { key: 'unserved', label: 'Unserved', count: (c) => c.unserved },
  { key: 'bot', label: 'Bot', count: (c) => c.bot },
  { key: 'followup', label: 'Follow-up', count: (c) => c.followup ?? 0 },
  { key: 'resolved', label: 'Done', count: (c) => c.resolved },
];
const AVATAR = ['#2f9bf0', '#14b8a6', '#8b7cf6', '#f59e0b', '#ef6b8a', '#4f9d69', '#0ea5e9'];
const avatarColor = (s: string) => AVATAR[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR.length];
const STATUS_LABEL: Record<ChatStatus, string> = { bot: 'Bot is answering', human: 'With a salesperson', off: 'Bot is off for this chat', new: 'New chat' };
const TONE = { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' } as const;
const ALERT_KEY = 'chat.alerts';

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
const Icon = ({ d, size = 20 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
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
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  bellOff: 'M13.7 21a2 2 0 01-3.4 0M18.6 13A17 17 0 0118 8a6 6 0 00-9.3-5M6.3 6.3A6 6 0 006 8c0 7-3 9-3 9h14M3 3l18 18',
  spark: 'M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3zM19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7L19 15z',
  check: 'M20 6L9 17l-5-5',
  note: 'M4 4h16v12l-4 4H4V4zm12 12v4M8 9h8M8 13h5',
  bolt: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  lock: 'M7 11V7a5 5 0 0110 0v4M5 11h14v10H5V11z',
  clip: 'M21 12.5l-8.5 8.5a5 5 0 01-7-7l9-9a3.3 3.3 0 014.7 4.7l-9 9a1.7 1.7 0 01-2.4-2.4l8.3-8.3',
};

/* ------------------------------------------------------------------ small pieces */
function Avatar({ name, initials, size = 40 }: { name: string; initials: string; size?: number }) {
  return <span className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white" style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.36 }} aria-hidden="true">{initials}</span>;
}

function StatusChip({ c }: { c: ConversationSummary }) {
  if (c.resolved) return <span className="rounded-full bg-[#eef2f6] px-2 py-0.5 text-[10px] font-bold text-ink-soft">Done</span>;
  if (c.unserved) return <span className="rounded-full bg-bad-soft px-2 py-0.5 text-[10px] font-bold text-bad">Unserved</span>;
  if (c.status === 'bot') return <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-dark">Bot</span>;
  if (c.status === 'human') return <span className="rounded-full bg-ok-soft px-2 py-0.5 text-[10px] font-bold text-ok">Served</span>;
  return <span className="rounded-full bg-[#eef2f6] px-2 py-0.5 text-[10px] font-bold text-ink-soft">{c.status === 'off' ? 'Bot off' : 'New'}</span>;
}

function Bubble({ m }: { m: ThreadMessage }) {
  if (m.sender === 'note') {
    return (
      <div className="pop flex justify-center">
        <div className="max-w-[78%] rounded-xl border border-[#f2d9a0] bg-warn-soft px-3.5 py-2 text-[13px] leading-relaxed text-[#6b4a07]">
          <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-warn"><Icon d={I.note} size={12} />Internal note · {m.senderName || 'Team'} · {timeLabel(m.at)}</div>
          <div className="whitespace-pre-wrap break-words">{m.text}</div>
          <div className="mt-0.5 text-[10px] opacity-70">Only the team sees this. It is not sent to the lead.</div>
        </div>
      </div>
    );
  }
  const mine = m.sender !== 'lead';
  const style = m.sender === 'lead' ? 'bg-white text-ink border border-line rounded-2xl rounded-tl-md' : m.sender === 'bot' ? 'bg-brand-soft text-ink border border-[#c9e3f9] rounded-2xl rounded-tr-md' : 'bg-brand text-white rounded-2xl rounded-tr-md';
  const label = m.sender === 'bot' ? 'Fefe · bot' : m.sender === 'team' ? (m.senderName || 'Team') : null;
  return (
    <div className={`pop flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[78%]">
        {label && <div className={`mb-0.5 text-[10px] font-semibold ${mine ? 'text-right' : ''} text-ink-soft`}>{label}</div>}
        <div className={`${style} whitespace-pre-wrap break-words px-3.5 py-2 text-[13.5px] leading-relaxed shadow-[0_1px_2px_rgba(23,49,77,0.06)]`}>
          {m.mediaType === 'image' && m.mediaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <a href={m.mediaUrl} target="_blank" rel="noreferrer"><img src={m.mediaUrl} alt="Picture in the chat" className="mb-1 max-h-64 max-w-full rounded-lg" loading="lazy" /></a>
          )}
          {m.mediaType && m.mediaType !== 'image' && m.mediaUrl && <a href={m.mediaUrl} target="_blank" rel="noreferrer" className="mb-1 block font-semibold underline">📎 Open the {m.mediaType}</a>}
          {m.text || (m.mediaType && !m.mediaUrl ? <em className="opacity-80">({m.mediaType})</em> : '')}
        </div>
        <div className={`mt-0.5 text-[10px] text-ink-soft ${mine ? 'text-right' : ''}`}>{timeLabel(m.at)}</div>
      </div>
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

/* ------------------------------------------------------------------ the app */
export function ChatApp({ demo, erpUrl }: { demo: boolean; erpUrl: string }) {
  const [filter, setFilter] = useState<ChatFilter>('all');
  const [q, setQ] = useState('');
  const [list, setList] = useState<ConversationSummary[] | null>(null);
  const [counts, setCounts] = useState<Counts>({ all: 0, mine: 0, unserved: 0, bot: 0, human: 0, resolved: 0 });
  const [me, setMe] = useState<{ id: string; name: string; role: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [quick, setQuick] = useState<QuickReply[]>([]);
  const [leadSources, setLeadSources] = useState<LeadSource[]>([]);
  const [qrOpen, setQrOpen] = useState(false);
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'reply' | 'note'>('reply');
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [slashIdx, setSlashIdx] = useState(0);
  const [notice, setNotice] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [authLost, setAuthLost] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [labelFilter, setLabelFilter] = useState('');
  const [allLabels, setAllLabels] = useState<ChatLabel[]>([]);
  const [attach, setAttach] = useState<File | null>(null);
  const [mediaOn, setMediaOn] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const remSeen = useRef<Set<string> | null>(null);
  const [alertsOn, setAlertsOn] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const endRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const lastCount = useRef(0);
  const seen = useRef<Set<string> | null>(null);
  const alertsRef = useRef(false);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected; alertsRef.current = alertsOn;

  // the waiting timers tick every 20 seconds
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 20000); return () => clearInterval(t); }, []);
  useEffect(() => { try { setAlertsOn(localStorage.getItem(ALERT_KEY) === '1'); } catch { /* ignore */ } }, []);

  const loadList = useCallback(async () => {
    const qs = new URLSearchParams({ filter, ...(q.trim() ? { q: q.trim() } : {}), ...(labelFilter ? { label: labelFilter } : {}) });
    const r = await api<ListResponse>(`/conversations?${qs}`);
    if (!r.ok) { if (r.status === 401 || r.status === 403) setAuthLost(true); else setListError(r.error); return; }
    setAuthLost(false); setListError(null); setList(r.data.conversations); setCounts(r.data.counts); if (r.data.me) setMe(r.data.me); if (r.data.labels) setAllLabels(r.data.labels); setMediaOn(r.data.features?.media === true);
  }, [filter, q, labelFilter]);

  useEffect(() => { const t = setTimeout(loadList, q ? 250 : 0); return () => clearTimeout(t); }, [loadList, q]);
  // Poll only while the tab is on screen, and catch up the moment it comes back.
  useEffect(() => {
    const tick = () => { if (!document.hidden) void loadList(); };
    const t = setInterval(tick, POLL_LIST_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [loadList]);

  // New-chat alerts: a chat that became unserved, or got a newer message while unserved, since the last look. The first load only remembers.
  useEffect(() => {
    if (!list) return;
    const keys = new Set(list.filter((c) => c.unserved && !c.resolved && c.lastAt).map((c) => `${c.id}|${c.lastAt}`));
    if (seen.current) {
      const fresh = list.filter((c) => keys.has(`${c.id}|${c.lastAt}`) && !seen.current!.has(`${c.id}|${c.lastAt}`));
      const worth = fresh.filter((c) => c.id !== selectedRef.current || document.hidden);
      if (worth.length && alertsRef.current) { beep(); notify(worth.length === 1 ? worth[0].name : `${worth.length} new messages`, worth[0].lastText); }
    }
    seen.current = new Set([...(seen.current || []), ...keys]);
  }, [list]);

  useEffect(() => {
    if (!list) return;
    const due = list.filter((c) => c.nextReminder?.state === 'overdue').map((c) => ({ key: c.nextReminder!.id, c }));
    if (remSeen.current && alertsRef.current) {
      const fresh = due.filter((d) => !remSeen.current!.has(d.key));
      if (fresh.length) { beep(); notify(`Follow up: ${fresh[0].c.name}`, fresh[0].c.nextReminder?.note || 'A follow-up reminder is due.'); }
    }
    remSeen.current = new Set([...(remSeen.current || []), ...due.map((d) => d.key)]);
  }, [list]);

  useEffect(() => { document.title = counts.unserved > 0 ? `(${counts.unserved}) Chat Inbox` : 'Chat Inbox'; }, [counts.unserved]);

  const toggleAlerts = async () => {
    if (alertsOn) { setAlertsOn(false); try { localStorage.setItem(ALERT_KEY, '0'); } catch { /* ignore */ } return; }
    beep();                                                           // the click also lets the browser play sounds
    if (notifySupported()) await askNotifyPermission();
    setAlertsOn(true); try { localStorage.setItem(ALERT_KEY, '1'); } catch { /* ignore */ }
  };

  const loadAgents = useCallback(async () => { const r = await api<{ agents: Agent[] }>('/agents'); if (r.ok) setAgents(r.data.agents); }, []);
  const loadQuick = useCallback(async () => { const r = await api<{ quickReplies: QuickReply[] }>('/quick-replies'); if (r.ok) setQuick(r.data.quickReplies); }, []);
  const loadSources = useCallback(async () => { const r = await api<SourcesResponse>('/sources'); if (r.ok) setLeadSources(r.data.sources.filter((x) => x.active)); }, []);
  useEffect(() => { void loadAgents(); void loadQuick(); void loadSources(); }, [loadAgents, loadQuick, loadSources]);

  const loadThread = useCallback(async (id: string) => {
    const r = await api<Thread>(`/conversations/${encodeURIComponent(id)}`);
    if (r.ok) setThread((cur) => (cur && cur.id !== id ? cur : r.data)); else if (r.status === 404) { setSelected(null); setThread(null); }
  }, []);

  useEffect(() => {
    if (!selected) return;
    setThread(null); lastCount.current = 0; loadThread(selected);
    const tick = () => { if (!document.hidden) void loadThread(selected); };
    const t = setInterval(tick, POLL_THREAD_MS);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [selected, loadThread]);

  useEffect(() => {
    const n = thread?.messages.length ?? 0;
    if (n !== lastCount.current) { endRef.current?.scrollIntoView({ behavior: lastCount.current ? 'smooth' : 'auto', block: 'end' }); lastCount.current = n; }
  }, [thread]);

  const refresh = async () => { if (selected) await Promise.all([loadThread(selected), loadList()]); };

  const sendImage = async (file: File) => {
    if (!selected) return;
    const t = await api<{ ok: true; path: string; token: string; bucket: string }>(`/conversations/${encodeURIComponent(selected)}/image-upload`, { method: 'POST', body: JSON.stringify({ fileName: file.name, size: file.size, type: file.type }) });
    if (!t.ok) { setNotice({ kind: 'error', text: t.error }); return false; }
    if (!demo) { const problem = await uploadToSignedUrl(t.data, file, file.type || 'image/jpeg'); if (problem) { setNotice({ kind: 'error', text: problem }); return false; } }
    const r = await api<{ ok: true }>(`/conversations/${encodeURIComponent(selected)}/send-image`, { method: 'POST', body: JSON.stringify({ path: t.data.path, caption: text.trim() }) });
    if (!r.ok) { setNotice({ kind: 'error', text: r.error }); return false; }
    return true;
  };

  const send = async () => {
    const body = text.trim();
    if (!selected || sending) return;
    if (attach && mode === 'reply' && mediaOn) {
      setSending(true); setNotice(null);
      const ok = await sendImage(attach);
      setSending(false);
      if (ok) { setAttach(null); setText(''); await refresh(); }
      return;
    }
    if (!body) return;
    setSending(true); setNotice(null);
    const r = await api<{ ok: true }>(`/conversations/${encodeURIComponent(selected)}/${mode === 'note' ? 'notes' : 'send'}`, { method: 'POST', body: JSON.stringify({ text: body }) });
    setSending(false);
    if (!r.ok) { setNotice({ kind: 'error', text: r.error }); return; }
    setText(''); await refresh();
  };

  const act = async (leaf: string, payload: unknown) => {
    if (!selected) return;
    const r = await api<{ ok: true }>(`/conversations/${encodeURIComponent(selected)}/${leaf}`, { method: 'POST', body: JSON.stringify(payload) });
    if (!r.ok) setNotice({ kind: 'error', text: r.error }); else { setNotice(null); await refresh(); }
  };
  const setStatus = (status: 'bot' | 'human' | 'off') => act('status', { status });

  const suggest = async () => {
    if (!selected || suggesting) return;
    setSuggesting(true); setNotice(null);
    const r = await api<{ ok: true; text: string }>(`/conversations/${encodeURIComponent(selected)}/suggest`, { method: 'POST' });
    setSuggesting(false);
    if (!r.ok) { setNotice({ kind: 'error', text: r.error }); return; }
    setMode('reply'); setText(r.data.text); setNotice({ kind: 'info', text: 'AI draft: read it, change what you need, then send. Nothing has been sent.' });
    boxRef.current?.focus();
  };

  // "/" quick replies: typing /sh shows the matching ones
  const slashQuery = mode === 'reply' && text.startsWith('/') && !/\s/.test(text) ? text.slice(1).toLowerCase() : null;
  const slashMatches = useMemo(() => (slashQuery === null ? [] : quick.filter((x) => x.shortcut.includes(slashQuery) || x.title.toLowerCase().includes(slashQuery)).slice(0, 6)), [slashQuery, quick]);
  useEffect(() => { setSlashIdx(0); }, [slashQuery]);
  const pickQuick = (x: QuickReply) => { setText(x.body); boxRef.current?.focus(); };

  // The open chat, from the list; when it left the list (resolved while on "All", or filtered out) it is built from the chat itself, so the pane stays open.
  const current = useMemo<ConversationSummary | null>(() => {
    const inList = list?.find((c) => c.id === selected);
    if (inList) return inList;
    if (!thread || thread.id !== selected) return null;
    const parts = thread.name.replace(/[^\p{L}\p{N} ]/gu, '').trim().split(/\s+/).filter(Boolean);
    const initials = (parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] || '#').slice(0, 2)).toUpperCase();
    return { id: thread.id, phone: thread.phone, name: thread.name, initials, lastText: '', lastAt: null, lastFromMe: false, unserved: false, waitingSince: null, status: thread.bot.status, lead: thread.bot.lead, botReplies: thread.bot.replies, assignedTo: thread.assignedTo, resolved: thread.resolved, source: thread.source };
  }, [list, selected, thread]);
  const status = thread?.bot.status ?? current?.status ?? 'new';
  const resolved = thread?.resolved ?? current?.resolved ?? false;
  const assigned = thread ? thread.assignedTo : current?.assignedTo ?? null;
  const groups = useMemo(() => {
    const out: Array<{ day: string; items: ThreadMessage[] }> = [];
    for (const m of thread?.messages ?? []) { const d = dayLabel(m.at); const last = out[out.length - 1]; if (last && last.day === d) last.items.push(m); else out.push({ day: d, items: [m] }); }
    return out;
  }, [thread]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg text-ink max-md:pb-14">
      <Rail active="inbox" />

      {/* ------------------------------------------------ 1. inbox list */}
      <section className={`${selected ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col border-r border-line bg-panel lg:w-[360px]`} aria-label="Conversations">
        <header className="flex items-center justify-between px-4 pb-2 pt-4">
          <h1 className="text-[17px] font-extrabold tracking-tight">Inbox</h1>
          <div className="flex items-center gap-2 text-[11px] text-ink-soft">
            {demo && <span className="rounded-full bg-warn-soft px-2 py-0.5 font-bold text-warn">DEMO</span>}
            {me && <span>{me.name}</span>}
            <button onClick={toggleAlerts} aria-pressed={alertsOn} title={alertsOn ? 'New-chat alerts are on (sound and notification)' : 'Turn on sound and notifications for new chats'} className={`rounded-lg p-1.5 transition ${alertsOn ? 'bg-brand text-white' : 'text-ink-soft hover:bg-brand-soft'}`}><Icon d={alertsOn ? I.bell : I.bellOff} size={16} /></button>
          </div>
        </header>
        <div className="px-4 pb-2">
          <label className="flex items-center gap-2 rounded-xl border border-line bg-brand-softer px-3 py-2 text-ink-soft focus-within:border-brand focus-within:bg-white">
            <Icon d={I.search} size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, number, message or agent" aria-label="Search conversations" className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-[#8aa0b6]" />
          </label>
          {allLabels.length > 0 && (
            <select value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)} aria-label="Filter by label" className="mt-2 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12px] font-semibold text-ink-soft outline-none focus:border-brand">
              <option value="">All labels</option>{allLabels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
        </div>
        <div className="flex gap-0.5 overflow-x-auto border-b border-line px-2.5 pb-2" role="tablist">
          {TABS.map((t) => {
            const on = filter === t.key;
            const n = t.count(counts);
            const hot = (t.key === 'unserved' || t.key === 'followup') && n > 0 && !on;
            return (
              <button key={t.key} role="tab" aria-selected={on} onClick={() => setFilter(t.key)} className={`shrink-0 rounded-lg px-2 py-1.5 text-center text-[11.5px] font-semibold transition ${on ? 'bg-brand text-white' : 'text-ink-soft hover:bg-brand-soft'}`}>
                {t.label}
                <span className={`ml-0.5 rounded-full px-1 text-[10px] ${on ? 'bg-white/25' : hot ? 'bg-bad text-white' : 'bg-[#e8eff7]'}`}>{n}</span>
              </button>
            );
          })}
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto" role="list">
          {list === null && !authLost && !listError && <li className="p-6 text-center text-[13px] text-ink-soft">Loading chats...</li>}
          {list === null && !authLost && listError && (
            <li className="p-6 text-center text-[13px]"><p className="text-bad">{listError}</p><button onClick={() => { setListError(null); void loadList(); }} className="mt-2 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white hover:bg-brand-dark">Try again</button></li>
          )}
          {authLost && <li className="p-6 text-center text-[13px] text-bad">Please sign in to the ERP again, then refresh this page.</li>}
          {list?.length === 0 && <li className="p-6 text-center text-[13px] text-ink-soft">{q ? 'No chat matches your search.' : filter === 'mine' ? 'No chat is assigned to you yet.' : 'No chats here yet.'}</li>}
          {list?.map((c) => {
            const mins = c.unserved ? waitMinutes(c.waitingSince, now) : 0;
            return (
              <li key={c.id}>
                <button onClick={() => { setSelected(c.id); setNotice(null); setMode('reply'); setText(''); }} className={`flex w-full items-start gap-3 border-b border-[#eef3f8] px-4 py-3 text-left transition hover:bg-brand-softer ${selected === c.id ? 'bg-brand-soft' : ''}`} aria-current={selected === c.id ? 'true' : undefined}>
                  <Avatar name={c.name} initials={c.initials} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2"><span className="truncate text-[13.5px] font-bold">{c.name}</span><span className="shrink-0 text-[10.5px] text-ink-soft">{shortTime(c.lastAt)}</span></span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className={`truncate text-[12.5px] ${c.unserved ? 'font-semibold text-ink' : 'text-ink-soft'}`}>{c.lastFromMe ? 'You: ' : ''}{c.lastText}</span>
                      <StatusChip c={c} />
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-[10.5px] text-ink-soft">
                      {c.unserved && !c.resolved && <span className={`font-bold ${TONE[waitTone(mins)]}`}>Menunggu {waitLabel(mins)}</span>}
                      {c.source && c.source.channel !== 'unknown' && <span className="truncate rounded-full bg-brand-soft px-1.5 py-px text-[10px] font-bold text-brand-dark" title={c.source.label ?? undefined}>{channelLabel(c.source.channel)}</span>}
                      <span className="ml-auto truncate">{c.assignedTo ? `👤 ${c.assignedTo.name}` : 'Unassigned'}</span>
                    </span>
                    {((c.labels && c.labels.length > 0) || c.nextReminder) && (
                      <span className="mt-1 flex flex-wrap items-center gap-1">
                        {c.nextReminder && <span className={`rounded-full px-1.5 py-px text-[10px] font-bold ${c.nextReminder.state === 'overdue' ? 'bg-bad-soft text-bad' : c.nextReminder.state === 'today' ? 'bg-warn-soft text-warn' : 'bg-[#eef2f6] text-ink-soft'}`} title={c.nextReminder.note ?? undefined}>⏰ {c.nextReminder.state === 'overdue' ? 'Overdue' : c.nextReminder.state === 'today' ? `Today ${clock(c.nextReminder.dueAt)}` : shortTime(c.nextReminder.dueAt)}</span>}
                        {(c.labels || []).slice(0, 3).map((l) => <span key={l.id} className={`rounded-full px-1.5 py-px text-[10px] font-bold ${LABEL_CLASS[l.color] ?? LABEL_CLASS.blue}`}>{l.name}</span>)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
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
            <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-panel px-4 py-3">
              <button className="rounded-lg p-1.5 text-ink-soft hover:bg-brand-soft lg:hidden" onClick={() => setSelected(null)} aria-label="Back to the inbox"><Icon d={I.back} /></button>
              <Avatar name={current.name} initials={current.initials} size={38} />
              <div className="min-w-0 flex-1 basis-40">
                <div className="truncate text-[14.5px] font-extrabold">{current.name}</div>
                <div className="flex items-center gap-1.5 text-[11.5px] text-ink-soft"><Icon d={I.phone} size={12} />+{current.phone}</div>
              </div>
              <span className={`hidden rounded-full px-2.5 py-1 text-[11px] font-bold 2xl:inline ${status === 'bot' ? 'bg-brand-soft text-brand-dark' : status === 'human' ? 'bg-ok-soft text-ok' : 'bg-[#eef2f6] text-ink-soft'}`}>{STATUS_LABEL[status]}</span>
              <label className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-soft">
                <span className="hidden sm:inline">Handled by</span>
                <select value={assigned?.id ?? ''} onChange={(e) => act('assign', { userId: e.target.value || null })} aria-label="Assign this chat" className="max-w-[140px] rounded-lg border border-line bg-white px-2 py-1.5 text-[12px] font-semibold text-ink outline-none focus:border-brand">
                  <option value="">Unassigned</option>
                  {assigned && !agents.some((a) => a.id === assigned.id) && <option value={assigned.id}>{assigned.name}</option>}
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}{me?.id === a.id ? ' (me)' : ''}</option>)}
                </select>
              </label>
              {status === 'bot' || status === 'new'
                ? <button onClick={() => setStatus('human')} className="rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-brand-dark">Take over</button>
                : <button onClick={() => setStatus('bot')} className="rounded-lg border border-brand px-3 py-1.5 text-[12px] font-bold text-brand-dark transition hover:bg-brand-soft">Give back to bot</button>}
              <button onClick={() => act('resolve', { resolved: !resolved })} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold transition ${resolved ? 'border border-line text-ink-soft hover:bg-brand-soft' : 'bg-ok text-white hover:brightness-95'}`}><Icon d={I.check} size={14} />{resolved ? 'Reopen' : 'Resolve'}</button>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
              {!thread && <p className="text-center text-[13px] text-ink-soft">Loading the conversation...</p>}
              {resolved && <p className="mx-auto w-fit rounded-full bg-ok-soft px-3 py-1 text-[11.5px] font-bold text-ok">Resolved. A new message from the lead, or your reply, reopens it.</p>}
              {groups.map((g) => (
                <React.Fragment key={g.day}>
                  <div className="flex justify-center"><span className="rounded-full bg-white px-3 py-0.5 text-[10.5px] font-semibold text-ink-soft shadow-[0_1px_2px_rgba(23,49,77,0.06)]">{g.day}</span></div>
                  {g.items.map((m) => <Bubble key={m.id} m={m} />)}
                </React.Fragment>
              ))}
              <div ref={endRef} />
            </div>

            <footer className={`relative border-t px-4 py-3 ${mode === 'note' ? 'border-[#f2d9a0] bg-[#fffaf0]' : 'border-line bg-panel'}`}>
              {slashMatches.length > 0 && (
                <ul role="listbox" aria-label="Quick replies" className="absolute inset-x-4 bottom-full mb-1 max-h-56 overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-xl">
                  {slashMatches.map((x, i) => (
                    <li key={x.id} role="option" aria-selected={i === slashIdx}>
                      <button onMouseEnter={() => setSlashIdx(i)} onClick={() => pickQuick(x)} className={`flex w-full items-start gap-2 px-3 py-2 text-left ${i === slashIdx ? 'bg-brand-soft' : ''}`}>
                        <code className="mt-0.5 shrink-0 rounded bg-brand-soft px-1.5 py-0.5 text-[11px] font-bold text-brand-dark">/{x.shortcut}</code>
                        <span className="min-w-0"><span className="block text-[12.5px] font-bold">{x.title}</span><span className="line-clamp-1 text-[11.5px] text-ink-soft">{x.body}</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {notice && <p role="alert" className={`mb-2 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] ${notice.kind === 'error' ? 'bg-bad-soft text-bad' : 'bg-brand-soft text-brand-dark'}`}><Icon d={I.alert} size={14} />{notice.text}</p>}
              <div className="mb-2 flex items-center gap-1.5">
                <div className="flex rounded-lg bg-[#e8eff7] p-0.5 text-[12px] font-bold" role="tablist" aria-label="Message type">
                  <button role="tab" aria-selected={mode === 'reply'} onClick={() => setMode('reply')} className={`rounded-md px-3 py-1 transition ${mode === 'reply' ? 'bg-white text-brand-dark shadow-sm' : 'text-ink-soft'}`}>Reply</button>
                  <button role="tab" aria-selected={mode === 'note'} onClick={() => setMode('note')} className={`rounded-md px-3 py-1 transition ${mode === 'note' ? 'bg-warn-soft text-warn shadow-sm' : 'text-ink-soft'}`}>Note</button>
                </div>
                {mode === 'reply' && (
                  <>
                    <button onClick={suggest} disabled={suggesting} className="flex items-center gap-1.5 rounded-lg border border-brand/40 px-2.5 py-1 text-[12px] font-bold text-brand-dark transition hover:bg-brand-soft disabled:opacity-50" title="The AI writes a draft from the bot's knowledge. Nothing is sent."><Icon d={I.spark} size={14} />{suggesting ? 'Writing...' : 'Suggest reply'}</button>
                    <button onClick={() => setQrOpen(true)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-bold text-ink-soft transition hover:bg-brand-soft" title="Type / in the box to use a quick reply"><Icon d={I.bolt} size={14} />Quick replies</button>
                    <button onClick={() => (mediaOn ? fileRef.current?.click() : setNotice({ kind: 'info', text: "Sending photos is locked: the sales number's Fonnte package does not include attachments yet. After upgrading, an admin can switch it on in AI Kamus > Bot script & settings." }))}
                      aria-disabled={!mediaOn} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-bold transition ${mediaOn ? 'text-ink-soft hover:bg-brand-soft' : 'cursor-not-allowed text-[#a9b8c7]'}`}
                      title={mediaOn ? 'Send a photo (the text becomes its caption)' : 'Locked: needs a Fonnte package with attachments on the sales number'}><Icon d={mediaOn ? I.clip : I.lock} size={14} />Photo{!mediaOn && <span className="rounded bg-[#eef2f6] px-1 text-[9.5px] font-extrabold uppercase tracking-wide">Locked</span>}</button>
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setAttach(f); setNotice(null); boxRef.current?.focus(); } }} />
                  </>
                )}
              </div>
              {attach && mode === 'reply' && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-line bg-brand-softer px-2 py-1.5 text-[12px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(attach)} alt="" className="h-10 w-10 rounded object-cover" />
                  <span className="min-w-0 flex-1 truncate font-semibold">{attach.name}</span>
                  <span className="text-ink-soft">The text below is its caption</span>
                  <button onClick={() => setAttach(null)} aria-label="Remove the photo" className="rounded px-1.5 text-[14px] font-bold text-ink-soft hover:text-bad">×</button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea ref={boxRef} value={text} onChange={(e) => setText(e.target.value)} rows={mode === 'reply' && text.length > 120 ? 4 : 1} maxLength={mode === 'note' ? 2000 : 1500} aria-label={mode === 'note' ? 'Type an internal note' : 'Type a message'}
                  onKeyDown={(e) => {
                    if (slashMatches.length > 0) {
                      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx((i) => (i + 1) % slashMatches.length); return; }
                      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIdx((i) => (i - 1 + slashMatches.length) % slashMatches.length); return; }
                      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickQuick(slashMatches[slashIdx]); return; }
                      if (e.key === 'Escape') { e.preventDefault(); setText(''); return; }
                    }
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); }
                  }}
                  placeholder={mode === 'note' ? 'Write a private note for the team...' : 'Type a message, or / for a quick reply (Enter to send, Shift+Enter for a new line)'}
                  className={`max-h-40 min-h-[42px] flex-1 resize-none rounded-xl border px-3.5 py-2.5 text-[13.5px] outline-none placeholder:text-[#8aa0b6] focus:bg-white ${mode === 'note' ? 'border-[#f2d9a0] bg-[#fff6e0] focus:border-warn' : 'border-line bg-brand-softer focus:border-brand'}`} />
                <button onClick={send} disabled={sending || (!text.trim() && !(attach && mode === 'reply'))} aria-label={mode === 'note' ? 'Save note' : 'Send message'} className={`flex h-[42px] shrink-0 items-center justify-center rounded-xl text-white transition disabled:opacity-40 ${mode === 'note' ? 'w-auto bg-warn px-3 text-[12.5px] font-bold hover:brightness-95' : 'w-[42px] bg-brand hover:bg-brand-dark'}`}>{mode === 'note' ? 'Add note' : <Icon d={I.send} size={18} />}</button>
              </div>
              <p className="mt-1.5 text-[10.5px] text-ink-soft">{mode === 'note' ? 'Notes are only for the team. The lead never sees them.' : 'Sent from the sales number. Replying pauses the bot for this chat and makes it yours if nobody has it.'}</p>
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

          <Block title="Handling">
            <dl className="space-y-1 text-[12.5px]">
              <Row k="Handled by" v={assigned?.name || 'Nobody yet'} />
              <Row k="State" v={resolved ? 'Resolved' : current.unserved ? 'Waiting for a reply' : 'Open'} />
              {current.unserved && !resolved && <Row k="Waiting" v={waitLabel(waitMinutes(current.waitingSince, now))} />}
            </dl>
          </Block>

          <Block title="Where the lead came from">
            {thread?.firstMessage || thread?.source ? (
              <div className="space-y-2 text-[12.5px]">
                <dl className="space-y-1">
                  <Row k="Channel" v={thread.source ? channelLabel(thread.source.channel) : 'Unknown'} />
                  <Row k="Ad" v={thread.source?.label || 'No ad matched'} />
                  {thread.source?.by && <Row k="Set by" v={thread.source.by} />}
                </dl>
                {thread.firstMessage && <blockquote className="border-l-4 border-brand/40 pl-2 italic text-ink-soft">&ldquo;{thread.firstMessage}&rdquo;</blockquote>}
                <label className="block text-[11px] font-semibold text-ink-soft">Change the source
                  <select value={thread.sourceId ?? ''} onChange={(e) => act('source', { sourceId: e.target.value || null })} aria-label="Lead source" className="mt-1 w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12px] font-semibold text-ink outline-none focus:border-brand">
                    <option value="">No ad / unknown</option>
                    {thread.sourceId && !leadSources.some((x) => x.id === thread.sourceId) && <option value={thread.sourceId}>{thread.source?.label}</option>}
                    {leadSources.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                </label>
              </div>
            ) : <p className="text-[12.5px] text-ink-soft">The first message will be saved here and compared with your ads.</p>}
          </Block>

          {thread && (
            <Block title="Labels">
              <LabelsBlock groupId={thread.id} onChat={thread.labels ?? []} all={allLabels} onChanged={() => void refresh()} />
            </Block>
          )}

          {thread && (
            <Block title={`Follow-up${thread.reminders?.filter((r) => !r.doneAt).length ? ` (${thread.reminders.filter((r) => !r.doneAt).length})` : ''}`}>
              <RemindersBlock thread={{ ...thread, reminders: thread.reminders ?? [] }} agents={agents} me={me} onChanged={() => void refresh()} />
            </Block>
          )}

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

          <Block title={`Lead & deals (${thread?.deals.length ?? 0})`}>
            {thread ? <LeadBlock thread={thread} me={me} agents={agents} onChanged={() => void refresh()} /> : <p className="text-[12.5px] text-ink-soft">Loading...</p>}
          </Block>
        </aside>
      )}

      {qrOpen && <QuickReplyManager items={quick} onClose={() => setQrOpen(false)} onChanged={() => void loadQuick()} />}
    </div>
  );
}
