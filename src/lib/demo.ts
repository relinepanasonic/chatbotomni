import { NextResponse } from 'next/server';
import { exampleFlows, isTrigger, validateGraph, type Graph } from './flow';
import type { FlowFull, FlowListItem, FlowRun, Meeting, MeetSettings, BroadcastItem, BcSettings } from './types';
import type { ChatLabel, ReminderItem, Agent, ChatSource, Channel, LeadSource, SourceReport, BibleDocFull, BibleLogEntry, BotSettings, ChatStatus, ConversationSummary, ListResponse, Person, QuickReply, Thread, ThreadMessage } from './types';

/** Made-up chats for previewing the design locally (DEMO=1, never in production). Nothing here touches the ERP or WhatsApp. */

const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const M = (id: string, sender: ThreadMessage['sender'], text: string, min: number, senderName: string | null = null): ThreadMessage => ({ id, sender, senderName, text, mediaType: null, at: ago(min) });

const AGENTS: Agent[] = [{ id: 'u-demo', name: 'Demo', role: 'sales' }, { id: 'u-rani', name: 'Rani', role: 'sales' }, { id: 'u-lucy', name: 'Lucy', role: 'sales' }, { id: 'u-vani', name: 'Vani', role: 'admin' }];
const ME: Person = { id: 'u-demo', name: 'Demo' };

interface DemoChat { id: string; phone: string; name: string; status: ChatStatus; botReplies: number; lead: { name?: string; store?: string; need?: string } | null; messages: ThreadMessage[]; assignedTo: Person | null; resolved: boolean; src?: { sourceId: string | null; label: string | null; channel: string; by: string | null; first: string }; client?: Thread['client']; deals?: Thread['deals']; labelIds?: string[]; rems?: ReminderItem[] }

// kept on globalThis: in development each API route gets its own copy of this file
const chats: DemoChat[] = ((globalThis as any).__demoChats ??= [
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
  { id: 'c7', phone: 'ig:17841400000001', name: 'Rina Hijab Store', status: 'bot', botReplies: 1, assignedTo: null, resolved: false, lead: { name: 'Rina', store: 'Rina Hijab Store' },
    messages: [M('1', 'lead', 'Kak, mau tanya jasa kelola Shopee nya dong', 18), M('2', 'bot', 'Hi kak, Fefe disini. Boleh tau toko kakak jualan apa ya?', 17), M('3', 'lead', 'Hijab dan gamis kak', 15)] },
  { id: 'c8', phone: 'fb:6011111111111111', name: 'Agus Pratama', status: 'human', botReplies: 1, assignedTo: { id: 'u-rani', name: 'Rani' }, resolved: false, lead: null,
    messages: [M('1', 'lead', 'Halo, ini harga paketnya berapa?', 1700), M('2', 'bot', 'Hi kak, Fefe disini. Untuk paketnya mulai dari Rp 1,5 jt per bulan kak.', 1699)] },
  { id: 'c6', phone: '6281234500066', name: 'Maya', status: 'off', botReplies: 0, assignedTo: { id: 'u-lucy', name: 'Lucy' }, resolved: true, lead: null, messages: [M('1', 'lead', 'Terima kasih kak', 3000), M('2', 'team', 'Sama-sama kak Maya', 2990, 'Lucy')] },
]);

const SOURCES: LeadSource[] = [
  { id: 's1', name: 'Meta Ads: Promo Paket Sultan', channel: 'meta_ads', first_message: 'Halo kak, saya mau tanya Paket Sultan dari iklan Instagram', active: true, created_at: ago(60 * 24 * 20), created_by: 'Nico' },
  { id: 's2', name: 'Google Ads: Kelola Toko Shopee', channel: 'google_ads', first_message: 'Halo, saya tertarik jasa kelola toko Shopee dari Google', active: true, created_at: ago(60 * 24 * 9), created_by: 'Nico' },
  { id: 's3', name: 'TikTok Ads: Friends Order', channel: 'tiktok_ads', first_message: 'Kak, mau info Friends Order dari TikTok', active: false, created_at: ago(60 * 24 * 3), created_by: 'Vani' },
];
chats[0].src = { sourceId: 's1', label: SOURCES[0].name, channel: 'meta_ads', by: null, first: SOURCES[0].first_message };
chats[1].src = { sourceId: 's2', label: SOURCES[1].name, channel: 'google_ads', by: 'Rani', first: 'Kak, paket Juragan bisa nego?' };
chats[3].src = { sourceId: null, label: null, channel: 'unknown', by: null, first: 'info iklan' };
chats[4].src = { sourceId: 's1', label: SOURCES[0].name, channel: 'meta_ads', by: null, first: SOURCES[0].first_message };

const LABELS: ChatLabel[] = [{ id: 'lb1', name: 'Hot lead', color: 'red' }, { id: 'lb2', name: 'Toko baru', color: 'green' }, { id: 'lb3', name: 'VIP', color: 'amber' }];
const remState = (iso: string): ReminderItem['state'] => (Date.parse(iso) <= Date.now() ? 'overdue' : new Date(iso).toDateString() === new Date().toDateString() ? 'today' : 'later');
chats[0].labelIds = ['lb1', 'lb2'];
chats[1].labelIds = ['lb3'];
chats[1].rems = [{ id: 'rm1', dueAt: new Date(Date.now() - 30 * 60000).toISOString(), note: 'Kirim proposal paket Juragan', assignedName: 'Rani', createdBy: 'Rani', doneAt: null, doneBy: null, state: 'overdue' }];
chats[0].rems = [{ id: 'rm2', dueAt: new Date(Date.now() + 26 * 3600000).toISOString(), note: 'Tanya omzet', assignedName: 'Demo', createdBy: 'Demo', doneAt: null, doneBy: null, state: 'later' }];
const labelsOf = (c: DemoChat) => LABELS.filter((l) => (c.labelIds || []).includes(l.id));
const remsOf = (c: DemoChat) => (c.rems || []).map((r) => ({ ...r, state: remState(r.dueAt) }));
const nextRem = (c: DemoChat) => { const r = remsOf(c).filter((x) => !x.doneAt).sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0]; return r ? { id: r.id, dueAt: r.dueAt, note: r.note, state: r.state } : null; };

const QUICK: QuickReply[] = [
  { id: 'q1', shortcut: 'salam', title: 'Salam pembuka', body: 'Hi kak, terima kasih sudah menghubungi Prof Toko Online. Boleh tau toko kakak jualan apa ya?' },
  { id: 'q2', shortcut: 'paket', title: 'Info paket', body: 'Untuk kelola toko Shopee ada beberapa pilihan paket kak, mulai dari New Store sampai Big Company. Pilihannya tergantung omzet dan jumlah produk toko kakak.' },
  { id: 'q3', shortcut: 'telp', title: 'Minta telepon', body: 'Boleh kak, kira-kira jam berapa waktu yang enak untuk dihubungi tim kami?' },
];

