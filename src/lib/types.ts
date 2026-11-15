/** The shapes the ERP chat API returns (src/lib/chat/shape.ts in the ERP). */
export type ChatStatus = 'bot' | 'human' | 'off' | 'new';
export type ChatFilter = 'all' | 'mine' | 'unserved' | 'bot' | 'resolved' | 'followup';
export interface ChatLabel { id: string; name: string; color: string }
export interface NextReminder { id: string; dueAt: string; note: string | null; state: 'overdue' | 'today' | 'later' }
export interface ReminderItem { id: string; dueAt: string; note: string | null; assignedName: string | null; createdBy: string | null; doneAt: string | null; doneBy: string | null; state: 'overdue' | 'today' | 'later' }

export interface ChatSource { label: string | null; channel: string; by: string | null }
export interface Lead { name?: string; store?: string; need?: string }
export interface Person { id: string; name: string }

export interface ConversationSummary {
  id: string; phone: string; name: string; initials: string;
  lastText: string; lastAt: string | null; lastFromMe: boolean;
  unserved: boolean; waitingSince: string | null;
  status: ChatStatus; lead: Lead | null; botReplies: number;
  assignedTo: Person | null; resolved: boolean;
  source: ChatSource | null;
  labels?: ChatLabel[];
  nextReminder?: NextReminder | null;
  stage?: string | null;           // the ERP pipeline stage of the chat's deal (stored name), null without a deal
  payment?: Payment | null;       // where its invoice stands
}
export type Payment = 'unpaid' | 'partial' | 'paid' | 'overdue';
export interface Counts { all: number; mine: number; unserved: number; bot: number; human: number; resolved: number; followup?: number }
export interface ListResponse { me?: { id: string; name: string; role: string }; conversations: ConversationSummary[]; counts: Counts; labels?: ChatLabel[]; features?: { media: boolean } }

export type Sender = 'lead' | 'bot' | 'team' | 'note';
export interface ThreadMessage { id: string; sender: Sender; senderName: string | null; text: string; mediaType: string | null; at: string; mediaUrl?: string | null }

