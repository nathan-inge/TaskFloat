import { forceReauth } from '../lib/auth';
import type {
  ApiError,
  Context,
  ContextNode,
  ContextTaskCount,
  CreateContext,
  CreateTask,
  ListTasksQuery,
  Settings,
  Task,
  TaskListResponse,
  UpdateContext,
  UpdateSettings,
  UpdateTask,
} from './types';

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      // Surface Cloudflare Access' 302-to-login as an opaqueredirect instead
      // of silently following into a cross-origin CORS failure.
      redirect: 'manual',
    });
  } catch {
    // Network or cross-origin redirect failure — most likely an expired
    // Access session after the app shell was already loaded from cache.
    return forceReauth();
  }
  if (res.type === 'opaqueredirect') {
    return forceReauth();
  }
  if (!res.ok) {
    let msg = `${method} ${path} ${res.status}`;
    try {
      const err = (await res.json()) as ApiError;
      msg = err.error?.message ?? msg;
    } catch {
      /* keep generic message */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function qs(params: object): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  // Contexts
  listContexts: () => request<Context[]>('GET', '/api/contexts'),
  contextTree: () => request<ContextNode[]>('GET', '/api/contexts/tree'),
  contextTaskCounts: () =>
    request<ContextTaskCount[]>('GET', '/api/contexts/task-counts'),
  createContext: (b: CreateContext) => request<Context>('POST', '/api/contexts', b),
  updateContext: (id: string, b: UpdateContext) =>
    request<Context>('PATCH', `/api/contexts/${id}`, b),
  deleteContext: (id: string) => request<void>('DELETE', `/api/contexts/${id}`),

  // Tasks
  listTasks: (q: ListTasksQuery = {}) =>
    request<TaskListResponse>('GET', `/api/tasks${qs(q)}`),
  getTask: (id: string) => request<Task>('GET', `/api/tasks/${id}`),
  createTask: (b: CreateTask) => request<Task>('POST', '/api/tasks', b),
  updateTask: (id: string, b: UpdateTask) =>
    request<Task>('PATCH', `/api/tasks/${id}`, b),
  completeTask: (id: string) => request<Task>('POST', `/api/tasks/${id}/complete`),
  uncompleteTask: (id: string) => request<Task>('POST', `/api/tasks/${id}/uncomplete`),
  deleteTask: (id: string) => request<void>('DELETE', `/api/tasks/${id}`),

  // Settings
  getSettings: () => request<Settings>('GET', '/api/settings'),
  updateSettings: (b: UpdateSettings) => request<Settings>('PUT', '/api/settings', b),
};
