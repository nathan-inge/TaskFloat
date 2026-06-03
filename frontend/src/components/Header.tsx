import { Link } from 'react-router-dom';
import type { Context } from '../api/types';
import { pathTo } from '../lib/contextTree';
import { formatLongDate } from '../lib/dateFormat';

interface Props {
  contexts: Context[];
  currentContextId: string | null;
  now: Date;
  onOpenSidebar: () => void;
}

export default function Header({
  contexts,
  currentContextId,
  now,
  onOpenSidebar,
}: Props) {
  const path = pathTo(contexts, currentContextId);
  const leaf = path[path.length - 1];
  const icon = leaf?.icon ?? '☀️';
  const modeLabel = leaf ? `${leaf.name} Mode` : 'No Context';

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="-ml-1 rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Open contexts"
        >
          ☰
        </button>
        <span
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700"
          style={leaf ? { borderColor: `${leaf.color}55`, background: `${leaf.color}11` } : undefined}
        >
          <span className="text-base leading-none">{icon}</span>
          {modeLabel}
        </span>
        <span className="hidden flex-1 text-sm text-slate-600 sm:block">
          {formatLongDate(now)}
        </span>
        <Link
          to="/new"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <span className="text-base leading-none">＋</span>
          <span className="hidden sm:inline">New task</span>
        </Link>
        <span className="hidden text-2xl text-slate-400 lg:inline">⚙️</span>
      </div>
    </header>
  );
}
