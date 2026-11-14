import { describe, it, expect } from 'vitest';
import { clockWib, normalizeTime, timeChoices, weekPlan } from './meet';

describe('Jadwal preview rules', () => {
  it('reads times the way people type them', () => {
    expect(['11.00', '9:0', '9', '17:30', '24:00', 'jam 10'].map(normalizeTime)).toEqual(['11:00', '09:00', '09:00', '17:30', null, null]);
  });
  it('offers hours every 30 minutes, keeping an unusual saved value', () => {
    const c = timeChoices('10:15');
    expect(c[0]).toBe('06:00');
    expect(c).toContain('10:15');
    expect(c[c.length - 1]).toBe('22:00');
  });
  it('the week shows working days with their free times; days off and booked times are left out', () => {
    // Friday 13 Nov 2026, 09:00 WIB
    const now = new Date('2026-11-13T02:00:00Z');
    const booked = [{ start: new Date('2026-11-16T03:00:00Z'), end: new Date('2026-11-16T03:30:00Z') }];   // Mon 10:00
    const w = weekPlan({ days: [1, 2, 3, 4, 5], from: '10:00', to: '12:00', minutes: 30, noticeHours: 3, daysAhead: 7 }, now, booked);
    expect(w).toHaveLength(7);
    expect(w[0]).toMatchObject({ weekday: 5, open: true, slots: [] });          // today: the notice leaves nothing before 12:00
    expect(w[1]).toMatchObject({ weekday: 6, open: false });                    // Saturday off
    expect(w[3].slots.map(clockWib)).toEqual(['10:30', '11:00', '11:30']);       // Monday, 10:00 booked
  });
  it('days beyond "offer days ahead" are closed', () => {
    const w = weekPlan({ days: [0, 1, 2, 3, 4, 5, 6], from: '10:00', to: '11:00', minutes: 60, noticeHours: 0, daysAhead: 3 }, new Date('2026-11-13T00:00:00Z'), []);
    expect(w.map((d) => d.open)).toEqual([true, true, true, false, false, false, false]);
  });
});
