'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MONTHS, WEEKDAYS, clockOf, dayKeyOf, dayTitle, groupByPart, monthGrid, monthOf, shiftMonth, slotsByDay } from '@/lib/calendar';

/**
 * Picking a free consultation time: a month calendar where only days with free times can be chosen (a dot shows how many), then the times of
 * that day as buttons, grouped morning / afternoon. Keyboard friendly (every day and time is a real button), readable at 320px.
 */
export function SlotPicker({ codes, value, onChange, disabled = false }: { codes: string[]; value: string; onChange: (code: string) => void; disabled?: boolean }) {
  const byDay = useMemo(() => slotsByDay(codes), [codes]);
  const days = useMemo(() => [...byDay.keys()], [byDay]);
  const todayKey = dayKeyOf(new Date());
  const [day, setDay] = useState<string>(() => (value ? dayKeyOf(value) : days[0] ?? ''));
  const [month, setMonth] = useState(() => monthOf(value ? dayKeyOf(value) : days[0] ?? todayKey));
  useEffect(() => { if (!day && days[0]) { setDay(days[0]); setMonth(monthOf(days[0])); } }, [days, day]);

  const first = monthOf(days[0] ?? todayKey), last = monthOf(days[days.length - 1] ?? todayKey);
  const idx = (m: { y: number; m: number }) => m.y * 12 + m.m;
  const canPrev = idx(month) > idx(first), canNext = idx(month) < idx(last);
  const weeks = useMemo(() => monthGrid(month.y, month.m), [month]);
  const times = byDay.get(day) ?? [];

  const pickDay = (k: string) => { setDay(k); if (value && dayKeyOf(value) !== k) onChange(''); };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-line bg-brand-softer p-2.5">
        <div className="flex items-center justify-between px-0.5 pb-1.5">
          <button type="button" disabled={!canPrev || disabled} onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft transition hover:bg-white hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-30"><Chevron dir="left" /></button>
          <p className="text-[13px] font-extrabold" aria-live="polite">{MONTHS[month.m]} {month.y}</p>
          <button type="button" disabled={!canNext || disabled} onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month" className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft transition hover:bg-white hover:text-brand-dark focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-30"><Chevron dir="right" /></button>
        </div>
        <div className="grid grid-cols-7 text-center text-[10.5px] font-bold text-ink-soft" aria-hidden="true">{WEEKDAYS.map((w) => <span key={w} className="py-1">{w}</span>)}</div>
        <div className="grid grid-cols-7 gap-y-0.5" role="grid" aria-label={`${MONTHS[month.m]} ${month.y}`}>
          {weeks.flat().map((c) => {
            const n = byDay.get(c.key)?.length ?? 0;
            const on = day === c.key;
            if (!c.inMonth) return <span key={c.key} role="gridcell" className="h-9" />;
            return (
              <span key={c.key} role="gridcell" className="flex justify-center">
                <button type="button" disabled={n === 0 || disabled} onClick={() => pickDay(c.key)} aria-pressed={on} aria-label={n ? `${dayTitle(c.key)}, ${n} free time${n > 1 ? 's' : ''}` : `${dayTitle(c.key)}, no free time`}
                  className={`relative flex h-9 w-9 flex-col items-center justify-center rounded-full text-[12.5px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand
                    ${on ? 'bg-brand text-white' : n ? 'bg-white text-ink ring-1 ring-brand/30 hover:bg-brand-soft' : 'text-[#a9b8c7]'} ${c.key === todayKey && !on ? 'ring-2 ring-brand' : ''}`}>
                  {c.day}
                  {n > 0 && <span className={`absolute bottom-1 h-1 w-1 rounded-full ${on ? 'bg-white' : 'bg-brand'}`} aria-hidden="true" />}
                </button>
              </span>
            );
          })}
        </div>
      </div>

      {day && times.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[12px] font-extrabold">{dayTitle(day)}</p>
          <div className="space-y-2">
            {groupByPart(times).map((g) => (
              <div key={g.part} className="grid grid-cols-[4.6rem_1fr] items-start gap-2">
                <span className="pt-1.5 text-[11px] font-semibold text-ink-soft">{g.part}</span>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`${g.part} times`}>
                  {g.codes.map((c) => {
                    const on = value === c;
                    return <button key={c} type="button" role="radio" aria-checked={on} disabled={disabled} onClick={() => onChange(c)}
                      className={`rounded-lg px-2.5 py-1.5 text-[12.5px] font-bold transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand ${on ? 'bg-brand text-white' : 'border border-line bg-white text-brand-dark hover:border-brand'}`}>{clockOf(c)}</button>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : <p className="text-[12px] text-ink-soft">{days.length ? 'Pick a day with a dot to see its times.' : 'No free time to pick.'}</p>}
    </div>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} /></svg>;
}
