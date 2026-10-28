# Concepts

## Slack time

```
ST = (due_by − now) − effort_required
```

Slack time is how long you can put a task off and still finish it by its due
date. Tasks sort by it, smallest first. A task with `ST ≤ 0` gets the
`🚨 Overdue Buffer` badge: you can no longer finish it on time unless you
start right now, or you're already late. Tasks without a due date sort after
everything that has one.

## Capacity warning

Settings hold your workday (`workday_start`, `workday_end`, default
09:00–17:00) and `daily_capacity_hrs` (default 8). When the total effort of
urgent tasks (`ST ≤ 24h`) is more than the workday hours you have left today,
the dashboard shows a capacity warning.

Change these through the API (`PUT /api/settings`, see [API.md](./API.md)).

Known limitation: `workday_end` is currently read as **UTC**, so set it in UTC
if you aren't in UTC.

## Contexts

Contexts form a tree (`Work › Project X › Design`). Every task belongs to
exactly one. The dashboard shows the *current* context, either with all of
its sub-contexts or on its own, and that choice is saved in settings, so
switching devices keeps your place.

## Nested tasks

A task can sit under another task to any depth via `parent_id`. Subtasks are
ordinary tasks with their own effort, due date, context, and slack, so a
subtask can live in a different context than its parent and still sort on
its own merits.

- **Ordering** is per sibling group. Top-level tasks sort by slack time, and
  each parent's children sort by slack time beneath it. Completed subtasks
  sink within their group.
- **Filtering wins over nesting.** If a subtask's parent is filtered out of
  the current view (different context, or the parent is complete and "Show
  completed" is off), the subtask appears at the top level instead of
  disappearing with it.
- **Deleting a parent deletes its whole subtree.** The confirm dialog says how
  many subtasks go with it.
- **Completion doesn't cascade** in either direction. Each task is checked off
  on its own, and a parent shows a `done/total` badge for its direct subtasks.
- **Capacity counts every task's own effort.** If you split a parent's effort
  across its subtasks, set the parent's own effort to what's left, or the
  day's total counts that work twice.
- **No cycles.** The API rejects (`400`) nesting a task under itself or under
  one of its own subtasks.

## Deferred tasks

A task with `available_from` in the future stays hidden from open-task lists
until that time. Use it for things you can't act on yet. It's currently
API-only.

## Why there's no LLM in the app

Natural-language capture ("call mom tomorrow at 5pm") and weekly summaries
are left to agents that talk to the [REST API](./API.md). The app stays
small, deterministic, and doesn't depend on any particular model.
