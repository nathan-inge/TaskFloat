# REST API

The UI and agents use the same REST surface under `/api`. The OpenAPI 3 spec
is published at `/api/openapi.json`, so you can point a tool-use agent straight
at it.

There's no auth at this layer. Whatever sits in front of the app (Tailscale,
Cloudflare Access, a proxy) controls who can reach it. An agent calling
through Cloudflare Access needs a service token (see
[SELF_HOSTING.md](./SELF_HOSTING.md)).

## Endpoints

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/health` | Liveness |
| `GET` `POST` | `/api/contexts` | Flat list / create |
| `GET` | `/api/contexts/tree` | Nested tree |
| `GET` | `/api/contexts/task-counts` | Open-task counts per context |
| `PATCH` `DELETE` | `/api/contexts/{id}` | |
| `GET` `POST` | `/api/tasks` | List (sorted by slack time, with `capacity_warning`) / create |
| `GET` `PATCH` `DELETE` | `/api/tasks/{id}` | Delete removes the subtree |
| `POST` | `/api/tasks/{id}/complete` `…/uncomplete` | |
| `GET` `PUT` | `/api/settings` | Workday, capacity, current context |

`GET /api/tasks` query parameters: `context_id`, `include_descendants`,
`include_completed`, `completed_after`, `completed_before` (RFC 3339).

## Examples

```bash
BASE=http://localhost:5080

# Tree of contexts
curl $BASE/api/contexts/tree

# Create a task ("call mom tomorrow at 5pm")
curl -X POST $BASE/api/tasks \
  -H 'content-type: application/json' \
  -d '{"title":"call mom","effort_minutes":15,"context_id":"<uuid>","due_by":"2026-06-04T17:00:00Z"}'

# Add a subtask under an existing task
curl -X POST $BASE/api/tasks \
  -H 'content-type: application/json' \
  -d '{"title":"book flights","effort_minutes":30,"context_id":"<uuid>","parent_id":"<task-uuid>"}'

# Promote a subtask back to the top level (explicit null; omit the field to leave it alone)
curl -X PATCH $BASE/api/tasks/<task-uuid> \
  -H 'content-type: application/json' -d '{"parent_id":null}'

# Defer a task until Monday morning
curl -X PATCH $BASE/api/tasks/<task-uuid> \
  -H 'content-type: application/json' -d '{"available_from":"2026-06-08T08:00:00Z"}'

# This week's completed tasks (drives weekly summaries)
curl "$BASE/api/tasks?include_completed=true&completed_after=2026-05-28T00:00:00Z"

# Set a 6-hour, 10:00–18:00 workday
curl -X PUT $BASE/api/settings \
  -H 'content-type: application/json' \
  -d '{"daily_capacity_hrs":6,"workday_start":"10:00","workday_end":"18:00"}'
```
