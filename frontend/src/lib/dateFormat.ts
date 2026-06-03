// Friendly date/duration formatting for the dashboard UI.

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "Monday, June 3, 2026" */
export function formatLongDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** "4h left", "1h left", "30m left", "2d left", "Overdue 1h" — for the SLACK time. */
export function formatTimeLeft(slackMinutes: number | null): string {
  if (slackMinutes === null) return 'no deadline';
  const overdue = slackMinutes < 0;
  const abs = Math.abs(slackMinutes);
  let label: string;
  if (abs < 60) label = `${abs}m`;
  else if (abs < 24 * 60) label = `${(abs / 60).toFixed(abs / 60 < 10 ? 1 : 0)}h`;
  else label = `${Math.floor(abs / (24 * 60))}d`;
  return overdue ? `Overdue ${label}` : `${label} left`;
}

/**
 * "Due Tonight", "Due Tomorrow 5pm", "Due Fri 5pm", "Due Jun 12 5pm".
 * "Tonight" applies to a same-day due time after 17:00 local.
 */
export function formatDueRelative(dueIso: string, now: Date): string {
  const due = new Date(dueIso);
  const sameDay =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();
  const tomorrow = new Date(now.getTime() + DAY);
  const isTomorrow =
    due.getFullYear() === tomorrow.getFullYear() &&
    due.getMonth() === tomorrow.getMonth() &&
    due.getDate() === tomorrow.getDate();
  const t = formatClockShort(due);
  if (sameDay) {
    if (due.getHours() >= 17) return `Due Tonight ${t}`;
    if (due.getTime() < now.getTime()) return `Was due ${t}`;
    return `Due Today ${t}`;
  }
  if (isTomorrow) return `Due Tomorrow ${t}`;
  const within7Days = Math.abs(due.getTime() - now.getTime()) < 7 * DAY;
  const weekday = due.toLocaleDateString(undefined, { weekday: 'short' });
  if (within7Days && due.getTime() > now.getTime()) return `Due ${weekday} ${t}`;
  const md = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `Due ${md} ${t}`;
}

/** "just now", "2m ago", "3h ago", "yesterday", "Jun 1" */
export function formatCompletedAgo(completedIso: string, now: Date): string {
  const then = new Date(completedIso).getTime();
  const diffMin = Math.floor((now.getTime() - then) / MIN);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 24 * 60) return `${Math.floor(diffMin / 60)}h ago`;
  if (diffMin < 48 * 60) return 'yesterday';
  const d = new Date(completedIso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** "5pm", "5:30pm", "11am" */
function formatClockShort(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  const h12 = ((h + 11) % 12) + 1;
  const mm = m === 0 ? '' : `:${m.toString().padStart(2, '0')}`;
  return `${h12}${mm}${am ? 'am' : 'pm'}`;
}
