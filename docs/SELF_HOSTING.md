# Self-hosting

TaskFloat is single-user and has **no login**. Anyone who can reach the port
can read and change everything. Every setup below works by controlling who
can reach it.

| Setup | Good for | Who can reach it |
|---|---|---|
| [Docker, local](#docker) | Trying it out, one machine | Only `localhost` |
| [+ Tailscale](#tailscale) | Your own devices, including your phone | Your tailnet |
| [+ Cloudflare Tunnel & Access](#cloudflare-tunnel--access) | A public hostname with SSO | Whoever your Access policy allows |
| [Bare metal (systemd)](#bare-metal-systemd) | A Linux box without Docker | Same options as above |

## Docker

```bash
docker compose up -d --build
open http://localhost:5080
```

One container. The database is `/data/db.sqlite` in the `taskfloat-data`
volume. The port is published on `127.0.0.1` only. Change the host port with
`TASKFLOAT_PORT=…`.

- **Upgrade:** `git pull && docker compose up -d --build`. Migrations run on
  startup.
- **Logs:** `docker compose logs -f taskfloat`

## Tailscale

The simplest way to use it from your phone. On the host running TaskFloat:

```bash
tailscale serve --bg 5080        # Docker
tailscale serve --bg 5000        # bare metal
```

Then open `https://<machine>.<tailnet>.ts.net` from any device on your
tailnet, and use "Add to Home Screen" on your phone to install the PWA.
`tailscale serve` handles HTTPS, and the app stays bound to loopback.

Don't use `tailscale funnel`, which makes it public.

## Cloudflare Tunnel + Access

For a real hostname (e.g. `todo.example.com`) protected by SSO:

1. Run the app bound to loopback (Docker as above, or bare metal).
2. Create a tunnel and route the hostname to it. See
   [`ops/cloudflared.config.yml.example`](../ops/cloudflared.config.yml.example);
   point it at `http://127.0.0.1:5080` for Docker or `:5000` for bare metal.
3. In **Zero Trust → Access → Applications**, add a self-hosted app for the
   whole hostname with a policy that allows only your email.
4. For agents calling the API through Access, create a **Service Token** and
   add a Service Auth policy for it. Agents send `CF-Access-Client-Id` and
   `CF-Access-Client-Secret` headers.

When the Access session expires, the PWA clears its cached shell and reloads
so you land back on the Cloudflare login page.

## Bare metal (systemd)

From your machine, against any Linux x86_64 host you can SSH into:

```bash
make deploy REMOTE=<ssh-host>
```

This rsyncs the source, builds release-mode on the host, installs the binary
to `~/.local/bin/taskorg` and the user unit to
`~/.config/systemd/user/taskorg.service`, enables lingering, and restarts the
service. The host needs Rust 1.94+ and Node 20+.

The unit binds `127.0.0.1:5000`. Put Tailscale Serve or a Cloudflare Tunnel in
front, as above. If you'd rather bind `0.0.0.0:5000` and reach it over the
tailnet directly, firewall it to the tailnet interface:

```bash
sudo ufw allow in on tailscale0 to any port 5000
sudo ufw deny  in on eth0       to any port 5000
```

No Tailscale or Cloudflare? An SSH tunnel works too:

```bash
ssh -L 5000:127.0.0.1:5000 <ssh-host>
open http://127.0.0.1:5000
```

## Backups

All state is one SQLite file (`~/.taskorg/db.sqlite` on bare metal,
`/data/db.sqlite` in Docker). A daily copy is enough for most people:

```bash
0 3 * * * sqlite3 ~/.taskorg/db.sqlite ".backup ~/.taskorg/backups/db-$(date +\%F).sqlite"
```

For continuous replication, run [Litestream](https://litestream.io)
alongside it.
