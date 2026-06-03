import { Link } from 'react-router-dom';
import type { Task, Context } from '../api/types';
import { computeSlackMinutes } from '../lib/slackTime';
import {
  formatCompletedAgo,
  formatDueRelative,
  formatTimeLeft,
} from '../lib/dateFormat';
import { pathTo } from '../lib/contextTree';

interface Props {
  task: Task;
  contexts: Context[];
  now: Date;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function TaskRow({
  task,
  contexts,
  now,
  onComplete,
  onUncomplete,
  onDelete,
}: Props) {
  const completed = !!task.completed_at;
  const st = completed
    ? null
    : computeSlackMinutes(task.due_by, task.effort_minutes, now);
  const overdue = !completed && st !== null && st <= 0;
  const path = pathTo(contexts, task.context_id);
  const leaf = path[path.length - 1];

  return (
    <li
      className={`group flex items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 ${
        completed
          ? 'bg-slate-50/60'
          : overdue
            ? 'bg-rose-50/40'
            : 'bg-white hover:bg-slate-50'
      }`}
    >
      <button
        type="button"
        onClick={() => (completed ? onUncomplete(task.id) : onComplete(task.id))}
        aria-label={completed ? 'Mark not done' : 'Complete'}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 transition ${
          completed
            ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
            : 'border-slate-300 hover:border-emerald-400'
        }`}
      >
        {completed ? '✓' : ''}
      </button>
      <Link
        to={`/task/${task.id}/edit`}
        className="min-w-0 flex-1 cursor-pointer"
      >
        <div className="flex items-baseline gap-2">
          <span
            className={`truncate text-base font-medium ${
              completed ? 'text-slate-400 line-through' : 'text-slate-900'
            }`}
          >
            {task.title}
          </span>
          {task.notes && (
            <span
              className="shrink-0 text-xs text-slate-400"
              title="Has notes"
              aria-label="Has notes"
            >
              📝
            </span>
          )}
          {leaf && path.length > 1 && (
            <span className="hidden truncate text-xs text-slate-400 sm:inline">
              {path.slice(0, -1).map((c) => c.name).join(' › ')}
            </span>
          )}
        </div>
      </Link>
      <div className="flex shrink-0 items-center gap-3 text-sm">
        {completed ? (
          <span className="whitespace-nowrap text-slate-400">
            ✓ {formatCompletedAgo(task.completed_at!, now)}
          </span>
        ) : (
          <>
            <span
              className={`inline-flex items-center gap-1 whitespace-nowrap ${
                overdue ? 'font-semibold text-rose-700' : 'text-slate-500'
              }`}
            >
              ⏱️ {formatTimeLeft(st)}
            </span>
            {task.due_by && (
              <span className="hidden whitespace-nowrap text-slate-500 sm:inline">
                📅 {formatDueRelative(task.due_by, now)}
              </span>
            )}
          </>
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete "${task.title}"?`)) onDelete(task.id);
          }}
          className="hidden h-8 w-8 items-center justify-center rounded-md text-slate-300 group-hover:text-slate-500 group-hover:hover:bg-slate-100 group-hover:hover:text-rose-600 md:flex"
          aria-label="Delete"
        >
          ✕
        </button>
      </div>
    </li>
  );
}
