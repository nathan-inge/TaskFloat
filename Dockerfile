# syntax=docker/dockerfile:1
#
# Single-image build: SPA → embedded into the Rust binary → slim runtime.
#   docker build -t taskfloat .

FROM node:20-bookworm-slim AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM rust:1.94-slim-bookworm AS backend
WORKDIR /src/backend
COPY backend/ ./
COPY --from=frontend /src/frontend/dist /src/frontend/dist
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/src/backend/target \
    cargo build --release --locked \
    && cp target/release/taskorg /usr/local/bin/taskorg

FROM debian:bookworm-slim
RUN useradd --system --uid 10001 --home-dir /data taskfloat \
    && mkdir -p /data && chown taskfloat /data
COPY --from=backend /usr/local/bin/taskorg /usr/local/bin/taskorg
USER taskfloat
ENV DATABASE_URL=sqlite:///data/db.sqlite?mode=rwc \
    BIND_ADDR=0.0.0.0:5000 \
    RUST_LOG=taskorg=info,tower_http=info
VOLUME /data
EXPOSE 5000
ENTRYPOINT ["/usr/local/bin/taskorg"]
