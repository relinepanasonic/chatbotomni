/** The same message rules as the ERP's lib/chat/broadcast-rules.ts, for the preview: wordings split at "---", {nama}, and the STOP line. Pure. */
export const STOP_FOOTER = 'Balas STOP kalau tidak mau menerima info lagi ya kak.';

export function splitVariants(message: string): string[] {
  return String(message ?? '').replace(/\r\n/g, '\n').split(/\n\s*-{3,}\s*\n/).map((v) => v.trim()).filter(Boolean).slice(0, 5);
}

export function preview(message: string, position: number, name: string): string {
  const v = splitVariants(message);
  if (!v.length) return '';
  const first = name.trim().split(/\s+/)[0] || '';
  return `${v[position % v.length].replace(/\{nama\}/gi, first || 'kak').replace(/kak kak/gi, 'kak')}\n\n${STOP_FOOTER}`;
}
