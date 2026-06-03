import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Context, Task } from '../api/types';
import { buildTree, pathTo } from '../lib/contextTree';
import {
  DUE_SHORTCUTS,
  dueShortcut,
  toDatetimeLocalValue,
  type DueShortcutKind,
} from '../lib/dueShortcuts';
import ContextTreeNode from './ContextTreeNode';

interface Props {
  contexts: Context[];
  mode: 'create' | 'edit';
  defaultContextId?: string | null;
  task?: Task;
}

const EFFORT_CHOICES: Array<{ minutes: number; label: string }> = [
  { minutes: 5, label: '5 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 120, label: '2 hours' },
  { minutes: 240, label: '4 hours' },
  { minutes: 480, label: '8 hours' },
];

function isoToLocal(iso: string): string {
  return toDatetimeLocalValue(new Date(iso));
}

export default function TaskForm({
  contexts,
  mode,
  defaultContextId = null,
  task,
}: Props) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [effortMinutes, setEffortMinutes] = useState<number>(
    task?.effort_minutes ?? 30,
  );
  const [dueBy, setDueBy] = useState(task?.due_by ? isoToLocal(task.due_by) : '');
  const [contextId, setContextId] = useState<string | null>(
    task?.context_id ?? defaultContextId,
  );
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (mode === 'create') titleRef.current?.focus();
  }, [mode]);

  const ctxPath = pathTo(contexts, contextId);
  const tree = buildTree(contexts);

  function applyShortcut(kind: DueShortcutKind) {
    const d = dueShortcut(kind, new Date());
    setDueBy(toDatetimeLocalValue(d));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!contextId) {
      setError('Pick a context.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'create') {
        await api.createTask({
          title: title.trim(),
          effort_minutes: effortMinutes,
          context_id: contextId,
          due_by: dueBy ? new Date(dueBy).toISOString() : null,
        });
      } else if (task) {
        await api.updateTask(task.id, {
          title: title.trim(),
          effort_minutes: effortMinutes,
          context_id: contextId,
          due_by: dueBy ? new Date(dueBy).toISOString() : undefined,
        });
      }
      navigate('/');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteTask() {
    if (!task) return;
    if (!confirm(`Delete "${task.title}"?`)) return;
    setBusy(true);
    try {
      await api.deleteTask(task.id);
      navigate('/');
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4 p-4">
      <label className="block">
        <span className="text-sm font-medium text-slate-600">Title</span>
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Call mom"
          autoComplete="off"
          enterKeyHint="next"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-600">Effort</span>
        <select
          value={effortMinutes}
          onChange={(e) => setEffortMinutes(parseInt(e.target.value, 10))}
        >
          {EFFORT_CHOICES.map((c) => (
            <option key={c.minutes} value={c.minutes}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <div className="block">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">Due by (optional)</span>
          {dueBy && (
            <button
              type="button"
              onClick={() => setDueBy('')}
              className="text-xs font-medium text-slate-500 hover:text-rose-600"
            >
              Clear
            </button>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {DUE_SHORTCUTS.map((s) => (
            <button
              key={s.kind}
              type="button"
              onClick={() => applyShortcut(s.kind)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              title={s.hint}
            >
              <span className="font-semibold">{s.label}</span>
              <span className="text-slate-400">· {s.hint}</span>
            </button>
          ))}
        </div>
        <input
          type="datetime-local"
          value={dueBy}
          step={3600}
          onChange={(e) => setDueBy(e.target.value)}
          className="mt-2"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-slate-600">Context</span>
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="mt-1 flex min-h-[44px] w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left"
        >
          <span className="truncate">
            {ctxPath.length === 0 ? (
              <span className="text-slate-500">Pick a context…</span>
            ) : (
              ctxPath.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && <span className="mx-1 text-slate-400">›</span>}
                  {c.name}
                </span>
              ))
            )}
          </span>
          <span className="ml-auto text-slate-400">▾</span>
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-base font-semibold text-white shadow-sm disabled:opacity-50"
        >
          {busy ? 'Saving…' : mode === 'create' ? 'Save' : 'Save changes'}
        </button>
      </div>

      {mode === 'edit' && task && (
        <button
          type="button"
          onClick={deleteTask}
          disabled={busy}
          className="w-full rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:opacity-50"
        >
          Delete task
        </button>
      )}

      {picking && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-black/40 md:items-center md:justify-center"
          onClick={() => setPicking(false)}
        >
          <div
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 md:max-w-md md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Pick a context</h2>
              <button
                type="button"
                onClick={() => setPicking(false)}
                className="rounded-md px-3 py-1.5 text-sm text-slate-500"
              >
                Close
              </button>
            </div>
            {contexts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No contexts yet. Create one from the Contexts tab.
              </p>
            ) : (
              <ContextTreeNode
                nodes={tree}
                selectedId={contextId}
                onSelect={(id) => {
                  setContextId(id);
                  setPicking(false);
                }}
              />
            )}
          </div>
        </div>
      )}
    </form>
  );
}
