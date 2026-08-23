-- Nested tasks: a task may hang off another task. Deleting a parent removes its
-- whole subtree (foreign_keys pragma is enabled on every pooled connection).
ALTER TABLE tasks ADD COLUMN parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE;
CREATE INDEX idx_tasks_parent_id ON tasks(parent_id);
