import type { Context, ContextTaskCount } from '../api/types';

/**
 * Roll up per-context task counts to include each context's descendants.
 * Returns a Map<context_id, subtree_count>.
 */
export function rollUpCounts(
  flat: Context[],
  raw: ContextTaskCount[],
): Map<string, number> {
  const direct = new Map<string, number>();
  for (const r of raw) direct.set(r.context_id, r.count);

  const childrenOf = new Map<string | null, Context[]>();
  for (const c of flat) {
    const arr = childrenOf.get(c.parent_id) ?? [];
    arr.push(c);
    childrenOf.set(c.parent_id, arr);
  }

  const memo = new Map<string, number>();
  const visit = (id: string): number => {
    const cached = memo.get(id);
    if (cached !== undefined) return cached;
    let total = direct.get(id) ?? 0;
    for (const child of childrenOf.get(id) ?? []) total += visit(child.id);
    memo.set(id, total);
    return total;
  };
  for (const c of flat) visit(c.id);
  return memo;
}
