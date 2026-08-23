import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Context, Task } from '../api/types';
import { pathTo } from '../lib/contextTree';

interface Props {
  contexts: Context[];
  /** Task being reparented — it and its subtree are not valid parents. */
  excludeId?: string;
  onPick: (task: Task) => void;
  onClose: () => void;
}

/** IDs of `rootId` and everything beneath it in the flat list. */
function subtreeIds(tasks: Task[], rootId: string): Set<string> {
  const out = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const t of tasks) {
      if (t.parent_id && out.has(t.parent_id) && !out.has(t.id)) {
        out.add(t.id);
        grew = true;
      }
    }
  }
  return out;
}

export default function TaskPicker({
  contexts,
  excludeId,
  onPick,
  onClose,
}: Props) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .listTasks({})
      .then((res) => {
        if (!cancelled) setTasks(res.tasks);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const candidates = useMemo(() => {
    if (!tasks) return [];
    const blocked = excludeId ? subtreeIds(tasks, excludeId) : new Set<string>();
    const needle = filter.trim().toLowerCase();
    return tasks
      .filter((t) => !blocked.has(t.id))
      .filter((t) => !needle || t.title.toLowerCase().includes(needle));
  }, [tasks, excludeId, filter]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40 md:items-center md:justify-center"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 md:max-w-md md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pick a parent task</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-slate-500"
          >
            Close
          </button>
        </div>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search open tasks…"
          autoComplete="off"
        />
        {error ? (
          <p className="py-6 text-center text-sm text-rose-700">{error}</p>
        ) : !tasks ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading…</p>
        ) : candidates.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No other open tasks to nest under.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {candidates.map((t) => {
              const path = pathTo(contexts, t.context_id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onPick(t)}
                    className="w-full px-1 py-2.5 text-left hover:bg-slate-50"
                  >
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {t.title}
                    </span>
                    {path.length > 0 && (
                      <span className="block truncate text-xs text-slate-400">
                        {path.map((c) => c.name).join(' › ')}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