const chatChat = (c: DemoChat) => c.messages.filter((m) => m.sender !== 'note');
const srcOf = (c: DemoChat): ChatSource | null => (c.src ? { label: c.src.label, channel: c.src.channel, by: c.src.by } : null);
const summary = (c: DemoChat): ConversationSummary => {
  const list = chatChat(c);
  const last = list[list.length - 1];
  let waiting: string | null = null;
  for (let i = list.length - 1; i >= 0 && list[i].sender === 'lead'; i--) waiting = list[i].at;
  const lastLead = [...list].reverse().find((m) => m.sender === 'lead');
  const parts = c.name.split(/\s+/);
  return {
    ignored: !!(c as any).ignored,
    id: c.id, phone: c.phone, name: c.name, initials: (parts.length > 1 ? parts[0][0] + parts[1][0] : c.name.slice(0, 2)).toUpperCase(),
    lastText: last.text.length > 90 ? `${last.text.slice(0, 87)}...` : last.text, lastAt: last.at, lastFromMe: last.sender !== 'lead',
    unserved: last.sender === 'lead', waitingSince: last.sender === 'lead' ? waiting : null, status: c.status, lead: c.lead, botReplies: c.botReplies,
    assignedTo: c.assignedTo, resolved: c.resolved && !(lastLead && lastLead.at > ago(0)),
    source: srcOf(c), labels: labelsOf(c), nextReminder: nextRem(c),
  };
};

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export function demoHandle(path: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body: unknown): NextResponse {
  const url = new URL(path, 'http://demo');
  const parts = url.pathname.split('/').filter(Boolean);
  const b: any = body;

  if (parts[0] === 'bible') return bibleDemo(parts, method, b);
  if (parts[0] === 'channels') {
    if (method === 'POST' && parts.length === 1) return json({ ok: true, page: 'Prof Toko Online', instagram: '@proftokoonline', subscribed: true, warning: null });
    if (method === 'POST') return json({ ok: true });
    return json({ accounts: [{ id: 'd1', channel: 'whatsapp', name: '+6285758789999', active: true }, { id: 'd2', channel: 'messenger', name: 'Messenger: Prof Toko Online', active: true }, { id: 'd3', channel: 'instagram', name: 'Instagram: @proftokoonline', active: true }],
      meta: { pageToken: true, appSecret: true, verifyToken: true, appId: false, webhookPath: '/api/meta/webhook' }, canEdit: true });
  }
  if (parts[0] === 'meetings') return meetingsDemo(parts, method, b);
  if (parts[0] === 'broadcasts') return broadcastsDemo(parts, method, b);
  if (parts[0] === 'conversations' && parts[2] === 'meeting' && method === 'POST') {
    const slot = demoSlots().find((x) => x.code === b?.start);
    if (!slot) return json({ error: 'That time is not free any more. Pick another one.' }, 409);
    const chat = chats.find((c) => c.id === parts[1]);
    const m: Meeting = { id: `m${Date.now()}`, group_id: parts[1], lead_name: chat?.name ?? null, store: chat?.lead?.store ?? null, starts_at: slot.code, ends_at: new Date(new Date(slot.code).getTime() + meetSettings.minutes * 60000).toISOString(), status: 'booked', meet_url: 'https://meet.google.com/demo-abcd-efg', booked_by: 'Demo', note: null, created_at: new Date().toISOString(), chat: chat?.name };
    demoMeetings.push(m);
    return json({ ok: true, meeting: m, sent: true, detail: 'sent' });
  }
  if (parts[0] === 'stats') return json(demoStats(Number(url.searchParams.get('days')) || 30));
  if (parts[0] === 'flows') return flowsDemo(parts, method, b);
  if (parts[0] === 'sources') return sourcesDemo(parts, method, b, url);
  if (parts[0] === 'labels') {
    if (method === 'GET') return json({ labels: LABELS });
    if (method === 'DELETE') { const i = LABELS.findIndex((l) => l.id === parts[1]); if (i >= 0) LABELS.splice(i, 1); return json({ ok: true }); }
    const name = String(b?.name ?? '').trim();
    if (!name) return json({ error: 'Give the label a name.' }, 400);
    if (LABELS.some((l) => l.name.toLowerCase() === name.toLowerCase())) return json({ error: `A label called "${name}" already exists.` }, 409);
    LABELS.push({ id: `lb${Date.now()}`, name, color: String(b?.color || 'blue') });
    return json({ ok: true });
  }
  if (parts[0] === 'groups' && parts[2] === 'log') {
    return json({ entries: parts[1] === 'g1' ? [
      { at: new Date(Date.now() - 3600000).toISOString(), question: 'Kak gimana caranya biar toko Shopee ga sepi? produk udah 50 tapi order dikit', reply: 'wah klasik banget nih guys\ncek dulu judul sama foto utamanya, itu yang paling sering bikin sepi\nkalo udah rapi baru main iklan', ok: true, detail: 'sent' },
      { at: new Date(Date.now() - 1800000).toISOString(), question: 'Alhamdulillah omzet toko saya akhirnya tembus 50 juta bulan ini', reply: 'wah kereeeen kak\nbulan depan gas lagi ya', ok: true, detail: 'sent' },
      { at: new Date(Date.now() - 600000).toISOString(), question: 'Guys gimana sih jualan di shopee sekarang?', reply: '', ok: false, detail: 'Fonnte refused part 1: invalid group id' },
    ] : [] });
  }
  if (parts[0] === 'groups') {
    if (method === 'POST') { const g = demoGroups.find((x) => x.id === String(b?.id)); if (g) g.active = b?.active === true; return json({ ok: true }); }
    return json({ groups: demoGroups });
  }
  if (parts[0] === 'team') {
    if (method === 'POST') { const keep = new Set((b?.people || []).map((p: any) => p.id)); for (const p of demoTeam) p.inTeam = keep.has(p.id); return json({ ok: true }); }
    return json({ people: demoTeam });
  }
  if (parts[0] === 'me') return json({ id: ME.id, name: 'Demo (founder)', role: 'founder', isBod: true });
  if (parts[0] === 'insights') {
    if (parts[1] === 'summary') return json({ executive: 'Selama 30 hari terakhir ada 58 calon client yang menulis dengan 240 pesan. Paket Juragan paling banyak ditanya (14 chat), disusul Optimize Shopee (9 chat). Kekhawatiran terbesar adalah harga dan biaya (19 chat), lalu hasil dan jaminan omzet (11 chat). Kebutuhan yang paling sering disebut adalah iklan Shopee yang tidak boros dan toko yang sepi pembeli.', insights: ['Banyak calon client menanyakan harga sebelum paham paket yang cocok.', 'Kekhawatiran soal hasil muncul di 11 chat: client ingin bukti.'], actions: [{ action: 'Siapkan perbandingan paket yang jelas untuk balasan pertama.', pic: 'Sales', why: 'Harga ditanyakan di 19 chat' }, { action: 'Kumpulkan contoh hasil client untuk dikirim bersama deck.', pic: 'Tim Konten', why: 'Jaminan omzet kekhawatiran kedua' }], model: 'demo', ai: true, days: Number(b?.days) || 30 });
    const s = Math.max(1, Number(url.searchParams.get('days') || 30) / 30);
    const k = (key: string, label: string, chats: number, ex: string[]) => ({ key, label, chats: Math.round(chats * s), mentions: Math.round(chats * s * 1.4), examples: ex });
    return json({ days: Number(url.searchParams.get('days') || 30), chats: Math.round(58 * s), messages: Math.round(240 * s),
      packages: [k('juragan', 'Paket Juragan', 14, ['kak paket juragan itu include apa aja?']), k('optimize', 'Paket Optimize Shopee', 9, ['optimize shopee itu dikelola full ya kak?']), k('meta', 'Paket Meta Ads', 5, ['ada paket iklan meta ga?']), k('konsul', 'Konsultasi gratis', 4, []), k('deck', 'Deck / company profile', 3, [])],
      concerns: [k('harga', 'Harga dan biaya', 19, ['harganya berapa kak per bulan?', 'bisa nego ga kak?']), k('hasil', 'Hasil dan jaminan omzet', 11, ['ada jaminan omzet naik ga?']), k('sepi', 'Toko sepi / penjualan turun', 8, ['toko saya sepi pembeli kak']), k('iklan', 'Iklan boros / ROAS rendah', 6, ['iklan saya boros tapi ga laku']), k('percaya', 'Kepercayaan dan legalitas', 4, ['ada testimoni client lain?'])],
      unmatched: Math.round(60 * s), needs: [{ need: 'Iklan Shopee', chats: 6 }, { need: 'Toko sepi pembeli', chats: 4 }, { need: 'Nego harga', chats: 3 }], handedOver: [{ text: 'bisa buat akun lazada juga ga kak?' }, { text: 'apakah bisa dp dulu lalu cicil 3x' }] });
  }
  if (parts[0] === 'pipeline') {
    const rows = chats.flatMap((c) => (c.deals || []).map((d) => ({ c, d })));
    const mk = (id: string, client: string, title: string, stage: string, value: number, sales: string, days: number, gid: string | null, extra: object = {}) => ({ id, title, client, stage, value, sales, salesId: `u-${sales.toLowerCase()}`, groupId: gid, daysInStage: days, payment: null, nextMeetingAt: null, ...extra });
    const deals = [
      ...rows.map(({ c, d }) => mk(d.id, c.name, d.title, d.stage, d.value, d.sales || 'Rani', 2, c.id)),
      mk('p2', 'Kawat Nyamuk Jaya', 'Konsultasi gratis', 'Meeting Booked', 0, 'Rani', 1, 'c1', { nextMeetingAt: atWib(1, '10:00') }),
      mk('p3', 'Dian', 'Lead dari chat', 'Lead', 0, 'Lucy', 0, 'c4'),
      mk('p4', 'Toko Hijab Rina', 'Lead dari chat', 'Warm', 0, 'Lucy', 5, null),
      mk('p5', 'Sari Fashion', 'Paket Optimize', 'Invoice', 3000000, 'Rani', 3, 'c2', { payment: 'unpaid' }),
      mk('p6', 'Toko Bangunan Maju', 'Paket Juragan', 'Deal', 8000000, 'Lucy', 6, null, { payment: 'paid' }),
      mk('p7', 'Warung Kopi', 'Lead dari chat', 'Cold Case', 0, 'Lucy', 9, null),
    ];
    return json({ deals: deals.filter((x) => !boardGone[x.id]).map((x) => ({ ...x, code: x.id.replace(/\W/g, '').toUpperCase().padEnd(6, '0').slice(0, 6), ...(boardEdit[x.id]?.name ? { client: boardEdit[x.id].name } : {}), ...(boardStage[x.id] ? { stage: boardStage[x.id], daysInStage: 0 } : {}) })), stages: ['Lead', 'Contacted', 'Qualified', 'Warm', 'Meeting Offered', 'Meeting Booked', 'Meeting Done', 'Negotiation', 'Invoice Requested', 'Invoice', 'Deal', 'Cold Case', 'Lost'], me: { ...ME, role: 'sales' } });
  }
  if (parts[0] === 'deals' && parts.length === 2) {
    const id = parts[1];
    if (method === 'GET') { const e = boardEdit[id] || {}; return json({ id, code: id.replace(/\W/g, '').toUpperCase().padEnd(6, '0').slice(0, 6), stage: boardStage[id] || 'Lead', title: e.title ?? 'Lead dari chat', value: Number(e.value || 0), notes: e.notes ?? '', name: e.name ?? 'Demo lead', store: e.store ?? '', pic: e.pic ?? '', phone: e.phone ?? '', address: e.address ?? '', realClient: id === 'p5' || id === 'p6' }); }
    if (method === 'PATCH') { if (!String(b?.name ?? '').trim()) return json({ error: 'Give the lead a name (the brand, the store or the person).' }, 400); boardEdit[id] = Object.fromEntries(Object.entries(b || {}).map(([k, v]) => [k, String(v ?? '')])); return json({ ok: true }); }
    if (method === 'DELETE') { if (id === 'p5' || id === 'p6') return json({ error: 'This lead has an invoice or an invoice request, so it cannot be deleted. Move it to Lost instead.' }, 409); boardGone[id] = true; return json({ ok: true, clientDeleted: true }); }
  }
  if (parts[0] === 'deals' && parts[2] === 'stage') {
    if (/^p\d/.test(parts[1])) { boardStage[parts[1]] = String(b?.stage); return json({ ok: true }); }
    for (const c of chats) for (const d of c.deals || []) if (d.id === parts[1]) {
      if (d.stage === 'Invoice' || d.stage === 'Deal') return json({ error: 'An invoiced deal cannot move back.' }, 400);
      d.stage = String(b?.stage); boardStage[d.id] = d.stage; return json({ ok: true });
    }
    return json({ error: 'Deal not found.' }, 404);
  }
  if (parts[0] === 'reminders') {
    if (parts[2] === 'done') { for (const c of chats) for (const r of c.rems || []) if (r.id === parts[1]) { r.doneAt = b?.done === false ? null : new Date().toISOString(); r.doneBy = 'Demo'; } return json({ ok: true }); }
    return json({ reminders: chats.flatMap((c) => remsOf(c).filter((r) => !r.doneAt).map((r) => ({ ...r, groupId: c.id, chat: c.name }))) });
  }
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
    const label = url.searchParams.get('label') || '';
    const stageF = url.searchParams.get('stage') || '';
    const open = all.filter((c) => !c.resolved && !c.ignored);
    const list = all.filter((c) => (f === 'ignored' ? c.ignored : !c.ignored)).map((c) => { const d = chats.find((x) => x.id === c.id)?.deals?.[0]; return { ...c, stage: d?.stage ?? (c.id === 'c1' ? 'Meeting Booked' : c.id === 'c4' ? 'Lead' : null), payment: d?.stage === 'Invoice' ? 'unpaid' as const : null }; }).filter((c) => !stageF || (stageF === 'none' ? !c.stage : c.stage === stageF)).filter((c) => (f === 'resolved' ? c.resolved : !c.resolved && (f === 'mine' ? c.assignedTo?.id === ME.id : f === 'unserved' ? c.unserved : f === 'bot' ? c.status === 'bot' : f === 'followup' ? !!c.nextReminder && c.nextReminder.state !== 'later' : true)) && (!label || (c.labels || []).some((l) => l.id === label)) && (!q || [c.name, c.phone, c.lastText, c.assignedTo?.name].some((v) => String(v || '').toLowerCase().includes(q))));
    const res: ListResponse = { me: { ...ME, role: 'sales' }, conversations: list, counts: { all: open.length, mine: open.filter((c) => c.assignedTo?.id === ME.id).length, unserved: open.filter((c) => c.unserved).length, bot: open.filter((c) => c.status === 'bot').length, human: open.filter((c) => c.status === 'human').length, resolved: all.filter((c) => !c.ignored).length - open.length, ignored: all.filter((c) => c.ignored).length, followup: open.filter((c) => c.nextReminder && c.nextReminder.state !== 'later').length }, labels: LABELS, features: { media: settings.media_enabled === true } };
    return json(res);
  }
  const chat = chats.find((c) => c.id === parts[1]);
  if (!chat) return json({ error: 'Chat not found.' }, 404);

  if (parts.length === 2 && method === 'GET') {
    const t: Thread = {
      id: chat.id, phone: chat.phone, name: chat.name, messages: [...chat.messages].sort((x, y) => x.at.localeCompare(y.at)),
      bot: { status: chat.status, replies: chat.botReplies, reason: chat.status === 'human' ? 'A salesperson replied.' : null, lead: chat.lead },
      botLog: chat.messages.filter((m) => m.sender === 'bot').map((m) => ({ reply: m.text, handoff: /tim kami/i.test(m.text), ok: true, detail: null, created_at: m.at })),
      assignedTo: chat.assignedTo, resolved: summary(chat).resolved, source: srcOf(chat), sourceId: chat.src?.sourceId ?? null, firstMessage: chat.src?.first ?? null, client: chat.client ?? null, deals: chat.deals ?? [], labels: labelsOf(chat), reminders: remsOf(chat), meeting: meetingOf(chat.id), answers: chat.status === 'bot' ? [{ field: 'toko', value: 'Jual hijab dan gamis' }] : [], flowWaiting: chat.status === 'bot' && chat.botReplies <= 1 ? { flow: 'Quiet lead: one nudge after an hour', kind: 'wait', field: null, until: new Date(Date.now() + 40 * 60000).toISOString() } : null,
    };
    return json(t);
  }
  const leaf = parts[2];
  if (leaf === 'send' && method === 'POST') {
    if (chat.status === 'bot' || !chat.assignedTo) return json({ error: 'This chat is locked: the bot has it, or nobody owns it yet. Click "I take over" to answer it yourself.' }, 409);
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
  if (leaf === 'labels' && method === 'POST') { chat.labelIds = (Array.isArray(b?.labelIds) ? b.labelIds : []).filter((x: string) => LABELS.some((l) => l.id === x)); return json({ ok: true, labels: labelsOf(chat) }); }
  if (leaf === 'lead' && method === 'POST') {
    chat.deals = [...(chat.deals || []), { id: `d${Date.now()}`, title: String(b?.title || 'Lead from WhatsApp'), stage: 'Lead', value: Number(String(b?.value || '').replace(/\D/g, '')) || 0, sales: 'Demo', salesId: 'u-demo' }];
    if (!chat.client) chat.client = { id: `k${Date.now()}`, name: String(b?.name || chat.name), sales: 'Demo', serviceEnd: null };
    return json({ ok: true, dealId: 'x', clientId: chat.client.id, newClient: true });
  }
  if (leaf === 'reminders' && method === 'POST') {
    const due = String(b?.dueAt || '');
    if (!Number.isFinite(Date.parse(due)) || Date.parse(due) < Date.now() - 60000) return json({ error: 'The reminder time has already passed.' }, 400);
    chat.rems = [...(chat.rems || []), { id: `rm${Date.now()}`, dueAt: new Date(due).toISOString(), note: String(b?.note || '') || null, assignedName: 'Demo', createdBy: 'Demo', doneAt: null, doneBy: null, state: remState(due) }];
    return json({ ok: true, id: 'x' });
  }
  if (leaf === 'image-upload' && method === 'POST') return json({ ok: true, path: `chat/demo/${chat.id}/out-${Date.now()}.jpg`, token: 'demo', bucket: 'wa-files' });
  if (leaf === 'send-image' && method === 'POST') {
    chat.messages.push({ id: `m${Date.now()}`, sender: 'team', senderName: 'Demo', text: String(b?.caption || ''), mediaType: 'image', at: new Date().toISOString(), mediaUrl: '/logo.png' } as ThreadMessage);
    chat.status = 'human';
    return json({ ok: true });
  }
  if (leaf === 'source' && method === 'POST') {
    const sid = b?.sourceId ?? null;
    const sdef = sid ? SOURCES.find((x) => x.id === sid) : null;
    if (sid && !sdef) return json({ error: 'That source does not exist.' }, 400);
    chat.src = { sourceId: sid, label: sdef?.name ?? null, channel: sdef?.channel ?? 'unknown', by: sid ? 'Demo' : null, first: chat.src?.first ?? chat.messages.find((m) => m.sender === 'lead')?.text ?? '' };
    return json({ ok: true, source: { id: sid, label: sdef?.name ?? null, channel: sdef?.channel ?? 'unknown' } });
  }
  if (leaf === 'ignore' && method === 'POST') { (chat as any).ignored = b?.ignored !== false; if ((chat as any).ignored) { chat.resolved = true; chat.status = 'off' as any; } else { chat.resolved = false; chat.status = 'bot'; } return json({ ok: true }); }
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

// ---------------------------------------------------------------- AI Kamus (demo)
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
const settings: BotSettings = { enabled: true, persona_name: 'Fefe', company_name: 'Prof Toko Online', hours_from: '08:00', hours_to: '21:00', max_replies: 4, knowledge: 'TENTANG KAMI\nProf Toko Online membantu toko online supaya penjualannya naik.\nISI: alamat kantor dan jam kerja tim.', social_script: 'TENTANG KAMI\nProf Toko Online membantu penjual online di Indonesia supaya penjualannya naik.\n\nCARA MENJAWAB\n- Jawab pertanyaannya dulu dengan 1 sampai 3 tips praktis.\n- Lalu tanya satu hal tentang tokonya.', stage_auto: true, stage_owners: [{ id: 'u-rani', name: 'Rani' }], stage_words: { warm: 'harga, berapa, paket, deck, tertarik', negotiation: 'mau daftar, minta invoice, bisa nego', lost: 'tidak jadi, belum minat, nanti dulu' } };

const demoLog: BibleLogEntry[] = [
  { id: 'l1', doc_id: 'b0', doc_title: 'Sales Deck September 2026', action: 'uploaded', by_name: 'Nico', detail: 'Sales-Deck-Sep.pdf (3030 KB), version 1', created_at: dayAgo(75) },
  { id: 'l2', doc_id: 'b1', doc_title: 'Sales Deck Oktober 2026', action: 'new_version', by_name: 'Nico', detail: 'Sales-Deck-Okt.pdf (3320 KB), version 2. The previous version was switched off.', created_at: dayAgo(41) },
  { id: 'l3', doc_id: 'b2', doc_title: 'Daftar harga Meta Ads', action: 'uploaded', by_name: 'Vani', detail: 'meta.pdf (781 KB), version 1', created_at: dayAgo(6) },
  { id: 'l4', doc_id: 'b2', doc_title: 'Daftar harga Meta Ads', action: 'edited', by_name: 'Vani', detail: 'The text was changed by hand (96 to 120 characters).', created_at: dayAgo(2) },
];
const addLog = (doc: { id: string | null; title: string }, action: string, detail?: string) => demoLog.push({ id: `l${Date.now()}${demoLog.length}`, doc_id: doc.id, doc_title: doc.title, action, by_name: 'Demo', detail: detail ?? null, created_at: new Date().toISOString() });

function bibleDemo(parts: string[], method: 'GET' | 'POST' | 'PATCH' | 'DELETE', b: any): NextResponse {
  const slim = (d: BibleDocFull) => { const { text, ...rest } = d; void text; return rest; };
  if (parts.length === 1) return json({ docs: [...docs].sort((x, y) => y.created_at.localeCompare(x.created_at)).map(slim), log: [...demoLog].sort((x, y) => y.created_at.localeCompare(x.created_at)), settings, canEdit: true });
  if (parts[1] === 'upload-url') return json({ ok: true, path: `demo/${Date.now()}-${String(b?.fileName ?? 'deck.pdf')}`, token: 'demo', bucket: 'ai-bible' });
  if (parts[1] === 'ingest') {
    const old = b?.replaces ? docs.find((d) => d.id === b.replaces) : undefined;
    if (old) old.active = false;
    const doc: BibleDocFull = { id: `b${Date.now()}`, title: String(b?.title || 'Sales Deck'), kind: 'sales_deck', file_name: 'deck.pdf', file_size: 2_000_000, status: 'ready', error: null, active: true, version: old ? old.version + 1 : 1, replaces: old?.id ?? null, uploaded_by: 'Demo', created_at: new Date().toISOString(), text_updated_at: new Date().toISOString(), text_updated_by: 'Demo', chars: DECK_TEXT.length, text: DECK_TEXT };
    docs.push(doc);
    addLog({ id: doc.id, title: doc.title }, old ? 'new_version' : 'uploaded', `deck.pdf (1953 KB), version ${doc.version}${old ? '. The previous version was switched off.' : ''}`);
    return json({ ok: true, doc });
  }
  if (parts[1] === 'ask') {
    const q = String(b?.question ?? '').toLowerCase().trim();
    if (!q) return json({ error: 'Type a question first.' }, 400);
    const live = docs.filter((d) => d.active).map((d) => d.text).join('\n').split('\n');
    const words = q.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !['berapa', 'harga', 'paket', 'apa', 'yang', 'untuk'].includes(w));
    const hits = live.filter((l) => words.some((w) => l.toLowerCase().includes(w)));
    return json({ ok: true, answer: hits.length ? hits.slice(0, 3).join('\n') : 'Itu belum ada di AI Kamus.', model: 'demo' });
  }
  if (parts[1] === 'settings' && method === 'POST') { addLog({ id: null, title: 'Bot script and settings' }, 'settings', typeof b?.enabled === 'boolean' ? `The bot was switched ${b.enabled ? 'ON' : 'OFF'}.` : 'The script was saved.'); Object.assign(settings, Object.fromEntries(Object.entries(b || {}).filter(([, v]) => v !== undefined))); return json({ ok: true }); }
  const doc = docs.find((d) => d.id === parts[1]);
  if (!doc) return json({ error: 'Document not found.' }, 404);
  if (method === 'GET') return json(doc);
  if (method === 'DELETE') { docs.splice(docs.indexOf(doc), 1); addLog({ id: null, title: doc.title }, 'deleted', 'The document and its file were deleted.'); return json({ ok: true }); }
  if (typeof b?.title === 'string' && b.title.trim()) doc.title = b.title.trim();
  if (typeof b?.text === 'string' && b.text !== doc.text) addLog({ id: doc.id, title: doc.title }, 'edited', `The text was changed by hand (${doc.text.length} to ${b.text.length} characters).`);
  if (typeof b?.active === 'boolean' && b.active !== doc.active) addLog({ id: doc.id, title: doc.title }, b.active ? 'switched_on' : 'switched_off');
  if (typeof b?.text === 'string') { doc.text = b.text; doc.chars = b.text.length; doc.text_updated_at = new Date().toISOString(); doc.text_updated_by = 'Demo'; }
  if (typeof b?.active === 'boolean') doc.active = b.active;
  return json({ ok: true });
}

