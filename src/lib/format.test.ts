import { describe, it, expect } from 'vitest';
import { dayLabel, shortTime, timeLabel } from './format';

const NOW = new Date('2026-11-13T05:00:00Z');   // 12:00 in Jakarta

describe('format (Jakarta time)', () => {
  it('shows the clock in Jakarta, not UTC', () => {
    expect(timeLabel('2026-11-13T04:51:44Z')).toBe('11:51');
    expect(timeLabel('2026-11-13T17:30:00Z')).toBe('00:30');       // already the next day in Jakarta
  });
  it('labels a chat day as today, yesterday or the date', () => {
    expect(dayLabel('2026-11-13T01:00:00Z', NOW)).toBe('Hari ini');
    expect(dayLabel('2026-11-12T10:00:00Z', NOW)).toBe('Kemarin');
    expect(dayLabel('2026-11-10T10:00:00Z', NOW)).toMatch(/10/);
    expect(dayLabel('2026-11-10T10:00:00Z', NOW)).toMatch(/2026/);
  });
  it('the inbox shows the time for today, "Kemarin", or the short date', () => {
    expect(shortTime('2026-11-13T04:00:00Z', NOW)).toBe('11:00');
    expect(shortTime('2026-11-12T04:00:00Z', NOW)).toBe('Kemarin');
    expect(shortTime('2026-11-01T04:00:00Z', NOW)).toMatch(/01/);
    expect(shortTime(null, NOW)).toBe('');
  });
});

import { waitLabel, waitMinutes, waitTone } from './format';

describe('waiting time', () => {
  const NOW2 = new Date('2026-11-13T05:00:00Z');
  it('counts whole minutes since the lead started waiting (0 when none)', () => {
    expect(waitMinutes('2026-11-13T04:47:30Z', NOW2)).toBe(12);
    expect(waitMinutes('2026-11-13T05:00:00Z', NOW2)).toBe(0);
    expect(waitMinutes('2026-11-13T05:10:00Z', NOW2)).toBe(0);       // a clock a little ahead never gives a negative time
    expect(waitMinutes(null, NOW2)).toBe(0);
  });
  it('writes it the way the team reads it', () => {
    expect(waitLabel(0)).toBe('baru saja');
    expect(waitLabel(12)).toBe('12 mnt');
    expect(waitLabel(65)).toBe('1 j 5 mnt');
    expect(waitLabel(120)).toBe('2 j');
    expect(waitLabel(3000)).toBe('2 hari');
  });
  it('green under 5 minutes, amber under 15, red after', () => {
    expect([0, 4, 5, 14, 15, 90].map(waitTone)).toEqual(['ok', 'ok', 'warn', 'warn', 'bad', 'bad']);
  });
});
