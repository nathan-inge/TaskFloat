#!/usr/bin/env bash
# Rsync source to a remote CloudDesktop, build there, install the binary,
# install/refresh the systemd user unit, restart the service.
#
#   REMOTE=user@taskorg-cd ops/deploy.sh

set -euo pipefail

REMOTE="${REMOTE:-taskorg-cd}"
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo ">> syncing source to $REMOTE"
rsync -az --delete \
  --exclude target \
  --exclude node_modules \
  --exclude 'frontend/dist' \
  --exclude .git \
  "$SRC_DIR/" "$REMOTE:taskorg-src/"

echo ">> building on $REMOTE"
ssh "$REMOTE" 'bash -lc "set -euo pipefail
  cd ~/taskorg-src
  make build
  install -D backend/target/release/taskorg ~/.local/bin/taskorg
  install -D ops/taskorg.service ~/.config/systemd/user/taskorg.service
  mkdir -p ~/.taskorg
  systemctl --user daemon-reload
  systemctl --user enable --now taskorg
  systemctl --user restart taskorg
  loginctl enable-linger $USER 2>/dev/null || true
  systemctl --user status taskorg --no-pager | head -10
"'
echo ">> done"
