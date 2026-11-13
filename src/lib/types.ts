/** The shapes the ERP chat API returns (src/lib/chat/shape.ts in the ERP). */
export type ChatStatus = 'bot' | 'human' | 'off' | 'new';
export type ChatFilter = 'all' | 'mine' | 'unserved' | 'bot' | 'resolved';

export interface Lead { name?: string; store?: string; need?: string }
export interface Person { id: string; name: string }

export interface ConversationSummary {
  id: string; phone: string; name: string; initials: string;
  lastText: string; lastAt: string | null; lastFromMe: boolean;
  unserved: boolean; waitingSince: string | null;
  status: ChatStatus; lead: Lead | null; botReplies: number;
  assignedTo: Person | null; resolved: boolean;
}
export interface Counts { all: number; mine: number; unserved: number; bot: number; human: number; resolved: number }
export interface ListResponse { me?: { id: string; name: string; role: string }; conversations: ConversationSummary[]; counts: Counts }

export type Sender = 'lead' | 'bot' | 'team' | 'note';
export interface ThreadMessage { id: string; sender: Sender; senderName: string | null; text: string; mediaType: string | null; at: string }

export interface Thread {
  id: string; phone: string; name: string;
  messages: ThreadMessage[];
  bot: { status: ChatStatus; replies: number; reason: string | null; lead: Lead | null };
  botLog: Array<{ reply: string | null; handoff: boolean; ok: boolean; detail: string | null; created_at: string }>;
  assignedTo: Person | null; resolved: boolean;
  client: { id: string; name: string; sales: string | null; serviceEnd: string | null } | null;
  deals: Array<{ id: string; title: string; stage: string; value: number; sales: string | null }>;
}

export interface Agent { id: string; name: string; role: string }
export interface QuickReply { id: string; shortcut: string; title: string; body: string }

/** The AI Kamus (the Sales Deck and other documents the AI reads), as the ERP returns it. */
export interface BibleDoc {
  id: string; title: string; kind: string; file_name: string | null; file_size: number | null;
  status: 'processing' | 'ready' | 'failed'; error: string | null; active: boolean; version: number; replaces: string | null;
  uploaded_by: string | null; created_at: string; text_updated_at: string; text_updated_by: string | null; chars: number;
}
export interface BibleDocFull extends BibleDoc { text: string }
export interface BotSettings { enabled: boolean; persona_name: string; company_name: string; hours_from: string; hours_to: string; max_replies: number; knowledge: string }
export interface BibleLogEntry { id: string; doc_id: string | null; doc_title: string; action: string; by_name: string | null; detail: string | null; created_at: string }
export interface BibleResponse { docs: BibleDoc[]; log: BibleLogEntry[]; settings: BotSettings; canEdit: boolean }
export interface UploadTarget { ok: true; path: string; token: string; bucket: string }