// ---------------------------------------------------------------- lead sources (demo)
function sourcesDemo(parts: string[], method: 'GET' | 'POST' | 'PATCH' | 'DELETE', b: any, url: URL): NextResponse {
  if (parts.length === 1 && method === 'GET') return json({ sources: SOURCES, canEdit: true });
  if (parts.length === 1 && method === 'POST') {
    const name = String(b?.name ?? '').trim(); const msg = String(b?.first_message ?? '').trim();
    if (!name) return json({ error: 'Give the source a name, like "Meta Ads: Promo Paket Sultan".' }, 400);
    if (msg.replace(/[^a-z0-9]/gi, '').length < 12) return json({ error: 'Paste the whole first message the ad pre-fills in WhatsApp (at least a short sentence).' }, 400);
    const existing = b?.id ? SOURCES.find((x) => x.id === b.id) : undefined;
    const channel = (['meta_ads', 'google_ads', 'tiktok_ads', 'organic', 'referral', 'other'].includes(b?.channel) ? b.channel : 'other') as Channel;
    if (existing) Object.assign(existing, { name, channel, first_message: msg, active: b?.active !== false });
    else SOURCES.unshift({ id: `s${Date.now()}`, name, channel, first_message: msg, active: b?.active !== false, created_at: new Date().toISOString(), created_by: 'Demo' });
    return json({ ok: true });
  }
  if (parts[1] === 'rescan' && method === 'POST') return json({ ok: true, checked: chats.length, matched: 1 });
  if (parts[1] === 'report') {
    const days = Number(url.searchParams.get('days') || 30);
    const rows: SourceReport['rows'] = [
      { key: 's1', label: 'Meta Ads: Promo Paket Sultan', channel: 'meta_ads', leads: 42, clients: 11, deals: 9, won: 4, wonValue: 16000000 },
      { key: 's2', label: 'Google Ads: Kelola Toko Shopee', channel: 'google_ads', leads: 18, clients: 6, deals: 5, won: 2, wonValue: 6000000 },
      { key: 'none:unknown', label: 'No source found', channel: 'unknown', leads: 9, clients: 1, deals: 1, won: 0, wonValue: 0 },
    ];
    const total = rows.reduce((t, r) => ({ leads: t.leads + r.leads, clients: t.clients + r.clients, deals: t.deals + r.deals, won: t.won + r.won, wonValue: t.wonValue + r.wonValue }), { leads: 0, clients: 0, deals: 0, won: 0, wonValue: 0 });
    const rep: SourceReport = {
      days, rows, total, sources: SOURCES.length,
      channels: [{ channel: 'meta_ads', leads: 42, clients: 11, deals: 9, won: 4, wonValue: 16000000 }, { channel: 'google_ads', leads: 18, clients: 6, deals: 5, won: 2, wonValue: 6000000 }, { channel: 'unknown', leads: 9, clients: 1, deals: 1, won: 0, wonValue: 0 }],
      unmatched: chats.filter((c) => c.src && !c.src.sourceId).map((c) => ({ group_id: c.id, name: c.name, first_message: c.src!.first, at: c.messages[0].at })),
    };
    return json(rep);
  }
  const i = SOURCES.findIndex((x) => x.id === parts[1]);
  if (i < 0) return json({ error: 'Source not found.' }, 404);
  if (method === 'DELETE') { SOURCES.splice(i, 1); return json({ ok: true }); }
  return json({ error: 'Not found.' }, 404);
}

