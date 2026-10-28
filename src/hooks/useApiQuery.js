import { useCallback, useEffect, useState } from 'react';
import api from '../api';

// Stable JSON request keys prevent object identity from refetching on every render.
// Cancel obsolete requests so quick filter changes cannot display stale results.
export function useApiQuery(endpoint, body) {
  const payload = JSON.stringify(body);
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([endpoint, payload, revision]);
  const [result, setResult] = useState({ key: null, data: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    api.post(endpoint, JSON.parse(payload), { signal: controller.signal }).then(({ data }) => {
      if (!data.success) throw new Error(data.message || 'Request failed.');
      if (!controller.signal.aborted) setResult({ key, data, error: null });
    }).catch(error => {
      if (!controller.signal.aborted) setResult(previous => ({ key, data: previous.data, error: error.message }));
    });
    return () => controller.abort();
  }, [endpoint, payload, key]);
  const refresh = useCallback(() => setRevision(value => value + 1), [setRevision]);
  return { data: result.data, error: result.error, loading: result.key !== key, refresh };
}
