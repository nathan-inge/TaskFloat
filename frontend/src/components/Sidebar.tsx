import { Link } from 'react-router-dom';
import type { Context, ContextNode } from '../api/types';
import { buildTree } from '../lib/contextTree';

interface Props {
  contexts: Context[];
  counts: Map<string, number>;
  currentContextId: string | null;
  onSelect: (id: string) => void;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({
  contexts,
  counts,
  currentContextId,
  onSelect,
  open,
  onClose,
}: Props) {
  const tree = buildTree(contexts);

  return (
    <>
      {/* mobile overlay */}
      <div
        className={`fixed inset-0 z-30 bg-black/40 transition lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed bottom-0 left-0 top-0 z-40 w-72 transform overflow-y-auto border-r border-slate-200 bg-white p-4 transition lg:sticky lg:top-[57px] lg:z-auto lg:h-[calc(100vh-57px)] lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="mb-3 flex items-center justify-between lg:hidden">
          <h2 className="text-sm font-semibold text-slate-700">Contexts</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500"
          >
            Close
          </button>
        </div>
        {tree.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            No contexts yet.{' '}
            <Link to="/contexts" className="font-medium text-blue-600">
              Create one →
            </Link>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {tree.map((n) => (
              <SidebarNode
                key={n.id}
                node={n}
                counts={counts}
                currentContextId={currentContextId}
                onSelect={(id) => {
                  onSelect(id);
                  onClose();
                }}
                depth={0}
              />
            ))}
          </ul>
        )}
        <div className="mt-6 border-t border-slate-200 pt-4">
          <Link
            to="/contexts"
            className="block rounded-md px-2 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            ✏️ Manage contexts
          </Link>
        </div>
      </aside>
    </>
  );
}

function SidebarNode({
  node,
  counts,
  currentContextId,
  onSelect,
  depth,
}: {
  node: ContextNode;
  counts: Map<string, number>;
  currentContextId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const isActive = node.id === currentContextId;
  const count = counts.get(node.id) ?? 0;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={`flex w-full items-center gap-2 rounded-md py-2 pr-2 text-left text-base ${
          isActive
            ? 'bg-blue-50 font-semibold text-blue-700'
            : 'text-slate-700 hover:bg-slate-100'
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        <span className="w-5 shrink-0 text-base leading-none">
          {node.icon ?? (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full align-middle"
              style={{ background: node.color }}
            />
          )}
        </span>
        <span className="flex-1 truncate">{node.name}</span>
        {count > 0 && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {count}
          </span>
        )}
      </button>
      {node.children.length > 0 && (
        <ul className="space-y-0.5">
          {node.children.map((c) => (
            <SidebarNode
              key={c.id}
              node={c}
              counts={counts}
              currentContextId={currentContextId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
