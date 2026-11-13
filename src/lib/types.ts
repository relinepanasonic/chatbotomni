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
