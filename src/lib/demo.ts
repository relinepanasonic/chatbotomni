import { NextResponse } from 'next/server';
import type { ChatStatus, ConversationSummary, ListResponse, Thread, ThreadMessage } from './types';

/** Made-up chats for previewing the design locally (DEMO=1, never in production). Nothing here touches the ERP or WhatsApp. */

const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const M = (id: string, sender: ThreadMessage['sender'], text: string, min: number, senderName: string | null = null): ThreadMessage => ({ id, sender, senderName, text, mediaType: null, at: ago(min) });

interface DemoChat { id: string; phone: string; name: string; status: ChatStatus; botReplies: number; lead: { name?: string; store?: string; need?: string } | null; messages: ThreadMessage[]; client?: Thread['client']; deals?: Thread['deals'] }

const chats: DemoChat[] = [
  { id: 'c1', phone: '6281234500011', name: 'Budi Santoso', status: 'bot', botReplies: 1, lead: { name: 'Budi', store: 'Kawat Nyamuk Jaya', need: 'Iklan Shopee' },
    messages: [M('1', 'lead', 'Halo, mau tanya paket kelola toko Shopee', 6), M('2', 'bot', 'Hi kak, Fefe disini. Apa ada yang bisa dibantu kak? Boleh tau toko kakak jualan apa ya?', 5), M('3', 'lead', 'jual kawat nyamuk, tapi lagi sepi pembeli', 2)] },
  { id: 'c2', phone: '6281234500022', name: 'Sari Dewi', status: 'human', botReplies: 2, lead: { name: 'Sari', store: 'Sari Fashion', need: 'Nego harga' },
    messages: [M('1', 'lead', 'Kak, paket Juragan bisa nego?', 95), M('2', 'bot', 'Untuk soal harga, biar tim kami yang bahas langsung dengan kakak ya. Fefe kabari mereka sekarang, mohon ditunggu sebentar ya kak.', 94), M('3', 'team', 'Siang kak Sari, saya Rani dari tim Prof. Boleh cerita omzet toko sekarang berapa?', 70, 'Rani'), M('4', 'lead', 'Sekitar 15 juta sebulan kak', 66)],
    client: { id: 'k1', name: 'Sari Fashion', sales: 'Rani', serviceEnd: null }, deals: [{ id: 'd1', title: 'Paket Optimize Shopee Juragan', stage: 'Negotiation', value: 3000000, sales: 'Rani' }] },
  { id: 'c3', phone: '6281234500033', name: 'Toko Panasonic Medan', status: 'human', botReplies: 0, lead: null,
    messages: [M('1', 'lead', 'Kak, laporan minggu ini kok belum masuk ya?', 240), M('2', 'team', 'Sudah kami cek kak, laporannya dikirim hari ini sore ya.', 232, 'Vani')],
    client: { id: 'k2', name: 'Panasonic Medan', sales: 'Lucy', serviceEnd: '2026-11-27' }, deals: [] },
  { id: 'c4', phone: '6281234500044', name: 'Dian', status: 'new', botReplies: 0, lead: null, messages: [M('1', 'lead', 'info iklan', 12)] },
  { id: 'c5', phone: '6281234500055', name: 'Hendra Wijaya', status: 'bot', botReplies: 2, lead: { name: 'Hendra', store: 'HW Spareparts' },
    messages: [M('1', 'lead', 'Selamat pagi, saya lihat iklan kakak di Instagram', 1500), M('2', 'bot', 'Hi kak, Fefe disini. Boleh tau toko kakak jualan apa ya?', 1499), M('3', 'lead', 'sparepart motor', 1480), M('4', 'bot', 'Wah, sparepart motor ya kak. Toko kakak sekarang sudah jalan di Shopee, atau baru mau mulai?', 1479)] },
  { id: 'c6', phone: '6281234500066', name: 'Maya', status: 'off', botReplies: 0, lead: null, messages: [M('1', 'lead', 'Terima kasih kak', 3000), M('2', 'team', 'Sama-sama kak Maya', 2990, 'Lucy')] },
];

const summary = (c: DemoChat): ConversationSummary => {
  const last = c.messages[c.messages.length - 1];
  const parts = c.name.split(/\s+/);
  return { id: c.id, phone: c.phone, name: c.name, initials: (parts.length > 1 ? parts[0][0] + parts[1][0] : c.name.slice(0, 2)).toUpperCase(), lastText: last.text.length > 90 ? `${last.text.slice(0, 87)}...` : last.text, lastAt: last.at, lastFromMe: last.sender !== 'lead', unserved: last.sender === 'lead', status: c.status, lead: c.lead, botReplies: c.botReplies };
};

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export function demoHandle(path: string, method: 'GET' | 'POST', body: unknown): NextResponse {
  const url = new URL(path, 'http://demo');
  const parts = url.pathname.split('/').filter(Boolean);     // conversations, <id>, send|status
  if (parts[0] !== 'conversations') return json({ error: 'Not found.' }, 404);

  if (parts.length === 1) {
    const all = chats.map(summary).sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)));
    const f = url.searchParams.get('filter') || 'all';
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const list = all.filter((c) => (f === 'unserved' ? c.unserved : f === 'bot' ? c.status === 'bot' : f === 'human' ? c.status === 'human' : true) && (!q || [c.name, c.phone, c.lastText].some((v) => v.toLowerCase().includes(q))));
    const res: ListResponse = { me: { name: 'Demo', role: 'sales' }, conversations: list, counts: { all: all.length, unserved: all.filter((c) => c.unserved).length, bot: all.filter((c) => c.status === 'bot').length, human: all.filter((c) => c.status === 'human').length } };
    return json(res);
  }
  const chat = chats.find((c) => c.id === parts[1]);
  if (!chat) return json({ error: 'Chat not found.' }, 404);

  if (parts.length === 2 && method === 'GET') {
    const t: Thread = {
      id: chat.id, phone: chat.phone, name: chat.name, messages: chat.messages,
      bot: { status: chat.status, replies: chat.botReplies, reason: chat.status === 'human' ? 'A salesperson replied.' : null, lead: chat.lead },
      botLog: chat.messages.filter((m) => m.sender === 'bot').map((m) => ({ reply: m.text, handoff: /tim kami/i.test(m.text), ok: true, detail: null, created_at: m.at })),
      client: chat.client ?? null, deals: chat.deals ?? [],
    };
    return json(t);
  }
  if (parts[2] === 'send' && method === 'POST') {
    const text = String((body as any)?.text ?? '').trim();
    if (!text) return json({ error: 'Type a message first.' }, 400);
    chat.messages.push(M(`m${Date.now()}`, 'team', text, 0, 'Demo'));
    chat.status = 'human';
    return json({ ok: true, message: { id: 'x', at: new Date().toISOString() } });
  }
  if (parts[2] === 'status' && method === 'POST') {
    const s = (body as any)?.status;
    if (!['bot', 'human', 'off'].includes(s)) return json({ error: 'status must be bot, human or off.' }, 400);
    chat.status = s;
    return json({ ok: true });
  }
  return json({ error: 'Not found.' }, 404);
}