// ---------------------------------------------------------------- scenario flows (demo)
const demoFlows: FlowFull[] = exampleFlows().filter((_, i) => i === 0 || i === 3 || i === 4).map((f, i) => ({ id: `f${i + 1}`, name: f.name, description: f.description, active: i === 0, graph: f.graph, updated_at: new Date(Date.now() - (i + 1) * 86400000).toISOString(), updated_by: 'Nico' }));
const demoRuns: FlowRun[] = [
  { id: 'r1', flow_id: 'f1', flow_name: demoFlows[0].name, chat: 'Budi Santoso', trigger_text: 'Halo kak, saya mau tanya Paket Sultan dari iklan Instagram', actions: ['send'], handled: true, outcome: 'ok', detail: 'sent a message', created_at: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: 'r3', flow_id: 'f2', flow_name: demoFlows[1].name, chat: 'Sari Dewi', trigger_text: 'Jual hijab dan gamis kak', actions: ['answer', 'send'], handled: true, outcome: 'ok', detail: 'saved the answer as toko; sent a message', created_at: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: 'r2', flow_id: 'f1', flow_name: demoFlows[0].name, chat: 'Hendra Wijaya', trigger_text: 'Selamat pagi, saya lihat iklan kakak di Instagram', actions: ['ai'], handled: true, outcome: 'ok', detail: 'AI: replied', created_at: new Date(Date.now() - 26 * 3600000).toISOString() },
];

