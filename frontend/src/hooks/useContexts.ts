import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Context } from '../api/types';

export function useContexts() {
  const [contexts, setContexts] = useState<Context[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const cs = await api.listContexts();
      setContexts(cs);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { contexts, error, loading, refresh };
}
