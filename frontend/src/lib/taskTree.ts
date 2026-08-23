import type { Task } from '../api/types';
import { sortBySlackAscending } from './slackTime';

export interface TaskNode {
  task: Task;
  depth: number;
  children: TaskNode[];
}

export interface VisibleRow {
  task: Task;
  depth: number;
  /** Children present in this view — a row can have subtasks the filter hid. */
  childCount: number;
}

/**
 * Nests a flat task list under its parents, sorting siblings by Slack Time.
 *
 * A task whose parent is missing from `tasks` (filtered out by context, or
 * hidden because it is completed) surfaces at the top level rather than
 * vanishing with it.
 */
export function buildTaskTree(tasks: Task[], now: Date): TaskNode[] {
  const present = new Set(tasks.map((t) => t.id));
  const childrenOf = new Map<string, Task[]>();
  const roots: Task[] = [];

  for (const t of tasks) {
    if (t.parent_id && present.has(t.parent_id)) {
      const arr = childrenOf.get(t.parent_id) ?? [];
      arr.push(t);
      childrenOf.set(t.parent_id, arr);
    } else {
      roots.push(t);
    }
  }

  // `seen` guards against a parent cycle turning this into infinite recursion;
  // the API rejects cycles, but bad data should not hang the app.
  const seen = new Set<string>();

  const build = (siblings: Task[], depth: number): TaskNode[] =>
    sortBySlackAscending(siblings, now).flatMap((task) => {
      if (seen.has(task.id)) return [];
      seen.add(task.id);
      return [
        {
          task,
          depth,
          children: build(childrenOf.get(task.id) ?? [], depth + 1),
        },
      ];
    });

  const tree = build(roots, 0);
  // Anything a cycle kept out of the walk still belongs on screen.
  const stranded = tasks.filter((t) => !seen.has(t.id));
  return stranded.length > 0 ? [...tree, ...build(stranded, 0)] : tree;
}

/** Depth-first flattening, skipping the subtrees of collapsed parents. */
export function flattenTree(
  nodes: TaskNode[],
  collapsed: ReadonlySet<string>,
): VisibleRow[] {
  const out: VisibleRow[] = [];
  const walk = (list: TaskNode[]) => {
    for (const n of list) {
      out.push({ task: n.task, depth: n.depth, childCount: n.children.length });
      if (!collapsed.has(n.task.id)) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}
