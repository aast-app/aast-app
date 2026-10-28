import { useRef, useState } from 'react';
import api from '../api';
export function useImportDraft() {
  const [draftId, setDraftId] = useState(null);
  const saved = useRef(null);
  function prepare(id) { saved.current = null; setDraftId(id); }
  async function commit() {
    if (saved.current) return saved.current;
    if (!draftId) throw new Error('Upload and review the file before saving.');
    const { data } = await api.post('/commit-import', { draftId });
    if (!data.success) throw new Error(data.message);
    saved.current = data;
    return data;
  }
  return { draftId, prepare, commit, isSaved: () => Boolean(saved.current) };
}
