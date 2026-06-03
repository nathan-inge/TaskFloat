# Contextual Task Organizer

Single-user, self-hosted task manager. GTD-style nested contexts plus a **Slack Time**
prioritization formula — tasks sort by real execution math, not arbitrary urgency.

```
ST = (due_by − now) − effort_required
```

Tasks with `ST ≤ 0` get a `🚨 Overdue Buffer` badge. When the sum of effort across
urgent tasks (ST ≤ 24h) exceeds your remaining workday capacity, a capacity warning
appears on the dashboard.

## Architecture (one binary)

- **Rust** backend (`axum` + `sqlx` over **SQLite**).
- **React + Vite + TypeScript** frontend, mobile-first with Tailwind + PWA.
- The frontend is built once and **embedded into the Rust binary** via `rust-embed`.
- Result: one 7 MB binary, one SQLite file at `~/.taskorg/db.sqlite`. No Docker,
  no Postgres, no service mesh.

## Stack

| Layer    | Choice                                                          |
| -------- | --------------------------------------------------------------- |
| Backend  | Rust 1.94+, `axum`, `sqlx` (sqlite), `tokio`, `utoipa`          |
| Database | SQLite (WAL mode, foreign keys on)                              |
| Frontend | React 18, Vite, TypeScript, Tailwind, React Router, vite-pwa    |
| Auth     | None (single-user; security is the Tailscale boundary)          |

## Quickstart — local dev on Mac

Two terminals:

```bash
# 1) backend on :5000
cd backend && cargo run

# 2) frontend dev server on :3000 (proxies /api → :5000)
cd frontend && npm install && npm run dev
```

Open <http://localhost:3000>.

To run the embedded build (no Vite, single binary) locally:

```bash
make build            # builds frontend + bundles into release binary
./backend/target/release/taskorg
```

## Deploy to a Linux CloudDesktop

The intended deploy target is a Linux x86_64 CloudDesktop reachable from your work
laptop and phone over **Tailscale**.

1. Install Tailscale on the CloudDesktop, your Mac, and your phone. Log in to the same
   account. Note the CloudDesktop's MagicDNS name (e.g. `taskorg-cd`).
2. From your Mac:
   ```bash
   REMOTE=user@taskorg-cd ops/deploy.sh
   ```
   This rsyncs the source, builds release-mode on the CloudDesktop, installs the
   binary to `~/.local/bin/taskorg`, drops the systemd unit at
   `~/.config/systemd/user/taskorg.service`, and starts the service.
3. From any tailnet device:
   `http://taskorg-cd:5000` — works on Mac, iPhone, Android, over Wi-Fi or cellular.
4. On the phone, "Add to Home Screen" → the PWA installs as a standalone icon.

### Host firewall (recommended)

App binds to `0.0.0.0:5000` so Tailscale can reach it. Close it to everything else:

```bash
sudo ufw allow in on tailscale0 to any port 5000
sudo ufw deny  in on eth0       to any port 5000
```

### Backup

SQLite is one file. A daily copy is enough:

```bash
0 3 * * * cp ~/.taskorg/db.sqlite ~/.taskorg/backups/db-$(date +\%F).sqlite
```

## SSH-tunnel fallback (if Tailscale isn't available)

```bash
ssh -L 5000:localhost:5000 cloud-desktop
# Then in a browser:
open http://localhost:5000
```

Requires the app to bind on `127.0.0.1:5000` (default). Override via env var if needed.

## REST API for agents

Agents talk to the same REST surface as the UI. The OpenAPI 3 spec is published at
`/api/openapi.json` — point a tool-use agent at it.

Examples:

```bash
# Health
curl http://taskorg-cd:5000/api/health

# Tree of contexts
curl http://taskorg-cd:5000/api/contexts/tree

# Create a task ("call mom tomorrow at 5pm")
curl -X POST http://taskorg-cd:5000/api/tasks \
  -H 'content-type: application/json' \
  -d '{"title":"call mom","effort_minutes":15,"context_id":"<uuid>","due_by":"2026-06-04T17:00:00Z"}'

# This week's completed tasks (drives weekly summaries)
curl 'http://taskorg-cd:5000/api/tasks?include_completed=true&completed_after=2026-05-28T00:00:00Z'
```

NLP parsing ("call mom tomorrow at 5pm" → `{title, due_by, effort_minutes}`) and weekly
summarization both live **agent-side**. The app stays LLM-free.

## Configuration

| Env var        | Default                                     | Notes                                |
| -------------- | ------------------------------------------- | ------------------------------------ |
| `DATABASE_URL` | `sqlite://~/.taskorg/db.sqlite?mode=rwc`   | SQLite URL                           |
| `BIND_ADDR`    | `127.0.0.1:5000`                            | Set to `0.0.0.0:5000` for Tailscale  |
| `RUST_LOG`     | `taskorg=info,tower_http=info`              | Standard `tracing-subscriber` filter |

## Project layout

```
backend/   - Rust + axum + sqlx + utoipa; embeds frontend/dist
frontend/  - React + Vite + Tailwind + PWA
ops/       - systemd unit, deploy script
Makefile   - dev / build / deploy targets
```

## Make targets

| Target                | What it does                                                 |
| --------------------- | ------------------------------------------------------------ |
| `make dev-backend`    | `cargo run` (binds 127.0.0.1:5000)                           |
| `make dev-frontend`   | Vite dev server on :3000 with `/api` proxy                   |
| `make build`          | Build the SPA, then release-build the Rust binary            |
| `make test`           | `cargo test` + (frontend tests if any)                       |
| `make install-service`| Install + enable the systemd unit (run on the CloudDesktop)  |

## Out of scope (MVP)

- Authentication / multi-user
- In-app NLP intake (agents do this)
- In-app LLM weekly digest (agents do this)
- Offline write queue / background sync
- Native mobile app (the PWA is the mobile path)
