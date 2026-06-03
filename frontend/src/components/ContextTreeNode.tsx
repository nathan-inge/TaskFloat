import { useState } from 'react';
import type { ContextNode } from '../api/types';

interface Props {
  nodes: ContextNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
}

export default function ContextTreeNode({
  nodes,
  selectedId,
  onSelect,
  depth = 0,
}: Props) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((n) => (
        <NodeRow
          key={n.id}
          node={n}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth}
        />
      ))}
    </ul>
  );
}

function NodeRow({
  node,
  selectedId,
  onSelect,
  depth,
}: {
  node: ContextNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  const isSelected = selectedId === node.id;
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <div
        className={`flex items-center gap-2 rounded-md px-2 py-2 ${
          isSelected ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100'
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-400"
            aria-label={open ? 'Collapse' : 'Expand'}
          >
            <span className={`transition ${open ? 'rotate-90' : ''}`}>▶</span>
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" />
        )}
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ background: node.color }}
        />
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex-1 truncate text-left text-base font-medium"
        >
          {node.name}
        </button>
      </div>
      {open && hasChildren && (
        <ContextTreeNode
          nodes={node.children}
          selectedId={selectedId}
          onSelect={onSelect}
          depth={depth + 1}
        />
      )}
    </li>
  );
}
