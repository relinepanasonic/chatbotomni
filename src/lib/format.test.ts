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

import { ageLabel, isStale, sizeLabel } from './format';

describe('document age', () => {
  const N = new Date('2026-11-13T05:00:00Z');
  it('says how long ago the text changed', () => {
    expect(ageLabel('2026-11-13T01:00:00Z', N)).toBe('hari ini');
    expect(ageLabel('2026-11-12T01:00:00Z', N)).toBe('kemarin');
    expect(ageLabel('2026-11-08T01:00:00Z', N)).toBe('5 hari lalu');
    expect(ageLabel('2026-08-01T01:00:00Z', N)).toBe('3 bulan lalu');
  });
  it('warns from 30 days', () => {
    expect(isStale('2026-10-20T05:00:00Z', N)).toBe(false);
    expect(isStale('2026-10-14T05:00:00Z', N)).toBe(true);
  });
  it('writes file sizes', () => {
    expect(sizeLabel(3_400_000)).toBe('3,2 MB');
    expect(sizeLabel(820_000)).toBe('801 KB');
    expect(sizeLabel(null)).toBe('');
  });
});

import { dateTimeLabel } from './format';

describe('dateTimeLabel', () => {
  it('writes the exact moment in Jakarta time', () => {
    expect(dateTimeLabel('2026-11-13T07:05:00Z')).toMatch(/^13 .* 2026, 14:05$/);
  });
});

import { durLabel, rpShort } from './format';

describe('durLabel and rpShort', () => {
  it('durations the way the team reads them', () => {
    expect([null, 0.4, 12.4, 65, 120, 3000].map(durLabel)).toEqual(['-', '< 1 mnt', '12 mnt', '1 j 5 mnt', '2 j', '2 hari']);
  });
  it('short money', () => {
    expect([0, 850_000, 4_500_000, 16_000_000, 2_300_000_000].map(rpShort)).toEqual(['Rp 0', 'Rp 850 rb', 'Rp 4,5 jt', 'Rp 16 jt', 'Rp 2,3 M']);
  });
});
