# TaskFloat

A single-user, self-hosted task manager that ranks your tasks by **float**:
how much time you have left after doing the work, not how urgent it feels.

```
slack = (due_by − now) − effort
```

A 2-hour task due in 3 hours is more pressing than a 10-minute task due in
an hour. TaskFloat sorts them that way and warns you when today's urgent work
won't fit in what's left of your workday.

Ships as one ~7 MB Rust binary (SPA embedded) + one SQLite file.

## Features

**Prioritization**
- Tasks sort by slack time. Anything with no slack left gets an
  `🚨 Overdue Buffer` badge.
- Capacity warning when the effort of urgent tasks (≤ 24h of slack) exceeds
  the hours left in your workday.
- Due-date shortcuts: end of workday, end of day, end of work week, end of
  week.

**Organization**
- Nested contexts, GTD-style (`Work › Project X`, `Home › Errands`), each with
  a color and an emoji icon, plus open-task counts per context.
- Pick a current context and the dashboard shows it, either with all of its
  sub-contexts or on its own.
- Nested tasks to any depth. Each subtask has its own effort, due date,
  context, and slack, and parents show `done/total` progress.
- Free-text notes on every task.

**Everywhere**
- Mobile-first installable PWA with a quick-capture screen.
- REST API with a published OpenAPI spec, built so agents can capture tasks
  and summarize your week. The app itself contains no LLM.

## Run it

```bash
docker compose up -d --build
open http://localhost:5080
```

TaskFloat has **no login**. It's single-user by design and expects a network
boundary in front of it: Tailscale, Cloudflare Access, or an auth proxy. See
**[docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md)** for Docker, Tailscale,
Cloudflare, and bare-metal (systemd) setups.

## Docs

| | |
|---|---|
| [Concepts](./docs/CONCEPTS.md) | Slack time, capacity, and how nested tasks behave |
| [Self-hosting](./docs/SELF_HOSTING.md) | Docker, Tailscale, Cloudflare Tunnel + Access, systemd deploy, backups |
| [API](./docs/API.md) | REST endpoints and examples for agents |
| [Development](./docs/DEVELOPMENT.md) | Local dev setup, make targets, macOS port 5000 gotcha |

## Stack

| Layer    | Choice                                                       |
| -------- | ------------------------------------------------------------ |
| Backend  | Rust, `axum`, `sqlx` (SQLite, WAL), `tokio`, `utoipa`        |
| Frontend | React 18, Vite, TypeScript, Tailwind, React Router, vite-pwa |
| Auth     | None built in; use a network boundary (see self-hosting)     |

## License

[MIT](./LICENSE)
