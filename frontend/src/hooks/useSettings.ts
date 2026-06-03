import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Settings, UpdateSettings } from '../api/types';

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
    } catch (e) {
      setError(e as Error);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = useCallback(async (patch: UpdateSettings) => {
    const s = await api.updateSettings(patch);
    setSettings(s);
    return s;
  }, []);

  return { settings, error, update, refresh };
}
