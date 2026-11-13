import { NextResponse } from 'next/server';
import type { Agent, BibleDocFull, BotSettings, ChatStatus, ConversationSummary, ListResponse, Person, QuickReply, Thread, ThreadMessage } from './types';

/** Made-up chats for previewing the design locally (DEMO=1, never in production). Nothing here touches the ERP or WhatsApp. */

const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const M = (id: string, sender: ThreadMessage['sender'], text: string, min: number, senderName: string | null = null): ThreadMessage => ({ id, sender, senderName, text, mediaType: null, at: ago(min) });

const AGENTS: Agent[] = [{ id: 'u-demo', name: 'Demo', role: 'sales' }, { id: 'u-rani', name: 'Rani', role: 'sales' }, { id: 'u-lucy', name: 'Lucy', role: 'sales' }, { id: 'u-vani', name: 'Vani', role: 'admin' }];
const ME: Person = { id: 'u-demo', name: 'Demo' };

interface DemoChat { id: string; phone: string; name: string; status: ChatStatus; botReplies: number; lead: { name?: string; store?: string; need?: string } | null; messages: ThreadMessage[]; assignedTo: Person | null; resolved: boolean; client?: Thread['client']; deals?: Thread['deals'] }

const chats: DemoChat[] = [
  { id: 'c1', phone: '6281234500011', name: 'Budi Santoso', status: 'bot', botReplies: 1, assignedTo: null, resolved: false, lead: { name: 'Budi', store: 'Kawat Nyamuk Jaya', need: 'Iklan Shopee' },
    messages: [M('1', 'lead', 'Halo, mau tanya paket kelola toko Shopee', 26), M('2', 'bot', 'Hi kak, Fefe disini. Apa ada yang bisa dibantu kak? Boleh tau toko kakak jualan apa ya?', 25), M('3', 'lead', 'jual kawat nyamuk, tapi lagi sepi pembeli', 19)] },
  { id: 'c2', phone: '6281234500022', name: 'Sari Dewi', status: 'human', botReplies: 2, assignedTo: { id: 'u-rani', name: 'Rani' }, resolved: false, lead: { name: 'Sari', store: 'Sari Fashion', need: 'Nego harga' },
    messages: [M('1', 'lead', 'Kak, paket Juragan bisa nego?', 95), M('2', 'bot', 'Untuk soal harga, biar tim kami yang bahas langsung dengan kakak ya. Fefe kabari mereka sekarang, mohon ditunggu sebentar ya kak.', 94), M('3', 'team', 'Siang kak Sari, saya Rani dari tim Prof. Boleh cerita omzet toko sekarang berapa?', 70, 'Rani'), M('n1', 'note', 'Minta telepon sore, sebelum jam 4.', 66, 'Rani'), M('4', 'lead', 'Sekitar 15 juta sebulan kak', 66)],
    client: { id: 'k1', name: 'Sari Fashion', sales: 'Rani', serviceEnd: null }, deals: [{ id: 'd1', title: 'Paket Optimize Shopee Juragan', stage: 'Negotiation', value: 3000000, sales: 'Rani' }] },
  { id: 'c3', phone: '6281234500033', name: 'Toko Panasonic Medan', status: 'human', botReplies: 0, assignedTo: { id: 'u-demo', name: 'Demo' }, resolved: false, lead: null,
    messages: [M('1', 'lead', 'Kak, laporan minggu ini kok belum masuk ya?', 240), M('2', 'team', 'Sudah kami cek kak, laporannya dikirim hari ini sore ya.', 232, 'Vani')],
    client: { id: 'k2', name: 'Panasonic Medan', sales: 'Lucy', serviceEnd: '2026-11-27' }, deals: [] },
  { id: 'c4', phone: '6281234500044', name: 'Dian', status: 'new', botReplies: 0, assignedTo: null, resolved: false, lead: null, messages: [M('1', 'lead', 'info iklan', 4)] },
  { id: 'c5', phone: '6281234500055', name: 'Hendra Wijaya', status: 'bot', botReplies: 2, assignedTo: { id: 'u-lucy', name: 'Lucy' }, resolved: false, lead: { name: 'Hendra', store: 'HW Spareparts' },
    messages: [M('1', 'lead', 'Selamat pagi, saya lihat iklan kakak di Instagram', 1500), M('2', 'bot', 'Hi kak, Fefe disini. Boleh tau toko kakak jualan apa ya?', 1499), M('3', 'lead', 'sparepart motor', 1480), M('4', 'bot', 'Wah, sparepart motor ya kak. Toko kakak sekarang sudah jalan di Shopee, atau baru mau mulai?', 1479)] },
  { id: 'c6', phone: '6281234500066', name: 'Maya', status: 'off', botReplies: 0, assignedTo: { id: 'u-lucy', name: 'Lucy' }, resolved: true, lead: null, messages: [M('1', 'lead', 'Terima kasih kak', 3000), M('2', 'team', 'Sama-sama kak Maya', 2990, 'Lucy')] },
];

