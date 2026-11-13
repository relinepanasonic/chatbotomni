import { describe, it, expect } from 'vitest';
import { chatChannel, replyMinutesLeft } from './channel';

describe('channel', () => {
  it('reads the app from the chat id', () => {
    expect(['6281234500011', 'ig:1784', 'fb:6011', null].map(chatChannel)).toEqual(['whatsapp', 'instagram', 'messenger', 'whatsapp']);
  });
  it('Instagram and Messenger: minutes left of the 24 hours after the customer\'s last message; WhatsApp has no limit', () => {
    const now = new Date('2026-11-13T12:00:00Z');
    expect(replyMinutesLeft('instagram', '2026-11-13T11:00:00Z', now)).toBe(23 * 60);
    expect(replyMinutesLeft('messenger', '2026-11-12T11:00:00Z', now)).toBe(0);
    expect(replyMinutesLeft('instagram', null, now)).toBe(0);
    expect(replyMinutesLeft('whatsapp', null, now)).toBeNull();
  });
});
