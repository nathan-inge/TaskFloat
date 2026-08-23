import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Task } from '../api/types';
import { useContexts } from '../hooks/useContexts';
import TaskForm from '../components/TaskForm';

export default function TaskEdit() {
  const { id } = useParams<{ id: string }>();
  const { contexts, loading: ctxLoading } = useContexts();
  const [task, setTask] = useState<Task | null>(null);
  const [parent, setParent] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setTask(null);
    setParent(null);
    api
      .getTask(id)
      .then(async (t) => {
        // The parent's title is needed to label the "Subtask of" field.
        const p = t.parent_id ? await api.getTask(t.parent_id).catch(() => null) : null;
        if (!cancelled) {
          setParent(p);
          setTask(t);
        }
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return <p className="p-4 text-sm text-rose-700">Error: {error}</p>;
  }
  if (!task || ctxLoading) {
    return <p className="p-4 text-sm text-slate-500">Loading…</p>;
  }
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <h1 className="text-lg font-semibold">
            {task.parent_id ? 'Edit subtask' : 'Edit task'}
          </h1>
        </div>
      </header>
      <TaskForm
        key={task.id}
        mode="edit"
        contexts={contexts}
        task={task}
        parentTask={parent}
      />
    </>
  );
}
