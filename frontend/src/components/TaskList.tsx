import { useMemo, useState } from 'react';
import type { Context, Task } from '../api/types';
import { buildTaskTree, flattenTree } from '../lib/taskTree';
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
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const tree = useMemo(() => buildTaskTree(tasks, now), [tasks, now]);
  const rows = useMemo(() => flattenTree(tree, collapsed), [tree, collapsed]);

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  if (tasks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
        Nothing here. Tap <strong>Add</strong> to capture a task.
      </p>
    );
  }
  return (
    <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {rows.map((row) => (
        <TaskRow
          key={row.task.id}
          task={row.task}
          contexts={contexts}
          now={now}
          depth={row.depth}
          childCount={row.childCount}
          collapsed={collapsed.has(row.task.id)}
          onToggleCollapse={() => toggle(row.task.id)}
          onComplete={onComplete}
          onUncomplete={onUncomplete}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
