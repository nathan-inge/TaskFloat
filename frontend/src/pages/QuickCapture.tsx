import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Task } from '../api/types';
import { useContexts } from '../hooks/useContexts';
import { useSettings } from '../hooks/useSettings';
import TaskForm from '../components/TaskForm';

export default function QuickCapture() {
  const { contexts, loading } = useContexts();
  const { settings } = useSettings();
  const [params] = useSearchParams();
  const parentId = params.get('parent');
  const [parent, setParent] = useState<Task | null>(null);
  const [parentLoading, setParentLoading] = useState(!!parentId);

  useEffect(() => {
    if (!parentId) {
      setParent(null);
      setParentLoading(false);
      return;
    }
    let cancelled = false;
    setParentLoading(true);
    api
      .getTask(parentId)
      .then((t) => {
        if (!cancelled) setParent(t);
      })
      // A stale link just means the task opens as a top-level capture.
      .catch(() => {
        if (!cancelled) setParent(null);
      })
      .finally(() => {
        if (!cancelled) setParentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  if (loading || parentLoading || !settings) {
    return <p className="p-4 text-sm text-slate-500">Loading…</p>;
  }
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <h1 className="text-lg font-semibold">
            {parent ? 'New subtask' : 'New task'}
          </h1>
          {parent && (
            <p className="truncate text-xs text-slate-500">
              under <span className="font-medium">{parent.title}</span>
            </p>
          )}
        </div>
      </header>
      <TaskForm
        key={parent?.id ?? 'root'}
        mode="create"
        contexts={contexts}
        // A subtask starts in its parent's context rather than the current focus.
        defaultContextId={parent?.context_id ?? settings.current_context_id}
        parentTask={parent}
      />
    </>
  );
}
