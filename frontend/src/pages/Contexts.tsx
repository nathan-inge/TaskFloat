import { useState } from 'react';
import { api } from '../api/client';
import { useContexts } from '../hooks/useContexts';
import { buildTree } from '../lib/contextTree';
import type { Context, ContextNode } from '../api/types';

const PALETTE = [
  '#1e88e5',
  '#43a047',
  '#fb8c00',
  '#ec407a',
  '#8e24aa',
  '#00897b',
  '#5e35b1',
  '#e53935',
];

const SUGGESTED_ICONS = ['📥', '💼', '🏡', '⚡', '🎯', '🧠', '📚', '🛒', '☀️', '🌙'];

export default function ContextsPage() {
  const { contexts, refresh } = useContexts();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [color, setColor] = useState(PALETTE[0]);
  const [icon, setIcon] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const tree = buildTree(contexts);

  async function createCtx(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    try {
      await api.createContext({
        name: name.trim(),
        color,
        icon: icon.trim() || null,
        parent_id: parentId,
      });
      setName('');
      setIcon('');
      refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this context?')) return;
    try {
      await api.deleteContext(id);
      refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <h1 className="text-lg font-semibold">Contexts</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-4">
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-700">Create context</h2>
          <form onSubmit={createCtx} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value.slice(0, 4))}
                placeholder="🎯"
                className="w-16 text-center text-xl"
                aria-label="Icon emoji"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. work, projectA, errands"
                autoComplete="off"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_ICONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  className={`h-9 w-9 rounded-md text-xl hover:bg-slate-100 ${
                    icon === e ? 'bg-slate-200' : ''
                  }`}
                  aria-label={`Pick icon ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="block text-xs font-medium text-slate-500">
                Parent (optional)
              </span>
              <select
                value={parentId ?? ''}
                onChange={(e) => setParentId(e.target.value || null)}
              >
                <option value="">— root —</option>
                {contexts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Pick color ${c}`}
                  className={`h-8 w-8 rounded-full border-2 ${
                    color === c ? 'border-slate-900' : 'border-white'
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
            {error && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Add context
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Tree</h2>
          {tree.length === 0 ? (
            <p className="text-sm text-slate-500">No contexts yet.</p>
          ) : (
            <TreeView
              nodes={tree}
              depth={0}
              editingId={editingId}
              onEdit={(id) => setEditingId(id)}
              onCancelEdit={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                refresh();
              }}
              onDelete={remove}
            />
          )}
        </section>
      </main>
    </>
  );
}

function TreeView({
  nodes,
  depth,
  editingId,
  onEdit,
  onCancelEdit,
  onSaved,
  onDelete,
}: {
  nodes: ContextNode[];
  depth: number;
  editingId: string | null;
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaved: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ul className="space-y-1">
      {nodes.map((n) => (
        <li key={n.id}>
          {editingId === n.id ? (
            <div style={{ paddingLeft: `${depth * 16 + 8}px` }}>
              <EditContextRow
                context={n}
                onCancel={onCancelEdit}
                onSaved={onSaved}
              />
            </div>
          ) : (
            <div
              className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-slate-50"
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
            >
              {n.icon ? (
                <span className="text-base leading-none">{n.icon}</span>
              ) : (
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: n.color }}
                />
              )}
              <span className="flex-1 truncate text-base">{n.name}</span>
              <button
                type="button"
                onClick={() => onEdit(n.id)}
                className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(n.id)}
                className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-rose-600"
              >
                Delete
              </button>
            </div>
          )}
          {n.children.length > 0 && (
            <TreeView
              nodes={n.children}
              depth={depth + 1}
              editingId={editingId}
              onEdit={onEdit}
              onCancelEdit={onCancelEdit}
              onSaved={onSaved}
              onDelete={onDelete}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function EditContextRow({
  context,
  onCancel,
  onSaved,
}: {
  context: Context;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(context.name);
  const [icon, setIcon] = useState(context.icon ?? '');
  const [color, setColor] = useState(context.color);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setBusy(true);
    try {
      await api.updateContext(context.id, {
        name: name.trim(),
        color,
        icon: icon.trim() ? icon.trim() : null,
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3"
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value.slice(0, 4))}
          placeholder="🎯"
          className="w-16 text-center text-xl"
          aria-label="Icon emoji"
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          autoComplete="off"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED_ICONS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setIcon(e)}
            className={`h-8 w-8 rounded-md text-lg hover:bg-white ${
              icon === e ? 'bg-slate-200' : ''
            }`}
          >
            {e}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setIcon('')}
          className="rounded-md px-2 text-xs text-slate-500 hover:bg-white"
        >
          (clear)
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Pick color ${c}`}
            className={`h-7 w-7 rounded-full border-2 ${
              color === c ? 'border-slate-900' : 'border-white'
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
      {error && (
        <p className="rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
