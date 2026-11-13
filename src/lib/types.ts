/** The shapes the ERP chat API returns (src/lib/chat/shape.ts in the ERP). */
export type ChatStatus = 'bot' | 'human' | 'off' | 'new';
export type ChatFilter = 'all' | 'unserved' | 'bot' | 'human';

export interface Lead { name?: string; store?: string; need?: string }

export interface ConversationSummary {
  id: string; phone: string; name: string; initials: string;
  lastText: string; lastAt: string | null; lastFromMe: boolean;
  unserved: boolean; status: ChatStatus; lead: Lead | null; botReplies: number;
}
export interface Counts { all: number; unserved: number; bot: number; human: number }
export interface ListResponse { me?: { name: string; role: string }; conversations: ConversationSummary[]; counts: Counts }

export type Sender = 'lead' | 'bot' | 'team';
export interface ThreadMessage { id: string; sender: Sender; senderName: string | null; text: string; mediaType: string | null; at: string }

export interface Thread {
  id: string; phone: string; name: string;
  messages: ThreadMessage[];
  bot: { status: ChatStatus; replies: number; reason: string | null; lead: Lead | null };
  botLog: Array<{ reply: string | null; handoff: boolean; ok: boolean; detail: string | null; created_at: string }>;
  client: { id: string; name: string; sales: string | null; serviceEnd: string | null } | null;
  deals: Array<{ id: string; title: string; stage: string; value: number; sales: string | null }>;
}
