// Shortcut presets for the "Due by" picker.
//
//   EOWD — End of Work Day:    today 6pm (or tomorrow 6pm if it's already past)
//   EOD  — End of Day:         today 10pm (or tomorrow 10pm)
//   EOWW — End of Work Week:   upcoming Friday 6pm
//   EOW  — End of Week:        upcoming Sunday 8pm

export type DueShortcutKind = 'EOWD' | 'EOD' | 'EOWW' | 'EOW';

export const DUE_SHORTCUTS: Array<{ kind: DueShortcutKind; label: string; hint: string }> = [
  { kind: 'EOWD', label: 'EOWD', hint: 'today 6pm' },
  { kind: 'EOD', label: 'EOD', hint: 'today 10pm' },
  { kind: 'EOWW', label: 'EOWW', hint: 'Fri 6pm' },
  { kind: 'EOW', label: 'EOW', hint: 'Sun 8pm' },
];

const FRIDAY = 5;
const SUNDAY = 0;

export function dueShortcut(kind: DueShortcutKind, now: Date): Date {
  const d = new Date(now);
  d.setSeconds(0, 0);
  d.setMinutes(0);

  if (kind === 'EOWD') {
    d.setHours(18);
    if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
    return d;
  }
  if (kind === 'EOD') {
    d.setHours(22);
    if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
    return d;
  }
  if (kind === 'EOWW') {
    d.setHours(18);
    return advanceToWeekday(d, FRIDAY, now);
  }
  // EOW
  d.setHours(20);
  return advanceToWeekday(d, SUNDAY, now);
}

function advanceToWeekday(d: Date, targetDow: number, now: Date): Date {
  let delta = (targetDow - d.getDay() + 7) % 7;
  if (delta === 0 && d.getTime() <= now.getTime()) delta = 7;
  d.setDate(d.getDate() + delta);
  return d;
}

/** Format a Date as the `YYYY-MM-DDTHH:MM` value an `<input type="datetime-local">` expects. */
export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
