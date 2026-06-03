.PHONY: dev dev-backend dev-frontend build build-frontend build-backend test clean deploy install-service

# Local development: run backend and frontend in separate terminals.
dev-backend:
	cd backend && cargo run

dev-frontend:
	cd frontend && npm run dev

# Production build: bundles the SPA into the Rust binary.
build:
	cd frontend && npm install && npm run build
	cd backend && cargo build --release

build-frontend:
	cd frontend && npm install && npm run build

build-backend:
	cd backend && cargo build --release

test:
	cd backend && cargo test
	cd frontend && npm test --silent --run || true

clean:
	cd backend && cargo clean
	rm -rf frontend/node_modules frontend/dist

# Deploy: rsync source to CloudDesktop, build remotely, restart service.
# Override REMOTE on the command line: make deploy REMOTE=user@taskorg-cd
REMOTE ?= taskorg-cd
deploy:
	rsync -avz --exclude target --exclude node_modules --exclude dist \
		./ $(REMOTE):~/taskorg-src/
	ssh $(REMOTE) 'cd ~/taskorg-src && make build && \
		install -D backend/target/release/taskorg ~/.local/bin/taskorg && \
		systemctl --user restart taskorg'

install-service:
	install -D ops/taskorg.service ~/.config/systemd/user/taskorg.service
	systemctl --user daemon-reload
	systemctl --user enable --now taskorg
	loginctl enable-linger $$USER || true
