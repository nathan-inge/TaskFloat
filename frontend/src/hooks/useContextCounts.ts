import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ContextTaskCount } from '../api/types';

export function useContextCounts(refreshKey: number = 0) {
  const [counts, setCounts] = useState<ContextTaskCount[]>([]);

  const refresh = useCallback(async () => {
    try {
      const c = await api.contextTaskCounts();
      setCounts(c);
    } catch {
      /* swallow; sidebar can render without counts */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, refreshKey]);

  return { counts, refresh };
}
