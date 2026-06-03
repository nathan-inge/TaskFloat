PRAGMA foreign_keys = ON;

CREATE TABLE contexts (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    parent_id   TEXT REFERENCES contexts(id),
    color       TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    UNIQUE (parent_id, name)
);

CREATE INDEX idx_contexts_parent_id ON contexts(parent_id);

CREATE TABLE tasks (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    effort_minutes  INTEGER NOT NULL,
    context_id      TEXT NOT NULL REFERENCES contexts(id),
    available_from  TEXT,
    due_by          TEXT,
    completed_at    TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
);

CREATE INDEX idx_tasks_context_id ON tasks(context_id);
CREATE INDEX idx_tasks_completed_at ON tasks(completed_at);

CREATE TABLE settings (
    id                  INTEGER PRIMARY KEY CHECK (id = 1),
    daily_capacity_hrs  REAL NOT NULL DEFAULT 8.0,
    workday_start       TEXT NOT NULL DEFAULT '09:00',
    workday_end         TEXT NOT NULL DEFAULT '17:00',
    current_context_id  TEXT REFERENCES contexts(id)
);

INSERT INTO settings (id) VALUES (1);
