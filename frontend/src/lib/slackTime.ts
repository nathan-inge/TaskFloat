import type { Task } from '../api/types';

// Parity with backend/src/domain/slack_time.rs.

export function computeSlackMinutes(
  dueBy: string | null,
  effortMinutes: number,
  now: Date,
): number | null {
  if (!dueBy) return null;
  const due = new Date(dueBy).getTime();
  const untilDueMin = Math.floor((due - now.getTime()) / 60_000);
  return untilDueMin - effortMinutes;
}

export function sortBySlackAscending(tasks: Task[], now: Date): Task[] {
  return [...tasks].sort((a, b) => {
    // Completed tasks always go to the bottom.
    if (!!a.completed_at !== !!b.completed_at) {
      return a.completed_at ? 1 : -1;
    }
    // Among completed: most recently completed first.
    if (a.completed_at && b.completed_at) {
      return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
    }
    // Among active: by Slack Time ascending; null due_by sinks to bottom.
    const sa = computeSlackMinutes(a.due_by, a.effort_minutes, now);
    const sb = computeSlackMinutes(b.due_by, b.effort_minutes, now);
    const nullA = sa === null;
    const nullB = sb === null;
    if (nullA !== nullB) return nullA ? 1 : -1;
    return (sa ?? 0) - (sb ?? 0);
  });
}

