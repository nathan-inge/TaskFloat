import { useMemo } from 'react';
import type { Context, Task } from '../api/types';
import { sortBySlackAscending } from '../lib/slackTime';
import TaskRow from './TaskRow';

interface Props {
  tasks: Task[];
  contexts: Context[];
  now: Date;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TaskList({
  tasks,
  contexts,
  now,
  onComplete,
  onUncomplete,
  onDelete,
}: Props) {
  const sorted = useMemo(() => sortBySlackAscending(tasks, now), [tasks, now]);
  if (tasks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
        Nothing here. Tap <strong>Add</strong> to capture a task.
      </p>
    );
  }
  return (
    <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {sorted.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          contexts={contexts}
          now={now}
          onComplete={onComplete}
          onUncomplete={onUncomplete}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