export interface Thread {
  id: string; phone: string; name: string;
  messages: ThreadMessage[];
  bot: { status: ChatStatus; replies: number; reason: string | null; lead: Lead | null };
  botLog: Array<{ reply: string | null; handoff: boolean; ok: boolean; detail: string | null; created_at: string }>;
  assignedTo: Person | null; resolved: boolean;
  source: ChatSource | null; sourceId: string | null; firstMessage: string | null;
  client: { id: string; name: string; sales: string | null; serviceEnd: string | null } | null;
  deals: Array<{ id: string; title: string; stage: string; value: number; sales: string | null; salesId?: string | null; payment?: Payment | null; invoice?: { number: string | null; total: number; paid: number; due: string | null } | null }>;
  labels: ChatLabel[];
  reminders: ReminderItem[];
  /** What the lead answered to "Ask a question" boxes of the flows. */
  answers?: Array<{ field: string; value: string }>;
  /** A flow stopped in this chat: waiting for the lead's answer, or for a Wait box's time. */
  flowWaiting?: { flow: string; kind: 'answer' | 'wait'; field: string | null; until: string | null } | null;
  /** The lead's upcoming free consultation, if one is booked. */
  meeting?: { id: string; startsAt: string; endsAt: string; meetUrl: string | null; bookedBy: string; confirmed?: boolean; confirmAsked?: boolean; wantsOtherTime?: boolean; owner?: string | null } | null;
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
export interface BotSettings { enabled: boolean; media_enabled?: boolean; persona_name: string; company_name: string; hours_from: string; hours_to: string; max_replies: number; knowledge: string; social_script?: string; deck_url?: string | null; stage_auto?: boolean; stage_words?: { warm: string; negotiation: string; lost: string } }
export interface BibleLogEntry { id: string; doc_id: string | null; doc_title: string; action: string; by_name: string | null; detail: string | null; created_at: string }
export interface BibleResponse { docs: BibleDoc[]; log: BibleLogEntry[]; settings: BotSettings; canEdit: boolean }
export interface UploadTarget { ok: true; path: string; token: string; bucket: string }

/** Lead sources: the ads and the first message each pre-fills, and the report. */
export type Channel = 'meta_ads' | 'google_ads' | 'tiktok_ads' | 'organic' | 'referral' | 'other';
export const CHANNELS: Array<{ key: Channel; label: string }> = [
  { key: 'meta_ads', label: 'Meta Ads' }, { key: 'google_ads', label: 'Google Ads' }, { key: 'tiktok_ads', label: 'TikTok Ads' },
  { key: 'organic', label: 'Organic' }, { key: 'referral', label: 'Referral' }, { key: 'other', label: 'Other' },
];
export const channelLabel = (c: string | null | undefined) => CHANNELS.find((x) => x.key === c)?.label ?? 'Unknown';
export interface LeadSource { id: string; name: string; channel: Channel; first_message: string; active: boolean; created_at: string; created_by: string | null }
export interface SourcesResponse { sources: LeadSource[]; canEdit: boolean }
export interface SourceRow { key: string; label: string; channel: Channel | 'unknown'; leads: number; clients: number; deals: number; won: number; wonValue: number }
export interface ChannelRow { channel: Channel | 'unknown'; leads: number; clients: number; deals: number; won: number; wonValue: number }
export interface UnmatchedChat { group_id: string; name: string; first_message: string; at: string }
export interface SourceReport { days: number; rows: SourceRow[]; channels: ChannelRow[]; total: Omit<SourceRow, 'key' | 'label' | 'channel'>; unmatched: UnmatchedChat[]; sources: number }

/** Scenario flows, as the ERP returns them. The drawing itself is typed in lib/flow.ts. */
export interface FlowListItem {
  id: string; name: string; description: string | null; active: boolean; boxes: number; trigger: string | null; runs7d: number; problems: number;
  created_by: string | null; created_at: string; updated_at: string; updated_by: string | null;
}
export interface FlowsResponse { flows: FlowListItem[]; canEdit: boolean }
export interface FlowFull { id: string; name: string; description: string | null; active: boolean; graph: import('./flow').Graph; updated_at: string; updated_by: string | null }
export interface FlowRun { id: string; flow_id: string | null; flow_name: string; chat: string; trigger_text: string | null; actions: string[] | null; handled: boolean; outcome: string; detail: string | null; created_at: string }

/** The numbers page (ERP src/lib/chat/stats.ts). Minutes are numbers; null when there is nothing to measure. */
export interface StatsPerson { name: string; chats: number; replies: number; medianMinutes: number | null; leads: number; won: number; wonValue: number; meetingsHeld?: number }
export interface StatsFunnel { channel: string; chats: number; booked?: number; attended?: number; leads: number; won: number; wonValue: number }
export interface StatsBooking { booked: number; byBot: number; byTeam: number; byNudge: number; held: number; noShow: number; showRate: number | null; cancelled: number; upcoming: number; confirmedUpcoming: number; chatToBooked: number | null }
export interface Stats {
  from: string; to: string; days: number;
  overview: { newChats: number; leadMessages: number; replies: number; medianReply: number | null; medianBot: number | null; medianPeople: number | null; within5: number | null; leads: number; won: number; wonValue: number };
  daily: Array<{ day: string; newChats: number; leadMessages: number; replies: number }>;
  booking?: StatsBooking;
  bot: { chatsAnswered: number; replies: number; handedOver: number; stillWithBot: number; reasons: Array<{ reason: string; count: number }> };
  people: StatsPerson[];
  funnel: StatsFunnel[];
  now: { waiting: number; longestWaitMinutes: number | null; overdueFollowups: number };
}

// ---------------------------------------------------------------- free consultations
export interface MeetSettings { enabled: boolean; days: number[]; from: string; to: string; minutes: number; noticeHours: number; daysAhead: number; ownerId?: string | null; ownerName?: string | null }
export interface Meeting {
  id: string; group_id: string | null; lead_name: string | null; store: string | null; starts_at: string; ends_at: string;
  status: 'booked' | 'done' | 'no_show' | 'cancelled'; meet_url: string | null; booked_by: string; note: string | null; created_at: string; chat?: string;
  confirm_sent_at?: string | null; confirmed_at?: string | null; reschedule_asked_at?: string | null; owner_name?: string | null;
}
export interface NudgeInfo { enabled: boolean; hours: number[]; chats30d: number; booked30d: number }
export interface MeetingsResponse { meetings: Meeting[]; settings: MeetSettings; google: { configured: boolean; connected: boolean; email: string | null }; canEdit: boolean; nudges?: NudgeInfo | null; after?: AfterInfo | null }
export interface AfterInfo { thanks: boolean; noShow: boolean }
export interface AfterResult { message: 'sent' | 'off' | 'failed' | 'none'; stage?: string | null; detail: string }
export interface FreeSlot { code: string; label: string }

// ---------------------------------------------------------------- broadcasts
export interface BcSettings { dailyMax: number; from: string; to: string; gapMin: number; gapMax: number }
export interface BroadcastItem {
  id: string; name: string; message: string; status: 'running' | 'paused' | 'done' | 'cancelled'; total: number; sent: number; failed: number; skipped: number; left: number;
  next_send_at: string; paused_reason: string | null; created_by: string | null; created_at: string; finished_at: string | null;
}
export interface BroadcastsResponse { broadcasts: BroadcastItem[]; settings: BcSettings; sentToday: number; audience: { count: number; optedOut: number; days: number }; canEdit: boolean }
