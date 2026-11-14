/**
 * The month calendar used to pick a free consultation time: the month grid (Monday first), the free times grouped by day, and the day parts.
 * Pure. Everything is Jakarta time (WIB, UTC+7); a free time is an ISO instant, a day is "YYYY-MM-DD".
 */
const WIB = 7 * 3600000;

export const dayKeyOf = (d: Date | string): string => new Date(new Date(d).getTime() + WIB).toISOString().slice(0, 10);
export const clockOf = (d: Date | string): string => new Date(new Date(d).getTime() + WIB).toISOString().slice(11, 16);

export const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const DAYS_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export interface Cell { key: string; day: number; inMonth: boolean }

/** The weeks of a month (month is 0 to 11), Monday first, padded with the days of the neighbouring months so every row has 7 cells. */
export function monthGrid(year: number, month: number): Cell[][] {
  const first = Date.UTC(year, month, 1);
  const offset = (new Date(first).getUTCDay() + 6) % 7;                       // Monday = 0
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const weeks: Cell[][] = [];
  const total = Math.ceil((offset + count) / 7) * 7;
  for (let i = 0; i < total; i++) {
    const t = new Date(first + (i - offset) * 86400000);
    weeks[Math.floor(i / 7)] = [...(weeks[Math.floor(i / 7)] || []), { key: t.toISOString().slice(0, 10), day: t.getUTCDate(), inMonth: t.getUTCMonth() === month }];
  }
  return weeks;
}

/** Free times grouped by their day, each day's times in order. */
export function slotsByDay(codes: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const c of [...codes].sort()) { const k = dayKeyOf(c); out.set(k, [...(out.get(k) || []), c]); }
  return out;
}

export type DayPart = 'Morning' | 'Afternoon' | 'Evening';
/** Morning until 12:00, afternoon until 17:00, evening after. */
export const partOf = (code: string): DayPart => { const h = Number(clockOf(code).slice(0, 2)); return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'; };

export function groupByPart(codes: string[]): Array<{ part: DayPart; codes: string[] }> {
  const out: Array<{ part: DayPart; codes: string[] }> = [];
  for (const c of codes) { const p = partOf(c); const last = out[out.length - 1]; if (last?.part === p) last.codes.push(c); else out.push({ part: p, codes: [c] }); }
  return out;
}

/** "Senin 16 November" for a day key. */
export const dayTitle = (key: string): string => { const d = new Date(`${key}T12:00:00Z`); return `${DAYS_LONG[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };

/** The month (year, 0-11) a day key is in, and moving by whole months. */
export const monthOf = (key: string) => ({ y: Number(key.slice(0, 4)), m: Number(key.slice(5, 7)) - 1 });
export const shiftMonth = (cur: { y: number; m: number }, by: number) => { const t = cur.y * 12 + cur.m + by; return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 }; };
