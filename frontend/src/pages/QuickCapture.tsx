import { useContexts } from '../hooks/useContexts';
import { useSettings } from '../hooks/useSettings';
import TaskForm from '../components/TaskForm';

export default function QuickCapture() {
  const { contexts, loading } = useContexts();
  const { settings } = useSettings();

  if (loading || !settings) {
    return <p className="p-4 text-sm text-slate-500">Loading…</p>;
  }
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <h1 className="text-lg font-semibold">New task</h1>
        </div>
      </header>
      <TaskForm
        mode="create"
        contexts={contexts}
        defaultContextId={settings.current_context_id}
      />
    </>
  );
}
