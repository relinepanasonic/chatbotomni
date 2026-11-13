/** Times in Jakarta, the way the team reads them. Pure. */
const TZ = 'Asia/Jakarta';

export const timeLabel = (iso: string) => new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)).replace('.', ':');

const ymd = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

/** "Hari ini", "Kemarin" or "Jum, 13 Nov 2026". */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (ymd(d) === ymd(now)) return 'Hari ini';
  if (ymd(d) === ymd(new Date(now.getTime() - 86400000))) return 'Kemarin';
  return new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

/** For the inbox list: the time today, "Kemarin", or the date. */
export function shortTime(iso: string | null, now = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (ymd(d) === ymd(now)) return timeLabel(iso);
  if (ymd(d) === ymd(new Date(now.getTime() - 86400000))) return 'Kemarin';
  return new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: '2-digit', month: 'short' }).format(d);
}

/** How long a lead has waited for an answer, in whole minutes. */
export const waitMinutes = (since: string | null, now = new Date()): number => (since ? Math.max(0, Math.floor((now.getTime() - new Date(since).getTime()) / 60000)) : 0);

/** "baru saja", "12 mnt", "1 j 5 mnt", "2 hari". */
export function waitLabel(min: number): string {
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} mnt`;
  if (min < 1440) { const h = Math.floor(min / 60); const m = min % 60; return m ? `${h} j ${m} mnt` : `${h} j`; }
  return `${Math.floor(min / 1440)} hari`;
}

export type WaitTone = 'ok' | 'warn' | 'bad';
/** Green until 5 minutes, amber until 15, then red: the team's reply-time target. */
export const waitTone = (min: number): WaitTone => (min >= 15 ? 'bad' : min >= 5 ? 'warn' : 'ok');

/** Whole days since `iso` (0 for a future time). */
export const daysSince = (iso: string, now = new Date()): number => Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000));

/** "hari ini", "kemarin", "5 hari lalu", "2 bulan lalu": how long ago a document's text was last changed. */
export function ageLabel(iso: string, now = new Date()): string {
  const d = daysSince(iso, now);
  if (d === 0) return 'hari ini';
  if (d === 1) return 'kemarin';
  if (d < 60) return `${d} hari lalu`;
  return `${Math.floor(d / 30)} bulan lalu`;
}

/** Prices are "old" after 30 days: the page warns, because the AI keeps quoting what it was given. */
export const STALE_DAYS = 30;
export const isStale = (iso: string, now = new Date()): boolean => daysSince(iso, now) >= STALE_DAYS;

/** "3,4 MB", "820 KB". */
export function sizeLabel(bytes: number | null): string {
  if (!bytes) return '';
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
