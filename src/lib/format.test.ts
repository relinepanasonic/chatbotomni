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
