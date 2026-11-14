/**
 * The same free-time rules as the ERP's lib/chat/meet-rules.ts, for the live preview on the Jadwal page: which times a lead could book with these
 * settings. Pure. Jakarta time (WIB, UTC+7). Busy times on Google Calendar are only known to the server, so the preview leaves them in.
 */
export interface MeetRules { days: number[]; from: string; to: string; minutes: number; noticeHours: number; daysAhead: number }

const WIB = 7 * 3600000;
export const toMinutes = (s: string) => { const [a, b] = String(s).split(/[:.]/).map(Number); return (a || 0) * 60 + (b || 0); };
export const fromMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** "11.00", "9:0", "9" -> "11:00", "09:00", "09:00"; anything else -> null. */
export function normalizeTime(raw: string): string | null {
  const m = /^\s*(\d{1,2})(?:[:.](\d{1,2}))?\s*$/.exec(String(raw ?? ''));
  if (!m) return null;
  const h = Number(m[1]); const mi = Number(m[2] ?? 0);
  return h <= 23 && mi <= 59 ? fromMinutes(h * 60 + mi) : null;
}

/** The choices in the hour dropdowns: every 30 minutes from 06:00 to 22:00, plus the current value if it is in between. */
export function timeChoices(current?: string): string[] {
  const out: string[] = [];
  for (let m = 6 * 60; m <= 22 * 60; m += 30) out.push(fromMinutes(m));
  if (current && !out.includes(current)) out.push(current);
  return out.sort();
}

export interface DayPlan { key: string; date: Date; weekday: number; open: boolean; slots: Date[] }

/** The next days, each with every start time a lead could book (after the notice, inside the hours), booked times left out. */
export function weekPlan(r: MeetRules, now: Date, booked: Array<{ start: Date; end: Date }>, showDays = 7): DayPlan[] {
  const local = new Date(now.getTime() + WIB);
  const day0 = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - WIB;
  const earliest = now.getTime() + r.noticeHours * 3600000;
  const step = Math.max(15, r.minutes);
  const out: DayPlan[] = [];
  for (let d = 0; d < showDays; d++) {
    const start = day0 + d * 86400000;
    const weekday = new Date(start + WIB).getUTCDay();
    const open = r.days.includes(weekday) && d < r.daysAhead;
    const slots: Date[] = [];
    if (open) {
      for (let m = toMinutes(r.from); m + r.minutes <= toMinutes(r.to); m += step) {
        const s = start + m * 60000; const e = s + r.minutes * 60000;
        if (s < earliest) continue;
        if (booked.some((b) => s < b.end.getTime() && e > b.start.getTime())) continue;
        slots.push(new Date(s));
      }
    }
    out.push({ key: new Date(start + WIB).toISOString().slice(0, 10), date: new Date(start), weekday, open, slots });
  }
  return out;
}

export const clockWib = (d: Date) => { const l = new Date(d.getTime() + WIB); return `${String(l.getUTCHours()).padStart(2, '0')}:${String(l.getUTCMinutes()).padStart(2, '0')}`; };