function flowsDemo(parts: string[], method: 'GET' | 'POST' | 'PATCH' | 'DELETE', b: any): NextResponse {
  const item = (f: FlowFull): FlowListItem => ({ id: f.id, name: f.name, description: f.description, active: f.active, boxes: f.graph.nodes.length, trigger: f.graph.nodes.find((n) => isTrigger(n.type))?.type ?? null, runs7d: demoRuns.filter((r) => r.flow_id === f.id).length, problems: validateGraph(f.graph).errors.length, created_by: 'Nico', created_at: f.updated_at, updated_at: f.updated_at, updated_by: f.updated_by });
  if (parts.length === 1 && method === 'GET') return json({ flows: demoFlows.map(item), canEdit: true });
  if (parts.length === 1 && method === 'POST') {
    const name = String(b?.name ?? '').trim();
    if (!name) return json({ error: 'Give the flow a name.' }, 400);
    const graph = (b?.graph && Array.isArray(b.graph.nodes) ? b.graph : { nodes: [], edges: [] }) as Graph;
    const v = validateGraph(graph);
    if (v.errors.length && b?.active === true) return json({ error: `Fix this before switching the flow on: ${v.errors[0]}` }, 400);
    const existing = b?.id ? demoFlows.find((f) => f.id === b.id) : undefined;
    const warnings = [...v.errors.map((e) => `Not ready: ${e}`), ...v.warnings];
    if (existing) { Object.assign(existing, { name, description: b?.description ?? null, active: b?.active === true, graph, updated_at: new Date().toISOString(), updated_by: 'Demo' }); return json({ ok: true, id: existing.id, warnings }); }
    const f: FlowFull = { id: `f${Date.now()}`, name, description: b?.description ?? null, active: b?.active === true, graph, updated_at: new Date().toISOString(), updated_by: 'Demo' };
    demoFlows.push(f);
    return json({ ok: true, id: f.id, warnings });
  }
  if (parts[1] === 'examples' && method === 'POST') {
    let created = 0;
    for (const ex of exampleFlows()) if (!demoFlows.some((f) => f.name === ex.name)) { demoFlows.push({ id: `f${Date.now()}${created}`, name: ex.name, description: ex.description, active: false, graph: ex.graph, updated_at: new Date().toISOString(), updated_by: 'Demo' }); created++; }
    return json({ ok: true, created });
  }
  if (parts[1] === 'order' && method === 'POST') {
    const ids: string[] = Array.isArray(b?.ids) ? b.ids.map(String) : [];
    demoFlows.sort((x, y) => (ids.indexOf(x.id) + 1 || 999) - (ids.indexOf(y.id) + 1 || 999));
    return json({ ok: true });
  }
  if (parts[1] === 'runs') return json({ runs: [...demoRuns].sort((x, y) => y.created_at.localeCompare(x.created_at)) });
  const f = demoFlows.find((x) => x.id === parts[1]);
  if (!f) return json({ error: 'Flow not found.' }, 404);
  if (parts[2] === 'active' && method === 'POST') {
    if (b?.active === true && validateGraph(f.graph).errors.length) return json({ error: `Fix this before switching the flow on: ${validateGraph(f.graph).errors[0]}` }, 400);
    f.active = b?.active === true; return json({ ok: true });
  }
  if (method === 'DELETE') { demoFlows.splice(demoFlows.indexOf(f), 1); return json({ ok: true }); }
  return json(f);
}

