import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ListTasksQuery, TaskListResponse } from '../api/types';

export function useTasks(query: ListTasksQuery) {
  const [data, setData] = useState<TaskListResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const key = JSON.stringify(query);

  const refresh = useCallback(async () => {
    try {
      const res = await api.listTasks(query);
      setData(res);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    setLoading(true);
    void refresh();
    const id = setInterval(() => void refresh(), 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { data, error, loading, refresh };
}
