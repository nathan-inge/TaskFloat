# Development

Prereqs: Rust 1.94+, Node 20+.

## Local dev

Two terminals:

```bash
# 1) backend on 127.0.0.1:5000
cd backend && cargo run

# 2) frontend dev server on :3000 (proxies /api → 127.0.0.1:5000, HMR)
cd frontend && npm install && npm run dev
```

Open <http://localhost:3000>. The database defaults to `~/.taskorg/db.sqlite`.

To run the embedded single-binary build:

```bash
make build
./backend/target/release/taskorg
```

Then open <http://127.0.0.1:5000>, **not** `localhost:5000` (see below).

## macOS: AirPlay squats on port 5000

macOS AirPlay Receiver (`ControlCenter`) listens on `*:5000` over IPv4 and
IPv6. The backend binds `127.0.0.1:5000`, which wins for IPv4 loopback, but
anything that resolves `localhost` to `::1` first (Node, most browsers)
reaches AirPlay instead and gets a bare `403 Forbidden` with
`server: AirTunes/…`.

The Vite proxy already targets `127.0.0.1` for this reason. Because AirPlay's
listener is a wildcard, it also answers `127.0.0.1:5000` whenever the backend
*isn't* running, so a 403 in dev means the backend is down or you reached it
over IPv6:

```bash
lsof -nP -iTCP:5000 -sTCP:LISTEN     # want a `taskorg` row, not just `ControlCe`
curl -si http://127.0.0.1:5000/api/health | head -3
```

Fix it for good with *System Settings → General → AirDrop & Handoff → AirPlay
Receiver → off*. Linux hosts and the Docker image (published on host port
5080) aren't affected.

## Configuration

| Env var        | Default                                   | Notes                                |
| -------------- | ----------------------------------------- | ------------------------------------ |
| `DATABASE_URL` | `sqlite://~/.taskorg/db.sqlite?mode=rwc`  | SQLite URL                           |
| `BIND_ADDR`    | `127.0.0.1:5000`                          | `0.0.0.0:5000` to listen on all interfaces |
| `RUST_LOG`     | `taskorg=info,tower_http=info`            | Standard `tracing-subscriber` filter |

## Layout

```
backend/   Rust + axum + sqlx + utoipa; embeds frontend/dist via rust-embed
frontend/  React + Vite + Tailwind + PWA
ops/       systemd unit, deploy script, cloudflared example
docs/      these docs
```

## Make targets

| Target                 | What it does                                          |
| ---------------------- | ----------------------------------------------------- |
| `make dev-backend`     | `cargo run` (binds 127.0.0.1:5000)                    |
| `make dev-frontend`    | Vite dev server on :3000 with `/api` proxy            |
| `make build`           | Build the SPA, then release-build the Rust binary     |
| `make test`            | `cargo test` + frontend tests if any                  |
| `make deploy REMOTE=…` | Runs `ops/deploy.sh` against an SSH host              |
| `make install-service` | Install + enable the systemd unit (run on the server) |
