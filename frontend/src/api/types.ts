// Mirrors backend DTOs in src/models/*.rs. Kept in lockstep manually for MVP;
// codegen from /api/openapi.json is a worthwhile future step.

export interface Task {
  id: string;
  title: string;
  effort_minutes: number;
  context_id: string;
  parent_id: string | null;
  available_from: string | null;
  due_by: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** Direct subtasks, counted server-side (independent of the current filter). */
  subtask_count: number;
  subtask_done_count: number;
}

export interface CreateTask {
  title: string;
  effort_minutes: number;
  context_id: string;
  parent_id?: string | null;
  available_from?: string | null;
  due_by?: string | null;
  notes?: string | null;
}

export interface UpdateTask {
  title?: string;
  effort_minutes?: number;
  context_id?: string;
  /** Omit to leave unchanged; null promotes the task to top level. */
  parent_id?: string | null;
  available_from?: string;
  due_by?: string;
  notes?: string | null;
}

export interface TaskListResponse {
  tasks: Task[];
  capacity_warning: boolean;
}

export interface Context {
  id: string;
  name: string;
  parent_id: string | null;
  color: string;
  icon: string | null;
  created_at: string;
}

export interface ContextNode extends Context {
  children: ContextNode[];
}

export interface CreateContext {
  name: string;
  color?: string;
  icon?: string | null;
  parent_id?: string | null;
}

export interface UpdateContext {
  name?: string;
  color?: string;
  icon?: string | null;
  parent_id?: string | null;
}

export interface ContextTaskCount {
  context_id: string;
  count: number;
}

export interface Settings {
  id: number;
  daily_capacity_hrs: number;
  workday_start: string;
  workday_end: string;
  current_context_id: string | null;
}

export interface UpdateSettings {
  daily_capacity_hrs?: number;
  workday_start?: string;
  workday_end?: string;
  current_context_id?: string | null;
}

export interface ApiError {
  error: { code: string; message: string };
}

export interface ListTasksQuery {
  context_id?: string;
  include_descendants?: boolean;
  include_completed?: boolean;
  completed_after?: string;
  completed_before?: string;
}
