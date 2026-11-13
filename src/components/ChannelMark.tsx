import React from 'react';
import { CHANNEL_NAME, type ChatChannel } from '@/lib/channel';

/** A small round mark of the app a chat lives in (WhatsApp green, Instagram pink, Messenger blue), always with its name for screen readers. */
const MARK: Record<ChatChannel, { bg: string; d: string }> = {
  whatsapp: { bg: '#1fa855', d: 'M4 20l1.3-3.9A7.5 7.5 0 1 1 8 18.8L4 20z' },
  instagram: { bg: '#d6297a', d: 'M8 4h8a4 4 0 014 4v8a4 4 0 01-4 4H8a4 4 0 01-4-4V8a4 4 0 014-4zm4 4.8a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4zM16.6 7.4h.01' },
  messenger: { bg: '#1877f2', d: 'M12 4c-4.4 0-8 3.2-8 7.3 0 2.3 1.1 4.3 2.9 5.6V20l2.7-1.5c.8.2 1.6.3 2.4.3 4.4 0 8-3.2 8-7.4S16.4 4 12 4zm-4 9.4l2.7-2.9 1.8 1.8 3.2-3' },
};

export function ChannelMark({ channel, size = 16, className = '' }: { channel: ChatChannel; size?: number; className?: string }) {
  const m = MARK[channel];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-white ${className}`} style={{ background: m.bg, width: size, height: size }} title={CHANNEL_NAME[channel]} role="img" aria-label={CHANNEL_NAME[channel]}>
      <svg viewBox="0 0 24 24" width={size * 0.68} height={size * 0.68} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={m.d} /></svg>
    </span>
  );
}
