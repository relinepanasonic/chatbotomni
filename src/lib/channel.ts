/**
 * Which app a chat lives in, read from its id (the same rule as the ERP's lib/chat/channel.ts): a phone number is WhatsApp, "ig:<id>" is
 * Instagram, "fb:<id>" is Facebook Messenger. Pure.
 */
export type ChatChannel = 'whatsapp' | 'instagram' | 'messenger';

export const chatChannel = (phone: string | null | undefined): ChatChannel => {
  const v = String(phone ?? '');
  return v.startsWith('ig:') ? 'instagram' : v.startsWith('fb:') ? 'messenger' : 'whatsapp';
};

export const CHANNEL_NAME: Record<ChatChannel, string> = { whatsapp: 'WhatsApp', instagram: 'Instagram', messenger: 'Messenger' };

/** Meta lets a business reply on Instagram and Messenger only within 24 hours of the customer's last message. */
export const REPLY_WINDOW_HOURS = 24;

/** Minutes left to reply (null = no limit, WhatsApp; 0 = closed). */
export function replyMinutesLeft(channel: ChatChannel, lastFromLeadAt: string | null | undefined, now = new Date()): number | null {
  if (channel === 'whatsapp') return null;
  if (!lastFromLeadAt) return 0;
  const left = REPLY_WINDOW_HOURS * 60 - (now.getTime() - new Date(lastFromLeadAt).getTime()) / 60000;
  return Math.max(0, Math.floor(left));
}
