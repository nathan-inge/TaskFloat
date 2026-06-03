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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api
      .getTask(id)
      .then((t) => {
        if (!cancelled) setTask(t);
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
          <h1 className="text-lg font-semibold">Edit task</h1>
        </div>
      </header>
      <TaskForm mode="edit" contexts={contexts} task={task} />
    </>
  );
}
