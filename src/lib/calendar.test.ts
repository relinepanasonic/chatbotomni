import { describe, it, expect } from 'vitest';
import { clockOf, dayKeyOf, dayTitle, groupByPart, monthGrid, monthOf, partOf, shiftMonth, slotsByDay } from './calendar';

describe('month grid', () => {
  it('November 2026 starts on a Sunday: Monday-first rows with the previous month filling the first row', () => {
    const g = monthGrid(2026, 10);
    expect(g).toHaveLength(6);
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(g[0].map((c) => c.day)).toEqual([26, 27, 28, 29, 30, 31, 1]);
    expect(g[0].map((c) => c.inMonth)).toEqual([false, false, false, false, false, false, true]);
    expect(g[5].map((c) => c.day)).toEqual([30, 1, 2, 3, 4, 5, 6]);
    expect(g[5][6]).toMatchObject({ key: '2026-12-06', inMonth: false });
  });
  it('a month starting on a Monday has no padding before it', () => {
    expect(monthGrid(2026, 5)[0][0]).toMatchObject({ key: '2026-06-01', day: 1, inMonth: true });   // 1 June 2026 is a Monday
  });
});

describe('free times by day (Jakarta time)', () => {
  const codes = ['2026-11-16T03:00:00.000Z', '2026-11-16T07:00:00.000Z', '2026-11-16T17:30:00.000Z', '2026-11-17T03:00:00.000Z'];
  it('a time late in the UTC evening belongs to the next Jakarta day', () => {
    expect(dayKeyOf('2026-11-16T17:30:00.000Z')).toBe('2026-11-17');
    expect(clockOf('2026-11-16T17:30:00.000Z')).toBe('00:30');
  });
  it('groups and sorts the times of each day', () => {
    const m = slotsByDay([codes[3], codes[0], codes[1]]);
    expect([...m.keys()]).toEqual(['2026-11-16', '2026-11-17']);
    expect(m.get('2026-11-16')).toEqual([codes[0], codes[1]]);
  });
  it('splits a day into morning, afternoon and evening', () => {
    expect(['2026-11-16T03:00:00.000Z', '2026-11-16T06:00:00.000Z', '2026-11-16T10:30:00.000Z'].map(partOf)).toEqual(['Morning', 'Afternoon', 'Evening']);
    expect(groupByPart(['2026-11-16T03:00:00.000Z', '2026-11-16T04:00:00.000Z', '2026-11-16T07:00:00.000Z']).map((g) => [g.part, g.codes.length])).toEqual([['Morning', 2], ['Afternoon', 1]]);
  });
});

describe('titles and months', () => {
  it('writes a day the Indonesian way', () => {
    expect(dayTitle('2026-11-16')).toBe('Senin 16 November');
  });
  it('moves between months across years', () => {
    expect(monthOf('2026-12-30')).toEqual({ y: 2026, m: 11 });
    expect(shiftMonth({ y: 2026, m: 11 }, 1)).toEqual({ y: 2027, m: 0 });
    expect(shiftMonth({ y: 2026, m: 0 }, -1)).toEqual({ y: 2025, m: 11 });
  });
});