// ---------------------------------------------------------------- numbers page (demo)
function demoStats(days: number) {
  const now = Date.now();
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(now - (days - 1 - i) * 86400000);
    const wave = Math.round(4 + 3 * Math.sin(i / 2.2) + (i % 7 === 5 ? 3 : 0));
    return { day: d.toISOString().slice(0, 10), newChats: Math.max(0, wave), leadMessages: Math.max(0, wave * 4 + (i % 3)), replies: Math.max(0, wave * 3 + (i % 4)) };
  });
  const sum = (k: 'newChats' | 'leadMessages' | 'replies') => daily.reduce((n, d) => n + d[k], 0);
  const scale = days / 30;
  return {
    from: new Date(now - days * 86400000).toISOString(), to: new Date(now).toISOString(), days,
    overview: { newChats: sum('newChats'), leadMessages: sum('leadMessages'), replies: sum('replies'), medianReply: 3.2, medianBot: 0.4, medianPeople: 11.5, within5: 0.68, leads: Math.round(18 * scale), won: Math.round(6 * scale), wonValue: Math.round(22000000 * scale) },
    daily,
    booking: { booked: Math.round(21 * scale), byBot: Math.round(15 * scale), byTeam: Math.round(6 * scale), byNudge: Math.round(4 * scale), held: Math.round(14 * scale), noShow: Math.round(4 * scale), showRate: 0.78, cancelled: Math.round(2 * scale), upcoming: 5, confirmedUpcoming: 3, chatToBooked: 0.22 },
    bot: { chatsAnswered: Math.round(96 * scale), replies: Math.round(210 * scale), handedOver: Math.round(41 * scale), stillWithBot: 12, reasons: [{ reason: 'A salesperson took over', count: Math.round(19 * scale) }, { reason: 'Price negotiation', count: Math.round(9 * scale) }, { reason: 'Bot message limit', count: Math.round(7 * scale) }, { reason: 'Asked for a person', count: Math.round(4 * scale) }, { reason: 'Payment', count: Math.round(2 * scale) }] },
    people: [
      { name: 'Rani', chats: 34, replies: 128, medianMinutes: 4.5, leads: 9, won: 3, wonValue: 12000000, meetingsHeld: 9 },
      { name: 'Lucy', chats: 22, replies: 76, medianMinutes: 12, leads: 6, won: 2, wonValue: 7000000, meetingsHeld: 4 },
      { name: 'Vani', chats: 5, replies: 14, medianMinutes: 26, leads: 1, won: 1, wonValue: 3000000, meetingsHeld: 1 },
    ],
    funnel: [{ channel: 'meta_ads', chats: 58, booked: 14, attended: 9, leads: 12, won: 4, wonValue: 16000000 }, { channel: 'google_ads', chats: 24, booked: 6, attended: 4, leads: 5, won: 2, wonValue: 6000000 }, { channel: 'unknown', chats: 11, booked: 1, attended: 1, leads: 1, won: 0, wonValue: 0 }],
    now: { waiting: 3, longestWaitMinutes: 19, overdueFollowups: 1 },
  };
}