const QUICK: QuickReply[] = [
  { id: 'q1', shortcut: 'salam', title: 'Salam pembuka', body: 'Hi kak, terima kasih sudah menghubungi Prof Toko Online. Boleh tau toko kakak jualan apa ya?' },
  { id: 'q2', shortcut: 'paket', title: 'Info paket', body: 'Untuk kelola toko Shopee ada beberapa pilihan paket kak, mulai dari New Store sampai Big Company. Pilihannya tergantung omzet dan jumlah produk toko kakak.' },
  { id: 'q3', shortcut: 'telp', title: 'Minta telepon', body: 'Boleh kak, kira-kira jam berapa waktu yang enak untuk dihubungi tim kami?' },
];

const chatChat = (c: DemoChat) => c.messages.filter((m) => m.sender !== 'note');
const summary = (c: DemoChat): ConversationSummary => {
  const list = chatChat(c);
  const last = list[list.length - 1];
  let waiting: string | null = null;
  for (let i = list.length - 1; i >= 0 && list[i].sender === 'lead'; i--) waiting = list[i].at;
  const lastLead = [...list].reverse().find((m) => m.sender === 'lead');
  const parts = c.name.split(/\s+/);
  return {
    id: c.id, phone: c.phone, name: c.name, initials: (parts.length > 1 ? parts[0][0] + parts[1][0] : c.name.slice(0, 2)).toUpperCase(),
    lastText: last.text.length > 90 ? `${last.text.slice(0, 87)}...` : last.text, lastAt: last.at, lastFromMe: last.sender !== 'lead',
    unserved: last.sender === 'lead', waitingSince: last.sender === 'lead' ? waiting : null, status: c.status, lead: c.lead, botReplies: c.botReplies,
    assignedTo: c.assignedTo, resolved: c.resolved && !(lastLead && lastLead.at > ago(0)),
  };
};

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export function demoHandle(path: string, method: 'GET' | 'POST' | 'DELETE', body: unknown): NextResponse {
  const url = new URL(path, 'http://demo');
  const parts = url.pathname.split('/').filter(Boolean);
  const b: any = body;

  if (parts[0] === 'bible') return bibleDemo(parts, method, b);
  if (parts[0] === 'agents') return json({ agents: AGENTS });
  if (parts[0] === 'quick-replies') {
    if (method === 'GET') return json({ quickReplies: QUICK });
    if (method === 'DELETE') { const i = QUICK.findIndex((q) => q.id === parts[1]); if (i >= 0) QUICK.splice(i, 1); return json({ ok: true }); }
    const shortcut = String(b?.shortcut ?? '').replace(/^\/+/, '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!shortcut || !String(b?.title ?? '').trim() || !String(b?.body ?? '').trim()) return json({ error: 'Fill in the shortcut, title and message.' }, 400);
    const existing = b?.id ? QUICK.find((q) => q.id === b.id) : undefined;
    if (QUICK.some((q) => q.shortcut === shortcut && q !== existing)) return json({ error: `The shortcut /${shortcut} is already used.` }, 409);
    if (existing) Object.assign(existing, { shortcut, title: b.title, body: b.body }); else QUICK.push({ id: `q${Date.now()}`, shortcut, title: String(b.title), body: String(b.body) });
    return json({ ok: true });
  }
  if (parts[0] !== 'conversations') return json({ error: 'Not found.' }, 404);

  if (parts.length === 1) {
    const all = chats.map(summary).sort((a, b2) => String(b2.lastAt).localeCompare(String(a.lastAt)));
    const f = url.searchParams.get('filter') || 'all';
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const open = all.filter((c) => !c.resolved);
    const list = all.filter((c) => (f === 'resolved' ? c.resolved : !c.resolved && (f === 'mine' ? c.assignedTo?.id === ME.id : f === 'unserved' ? c.unserved : f === 'bot' ? c.status === 'bot' : true)) && (!q || [c.name, c.phone, c.lastText, c.assignedTo?.name].some((v) => String(v || '').toLowerCase().includes(q))));
    const res: ListResponse = { me: { ...ME, role: 'sales' }, conversations: list, counts: { all: open.length, mine: open.filter((c) => c.assignedTo?.id === ME.id).length, unserved: open.filter((c) => c.unserved).length, bot: open.filter((c) => c.status === 'bot').length, human: open.filter((c) => c.status === 'human').length, resolved: all.length - open.length } };
    return json(res);
  }
  const chat = chats.find((c) => c.id === parts[1]);
  if (!chat) return json({ error: 'Chat not found.' }, 404);

  if (parts.length === 2 && method === 'GET') {
    const t: Thread = {
      id: chat.id, phone: chat.phone, name: chat.name, messages: [...chat.messages].sort((x, y) => x.at.localeCompare(y.at)),
      bot: { status: chat.status, replies: chat.botReplies, reason: chat.status === 'human' ? 'A salesperson replied.' : null, lead: chat.lead },
      botLog: chat.messages.filter((m) => m.sender === 'bot').map((m) => ({ reply: m.text, handoff: /tim kami/i.test(m.text), ok: true, detail: null, created_at: m.at })),
      assignedTo: chat.assignedTo, resolved: summary(chat).resolved, client: chat.client ?? null, deals: chat.deals ?? [],
    };
    return json(t);
  }
  const leaf = parts[2];
  if (leaf === 'send' && method === 'POST') {
    const text = String(b?.text ?? '').trim();
    if (!text) return json({ error: 'Type a message first.' }, 400);
    chat.messages.push(M(`m${Date.now()}`, 'team', text, 0, ME.name));
    chat.status = 'human'; chat.resolved = false; if (!chat.assignedTo) chat.assignedTo = ME;
    return json({ ok: true, message: { id: 'x', at: new Date().toISOString() } });
  }
  if (leaf === 'status' && method === 'POST') {
    if (!['bot', 'human', 'off'].includes(b?.status)) return json({ error: 'status must be bot, human or off.' }, 400);
    chat.status = b.status; if (b.status === 'human' && !chat.assignedTo) chat.assignedTo = ME;
    return json({ ok: true });
  }
  if (leaf === 'assign' && method === 'POST') {
    if (b?.userId === null || b?.userId === '') { chat.assignedTo = null; return json({ ok: true, assignedTo: null }); }
    const a = AGENTS.find((x) => x.id === b?.userId);
    if (!a) return json({ error: 'That person cannot be given chats.' }, 400);
    chat.assignedTo = { id: a.id, name: a.name };
    return json({ ok: true, assignedTo: chat.assignedTo });
  }
  if (leaf === 'resolve' && method === 'POST') { chat.resolved = b?.resolved !== false; return json({ ok: true }); }
  if (leaf === 'notes' && method === 'POST') {
    const text = String(b?.text ?? '').trim();
    if (!text) return json({ error: 'Type the note first.' }, 400);
    chat.messages.push(M(`n${Date.now()}`, 'note', text, 0, ME.name));
    return json({ ok: true });
  }
  if (leaf === 'suggest' && method === 'POST') {
    const last = [...chat.messages].reverse().find((m) => m.sender === 'lead');
    return json({ ok: true, text: `Siap kak, terima kasih infonya${last ? ` soal "${last.text.slice(0, 30)}"` : ''}. Biar kami bisa bantu lebih pas, boleh tau omzet toko kakak sekarang kira-kira berapa per bulan?`, model: 'demo' });
  }
  return json({ error: 'Not found.' }, 404);
}

// ---------------------------------------------------------------- AI Bible (demo)
const DECK_TEXT = `TENTANG KAMI
Prof Toko Online mengelola toko Shopee dan iklannya supaya penjualan naik. Laporan performa dikirim tiap minggu lewat WhatsApp.

PAKET OPTIMIZE SHOPEE (jasa per bulan, belum termasuk saldo iklan)
Paket New Store: Rp 1.500.000 per bulan. Untuk toko baru. Termasuk 100x Friends Order dan foto + editing 10 produk.
Paket Lapak: Rp 2.000.000 per bulan. Kelola akun Shopee, etalase, dan iklan.
Paket Juragan: Rp 3.000.000 per bulan. Untuk toko dengan omzet menengah.
Paket Sultan: Rp 4.000.000 per bulan. Untuk toko dengan banyak produk.
Paket Big Company: Rp 5.000.000 per bulan. Untuk toko besar.

TAMBAHAN
Paket Meta Ads: Rp 3.000.000 per bulan, belum termasuk budget iklan Meta.
Friends Order: Rp 350.000 per 20 order dalam 1 toko, pengerjaan 2 sampai 4 minggu.

SYARAT
Kontrak minimal 3 bulan. [TIDAK TERBACA: halaman 7]`;

const dayAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const docs: BibleDocFull[] = [
  { id: 'b1', title: 'Sales Deck Oktober 2026', kind: 'sales_deck', file_name: 'Sales-Deck-Okt.pdf', file_size: 3_400_000, status: 'ready', error: null, active: true, version: 2, replaces: 'b0', uploaded_by: 'Nico', created_at: dayAgo(41), text_updated_at: dayAgo(41), text_updated_by: 'Nico', chars: DECK_TEXT.length, text: DECK_TEXT },
  { id: 'b0', title: 'Sales Deck September 2026', kind: 'sales_deck', file_name: 'Sales-Deck-Sep.pdf', file_size: 3_100_000, status: 'ready', error: null, active: false, version: 1, replaces: null, uploaded_by: 'Nico', created_at: dayAgo(75), text_updated_at: dayAgo(75), text_updated_by: 'Nico', chars: 900, text: 'Versi lama. Paket Sultan: Rp 3.500.000.' },
  { id: 'b2', title: 'Daftar harga Meta Ads', kind: 'sales_deck', file_name: 'meta.pdf', file_size: 800_000, status: 'ready', error: null, active: true, version: 1, replaces: null, uploaded_by: 'Vani', created_at: dayAgo(6), text_updated_at: dayAgo(2), text_updated_by: 'Vani', chars: 120, text: 'Paket Meta Ads: Rp 3.000.000 per bulan, belum termasuk budget iklan.' },
];
const settings: BotSettings = { enabled: true, persona_name: 'Fefe', company_name: 'Prof Toko Online', hours_from: '08:00', hours_to: '21:00', max_replies: 4, knowledge: 'TENTANG KAMI\nProf Toko Online membantu toko online supaya penjualannya naik.\nISI: alamat kantor dan jam kerja tim.' };

function bibleDemo(parts: string[], method: 'GET' | 'POST' | 'DELETE', b: any): NextResponse {
  const slim = (d: BibleDocFull) => { const { text, ...rest } = d; void text; return rest; };
  if (parts.length === 1) return json({ docs: [...docs].sort((x, y) => y.created_at.localeCompare(x.created_at)).map(slim), settings, canEdit: true });
  if (parts[1] === 'upload-url') return json({ ok: true, path: `demo/${Date.now()}-${String(b?.fileName ?? 'deck.pdf')}`, token: 'demo', bucket: 'ai-bible' });
  if (parts[1] === 'ingest') {
    const old = b?.replaces ? docs.find((d) => d.id === b.replaces) : undefined;
    if (old) old.active = false;
    const doc: BibleDocFull = { id: `b${Date.now()}`, title: String(b?.title || 'Sales Deck'), kind: 'sales_deck', file_name: 'deck.pdf', file_size: 2_000_000, status: 'ready', error: null, active: true, version: old ? old.version + 1 : 1, replaces: old?.id ?? null, uploaded_by: 'Demo', created_at: new Date().toISOString(), text_updated_at: new Date().toISOString(), text_updated_by: 'Demo', chars: DECK_TEXT.length, text: DECK_TEXT };
    docs.push(doc);
    return json({ ok: true, doc });
  }
  if (parts[1] === 'ask') {
    const q = String(b?.question ?? '').toLowerCase().trim();
    if (!q) return json({ error: 'Type a question first.' }, 400);
    const live = docs.filter((d) => d.active).map((d) => d.text).join('\n').split('\n');
    const words = q.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !['berapa', 'harga', 'paket', 'apa', 'yang', 'untuk'].includes(w));
    const hits = live.filter((l) => words.some((w) => l.toLowerCase().includes(w)));
    return json({ ok: true, answer: hits.length ? hits.slice(0, 3).join('\n') : 'Itu belum ada di AI Bible.', model: 'demo' });
  }
  if (parts[1] === 'settings' && method === 'POST') { Object.assign(settings, Object.fromEntries(Object.entries(b || {}).filter(([, v]) => v !== undefined))); return json({ ok: true }); }
  const doc = docs.find((d) => d.id === parts[1]);
  if (!doc) return json({ error: 'Document not found.' }, 404);
  if (method === 'GET') return json(doc);
  if (method === 'DELETE') { docs.splice(docs.indexOf(doc), 1); return json({ ok: true }); }
  if (typeof b?.title === 'string' && b.title.trim()) doc.title = b.title.trim();
  if (typeof b?.text === 'string') { doc.text = b.text; doc.chars = b.text.length; doc.text_updated_at = new Date().toISOString(); doc.text_updated_by = 'Demo'; }
  if (typeof b?.active === 'boolean') doc.active = b.active;
  return json({ ok: true });
}
