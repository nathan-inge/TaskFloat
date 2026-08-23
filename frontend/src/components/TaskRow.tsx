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
  depth: number;
  /** Subtasks visible in the current list — may be fewer than subtask_count. */
  childCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onComplete: (id: string) => void;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
}

// Indentation per nesting level, capped so deep trees keep room for the title.
const INDENT_PX = 22;
const MAX_INDENT_LEVELS = 5;

export default function TaskRow({
  task,
  contexts,
  now,
  depth,
  childCount,
  collapsed,
  onToggleCollapse,
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
  const allSubtasksDone =
    task.subtask_count > 0 && task.subtask_done_count === task.subtask_count;

  function confirmDelete() {
    const msg =
      task.subtask_count > 0
        ? `Delete "${task.title}" and its ${task.subtask_count} subtask${
            task.subtask_count === 1 ? '' : 's'
          }?`
        : `Delete "${task.title}"?`;
    if (confirm(msg)) onDelete(task.id);
  }

  return (
    <li
      style={{ paddingLeft: 12 + Math.min(depth, MAX_INDENT_LEVELS) * INDENT_PX }}
      className={`group flex items-center gap-3 border-b border-slate-100 py-3 pr-3 last:border-b-0 ${
        completed
          ? 'bg-slate-50/60'
          : overdue
            ? 'bg-rose-50/40'
            : 'bg-white hover:bg-slate-50'
      }`}
    >
      {childCount > 0 ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand subtasks' : 'Collapse subtasks'}
          aria-expanded={!collapsed}
          className="-ml-1 flex h-6 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-600"
        >
          <span
            className={`inline-block transition-transform ${collapsed ? '' : 'rotate-90'}`}
          >
            ▸
          </span>
        </button>
      ) : (
        <span className="-ml-1 w-5 shrink-0" aria-hidden="true" />
      )}
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
            className={`truncate ${depth > 0 ? 'text-sm' : 'text-base'} font-medium ${
              completed ? 'text-slate-400 line-through' : 'text-slate-900'
            }`}
          >
            {task.title}
          </span>
          {task.subtask_count > 0 && (
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                allSubtasksDone
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
              title={`${task.subtask_done_count} of ${task.subtask_count} subtasks done`}
            >
              {task.subtask_done_count}/{task.subtask_count}
            </span>
          )}
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
        <Link
          to={`/new?parent=${task.id}`}
          className="hidden h-8 w-8 items-center justify-center rounded-md text-lg leading-none text-slate-300 group-hover:text-slate-500 group-hover:hover:bg-slate-100 group-hover:hover:text-blue-600 md:flex"
          title="Add subtask"
          aria-label="Add subtask"
        >
          +
        </Link>
        <button
          type="button"
          onClick={confirmDelete}
          className="hidden h-8 w-8 items-center justify-center rounded-md text-slate-300 group-hover:text-slate-500 group-hover:hover:bg-slate-100 group-hover:hover:text-rose-600 md:flex"
          aria-label="Delete"
        >
          ✕
        </button>
      </div>
    </li>
  );
}