// ---------------------------------------------------------------- free consultations (demo)
const meetSettings: MeetSettings = { enabled: true, days: [1, 2, 3, 4, 5], from: '10:00', to: '17:00', minutes: 30, noticeHours: 3, daysAhead: 7, ownerId: 'u-rani', ownerName: 'Rani' };
// kept on globalThis: in development each API route gets its own copy of this file
const demoTeam = [{ id: 'u-rani', name: 'Rani', role: 'sales', inTeam: true }, { id: 'u-lucy', name: 'Lucy', role: 'superadmin', inTeam: false }, { id: 'u-herlan', name: 'Herlan', role: 'superadmin', inTeam: true }, { id: 'u-velly', name: 'Velly', role: 'advertiser', inTeam: true }];
const boardStage: Record<string, string> = ((globalThis as any).__demoBoardStage ??= {});
const boardEdit: Record<string, Record<string, string>> = ((globalThis as any).__demoBoardEdit ??= {});
const boardGone: Record<string, boolean> = ((globalThis as any).__demoBoardGone ??= {});
const atWib = (daysFromNow: number, hhmm: string) => { const d = new Date(Date.now() + daysFromNow * 86400000 + 7 * 3600000); return new Date(`${d.toISOString().slice(0, 10)}T${hhmm}:00+07:00`).toISOString(); };
const demoMeetings: Meeting[] = [
  { id: 'm1', group_id: 'c1', lead_name: 'Budi', store: 'Kawat Nyamuk Jaya', starts_at: atWib(1, '10:00'), ends_at: atWib(1, '10:30'), status: 'booked', meet_url: 'https://meet.google.com/abc-defg-hij', booked_by: 'bot', note: null, created_at: new Date().toISOString(), chat: 'Budi Santoso', owner_name: 'Rani', confirm_sent_at: new Date().toISOString(), confirmed_at: new Date().toISOString() },
  { id: 'm2', group_id: 'c7', lead_name: 'Rina', store: 'Rina Hijab Store', starts_at: atWib(2, '14:00'), ends_at: atWib(2, '14:30'), status: 'booked', meet_url: 'https://meet.google.com/xyz-uvwx-rst', booked_by: 'bot', note: null, created_at: new Date().toISOString(), chat: 'Rina Hijab Store', owner_name: 'Rani', confirm_sent_at: new Date().toISOString() },
  { id: 'm3', group_id: 'c5', lead_name: 'Hendra', store: 'HW Spareparts', starts_at: atWib(-1, '11:00'), ends_at: atWib(-1, '11:30'), status: 'booked', meet_url: null, booked_by: 'Rani', note: 'Google Calendar is not connected: send the lead a meeting link yourself.', created_at: new Date().toISOString(), chat: 'Hendra Wijaya' },
];
function meetingOf(groupId: string) {
  const m = demoMeetings.find((x) => x.group_id === groupId && x.status === 'booked' && new Date(x.ends_at) > new Date());
  return m ? { id: m.id, startsAt: m.starts_at, endsAt: m.ends_at, meetUrl: m.meet_url, bookedBy: m.booked_by } : null;
}
function demoSlots() {
  const out: Array<{ code: string; label: string }> = [];
  for (let d = 1; d <= 24; d++) {
    const wd = new Date(Date.now() + d * 86400000 + 7 * 3600000).getUTCDay();
    if (wd === 0 || wd === 6) continue;
    for (const h of ['09:00', '10:00', '11:00', '13:00', '14:00', '15:30']) {
      const code = atWib(d, h);
      if (demoMeetings.some((m) => m.status === 'booked' && m.starts_at === code)) continue;
      out.push({ code, label: `${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(code))}, jam ${h.replace(':', '.')} WIB` });
    }
  }
  return out;
}
const demoAfter = { thanks: true, noShow: true };
const demoNudges = { enabled: true, hours: [24, 72], chats30d: 23, booked30d: 5 };
function meetingsDemo(parts: string[], method: 'GET' | 'POST' | 'PATCH' | 'DELETE', b: any): NextResponse {
  if (parts.length === 1) return json({ meetings: [...demoMeetings].sort((x, y) => x.starts_at.localeCompare(y.starts_at)), settings: meetSettings, google: { configured: true, connected: true, email: 'tim.proftoko@gmail.com' }, canEdit: true, nudges: demoNudges, after: demoAfter });
  if (parts[1] === 'settings') { Object.assign(meetSettings, Object.fromEntries(Object.entries(b || {}).filter(([, v]) => v !== undefined))); return json({ ok: true }); }
  if (parts[1] === 'slots') return json({ slots: demoSlots() });
  if (parts[1] === 'after') { if (typeof b?.thanks === 'boolean') demoAfter.thanks = b.thanks; if (typeof b?.noShow === 'boolean') demoAfter.noShow = b.noShow; return json({ ok: true }); }
  if (parts[1] === 'nudges') { if (typeof b?.enabled === 'boolean') demoNudges.enabled = b.enabled; if (Array.isArray(b?.hours)) demoNudges.hours = b.hours.map(Number); return json({ ok: true }); }
  if (parts[1] === 'google') return method === 'DELETE' ? json({ ok: true }) : json({ ok: true, url: '/jadwal?google=connected' });
  const m = demoMeetings.find((x) => x.id === parts[1]);
  if (!m) return json({ error: 'Meeting not found.' }, 404);
  const was = m.status;
  m.status = b?.status;
  const after = was === 'booked' && m.status === 'done' ? { message: demoAfter.thanks ? 'sent' : 'off', stage: 'Meeting Done', detail: `${demoAfter.thanks ? 'The lead got a thank-you. ' : ''}The ERP lead is in Meeting Done.` }
    : was === 'booked' && m.status === 'no_show' ? { message: demoAfter.noShow ? 'sent' : 'off', detail: demoAfter.noShow ? 'The lead got 3 new times to book again.' : 'Marked as did not come.' } : null;
  return json({ ok: true, after });
}

