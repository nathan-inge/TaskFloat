import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useContexts } from '../hooks/useContexts';
import { useContextCounts } from '../hooks/useContextCounts';
import { useSettings } from '../hooks/useSettings';
import { useTasks } from '../hooks/useTasks';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import TaskList from '../components/TaskList';
import { pathTo } from '../lib/contextTree';
import { rollUpCounts } from '../lib/contextCounts';

export default function Dashboard() {
  const { contexts } = useContexts();
  const { settings, update: updateSettings } = useSettings();
  const [scope, setScope] = useState<'subtree' | 'direct'>('subtree');
  const [showCompleted, setShowCompleted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const currentContextId = settings?.current_context_id ?? null;
  const { data, refresh } = useTasks({
    context_id: currentContextId ?? undefined,
    include_descendants: scope === 'subtree',
    include_completed: showCompleted,
  });
  const { counts: rawCounts, refresh: refreshCounts } = useContextCounts(tick);
  const rolledCounts = useMemo(
    () => rollUpCounts(contexts, rawCounts),
    [contexts, rawCounts],
  );

  const path = pathTo(contexts, currentContextId);
  const leafName = path[path.length - 1]?.name;
  const leafIcon = path[path.length - 1]?.icon ?? '🚀';

  async function onContextChanged(id: string) {
    await updateSettings({ current_context_id: id });
    refresh();
  }
  async function onComplete(id: string) {
    await api.completeTask(id);
    refresh();
    setTick((t) => t + 1);
    refreshCounts();
  }
  async function onUncomplete(id: string) {
    await api.uncompleteTask(id);
    refresh();
    setTick((t) => t + 1);
    refreshCounts();
  }
  async function onDelete(id: string) {
    await api.deleteTask(id);
    refresh();
    setTick((t) => t + 1);
    refreshCounts();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        contexts={contexts}
        currentContextId={currentContextId}
        now={now}
        onOpenSidebar={() => setSidebarOpen(true)}
      />
      <div className="mx-auto flex max-w-6xl">
        <Sidebar
          contexts={contexts}
          counts={rolledCounts}
          currentContextId={currentContextId}
          onSelect={onContextChanged}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="min-w-0 flex-1 p-4 lg:p-6">
          {!settings ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : contexts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
              No contexts yet.{' '}
              <Link to="/contexts" className="font-medium text-blue-600">
                Create one →
              </Link>
            </p>
          ) : !currentContextId ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
              Pick a context from the sidebar to see tasks.
            </p>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {leafIcon} Current Focus Stack
                  {leafName && (
                    <span className="ml-2 text-slate-400">({leafName})</span>
                  )}
                </h2>
                <div className="hidden items-center gap-4 text-xs text-slate-500 sm:flex">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={scope === 'subtree'}
                      onChange={(e) =>
                        setScope(e.target.checked ? 'subtree' : 'direct')
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Include subcontexts
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showCompleted}
                      onChange={(e) => setShowCompleted(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Show completed
                  </label>
                </div>
              </div>
              {data?.capacity_warning && (
                <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                  ⚠️ Workload exceeds remaining capacity for today.
                </div>
              )}
              <TaskList
                tasks={data?.tasks ?? []}
                contexts={contexts}
                now={now}
                onComplete={onComplete}
                onUncomplete={onUncomplete}
                onDelete={onDelete}
              />
              {/* Mobile-only toggles, below the list */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 sm:hidden">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={scope === 'subtree'}
                    onChange={(e) =>
                      setScope(e.target.checked ? 'subtree' : 'direct')
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Include subcontexts
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => setShowCompleted(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Show completed
                </label>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
