import type { Context, ContextNode } from '../api/types';

export function buildTree(flat: Context[]): ContextNode[] {
  const byParent = new Map<string | null, Context[]>();
  for (const c of flat) {
    const arr = byParent.get(c.parent_id) ?? [];
    arr.push(c);
    byParent.set(c.parent_id, arr);
  }
  const build = (parent: string | null): ContextNode[] =>
    (byParent.get(parent) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ ...c, children: build(c.id) }));
  return build(null);
}

/** Path of names from root to the given context, e.g. ["Work", "ProjectA"]. */
export function pathTo(flat: Context[], id: string | null): Context[] {
  if (!id) return [];
  const byId = new Map(flat.map((c) => [c.id, c] as const));
  const out: Context[] = [];
  let cursor: string | null = id;
  while (cursor) {
    const c = byId.get(cursor);
    if (!c) break;
    out.unshift(c);
    cursor = c.parent_id;
  }
  return out;
}