// ---------------------------------------------------------------- broadcasts (demo)
const bcSettings: BcSettings = { dailyMax: 40, from: '09:00', to: '19:00', gapMin: 90, gapMax: 240 };
const demoBroadcasts: BroadcastItem[] = [
  { id: 'b1', name: 'Undangan konsultasi gratis', message: 'Hi kak {nama}, ...', status: 'running', total: 128, sent: 52, failed: 1, skipped: 2, left: 73, next_send_at: new Date(Date.now() + 140000).toISOString(), paused_reason: null, created_by: 'Nico', created_at: new Date(Date.now() - 2 * 86400000).toISOString(), finished_at: null },
  { id: 'b0', name: 'Info paket Oktober', message: 'Halo kak {nama}, ...', status: 'done', total: 96, sent: 94, failed: 0, skipped: 2, left: 0, next_send_at: new Date().toISOString(), paused_reason: null, created_by: 'Nico', created_at: new Date(Date.now() - 20 * 86400000).toISOString(), finished_at: new Date(Date.now() - 17 * 86400000).toISOString() },
];
function broadcastsDemo(parts: string[], method: 'GET' | 'POST' | 'PATCH' | 'DELETE', b: any): NextResponse {
  if (parts.length === 1 && method === 'GET') return json({ broadcasts: demoBroadcasts, settings: bcSettings, sentToday: 17, audience: { count: 131, optedOut: 4, days: 4 }, canEdit: true });
  if (parts.length === 1 && method === 'POST') {
    if (demoBroadcasts.some((x) => x.status === 'running' || x.status === 'paused')) return json({ error: 'Another broadcast is still running or paused. Finish or cancel it first, so the daily limit protects the number.' }, 409);
    demoBroadcasts.unshift({ id: `b${Date.now()}`, name: String(b?.name), message: String(b?.message), status: 'running', total: 131, sent: 0, failed: 0, skipped: 0, left: 131, next_send_at: new Date().toISOString(), paused_reason: null, created_by: 'Demo', created_at: new Date().toISOString(), finished_at: null });
    return json({ ok: true, total: 131, days: 4 });
  }
  if (parts[1] === 'settings') { Object.assign(bcSettings, Object.fromEntries(Object.entries(b || {}).filter(([, v]) => v !== undefined))); return json({ ok: true }); }
  const x = demoBroadcasts.find((y) => y.id === parts[1]);
  if (!x) return json({ error: 'Broadcast not found.' }, 404);
  if (b?.action === 'pause') { x.status = 'paused'; x.paused_reason = 'Paused by the team.'; }
  if (b?.action === 'resume') { x.status = 'running'; x.paused_reason = null; }
  if (b?.action === 'cancel') { x.status = 'cancelled'; x.skipped += x.left; x.left = 0; }
  return json({ ok: true });
}

const demoGroups: Array<{ id: string; name: string; active: boolean; lastAt: string | null; today: number; total: number }> = ((globalThis as any).__demoGroups ??= [
  { id: 'g1', name: 'Seller Shopee Indonesia', active: true, lastAt: new Date().toISOString(), today: 2, total: 14 },
  { id: 'g2', name: 'Komunitas TikTok Shop Seller', active: false, lastAt: new Date().toISOString(), today: 0, total: 0 },
]);
