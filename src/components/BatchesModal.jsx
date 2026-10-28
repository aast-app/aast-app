import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { useApiQuery } from '../hooks/useApiQuery.js';
import { downloadBlob } from '../utils/download.js';
import BatchFiles from '../features/batches/BatchFiles';
import Loader from './Loader';
import { Icon } from './WorkspaceUI';

function BatchDetails({ id, onBack, onChoose }) {
  const { data, error, loading } = useApiQuery('/get-batch', { batchId: id });
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  async function download() {
    setDownloading(true); setDownloadError('');
    try {
      const response = await api.post('/batch-upload', { batchId: id }, { responseType: 'blob' });
      downloadBlob(response.data, 'upload.xlsx');
    } catch (error) {
      let message = error.message;
      if (error.response?.data instanceof Blob) { try { message = JSON.parse(await error.response.data.text()).message; } catch { /* Keep the network error. */ } }
      setDownloadError(message);
    } finally { setDownloading(false); }
  }
  const batch = data?.batch;
  return <>
    <button className="batch-back" onClick={onBack}>← All batches</button>
    {loading ? <Loader /> : error ? <p role="alert">{error}</p> : batch && <>
      <div className="batch-preview-summary"><div><h3>{batch.name}</h3><p>{batch.studentCount} students · {batch.fileCount} files · Exam date {batch.testDate.split('-').reverse().join('-')}</p><p className="text-muted">Saved by {batch.createdBy} · {new Date(batch.createdAt).toLocaleString('en-GB', { timeZone: 'Africa/Cairo' })}</p></div><div className="batch-detail-actions">{onChoose && <button className="batch-download" onClick={() => onChoose(batch)}>Use this batch</button>}<button className="batch-download" disabled={downloading} onClick={download}>{downloading ? 'Preparing file…' : 'Download upload.xlsx'}</button></div></div>
      <p className="batch-download-hint">The download contains only this batch’s adjusted registration numbers, in file and row order, without a header.</p>
      {downloadError && <p role="alert" className="batch-error">{downloadError}</p>}
      <BatchFiles files={batch.files} />
    </>}
  </>;
}
function BatchList({ onSelect }) {
  const [page, setPage] = useState(1);
  const { data, error, loading } = useApiQuery('/list-batches', { page });
  return loading ? <Loader /> : error ? <p role="alert">{error}</p> : <>
    {!data?.batches.length ? <div className="batch-empty"><Icon name="document" width="32" height="32" /><h3>No batches yet</h3><p>Check registrations in CEPT Data, then choose Save batch.</p></div> : <div className="batch-list">{data.batches.map(batch => <button className="batch-list-item" key={batch.id} onClick={() => onSelect(batch.id)}><span className="batch-list-icon" aria-hidden="true"><Icon name="calendar" width="21" height="21" /></span><span className="batch-list-copy"><strong>{batch.name}</strong><span>{batch.studentCount.toLocaleString()} students · {batch.fileCount} {batch.fileCount === 1 ? 'file' : 'files'}</span></span><small>Saved by {batch.createdBy}</small><span className="batch-list-arrow" aria-hidden="true">→</span></button>)}</div>}
    {data?.totalPages > 1 && <div className="batch-pagination"><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page} of {data.totalPages}</span><button disabled={page >= data.totalPages} onClick={() => setPage(value => value + 1)}>Next</button></div>}
  </>;
}
export default function BatchesModal({ onClose, onChoose }) {
  const dialog = useRef(null);
  const [selected, setSelected] = useState(null);
  useEffect(() => { const element = dialog.current; const previous = document.activeElement; const overflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden'; element.showModal(); return () => { element.close(); document.documentElement.style.overflow = overflow; if (previous?.isConnected) previous.focus(); }; }, []);
  return <dialog ref={dialog} className="batch-dialog" aria-labelledby="batches-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <div className="batch-dialog-header"><div><h2 id="batches-title">{onChoose ? "Select a batch" : "Batches"}</h2><p>{selected ? "Review saved students and download their registration numbers." : "Your saved registration groups, newest first."}</p></div><button className="batch-close" aria-label="Close batches" onClick={onClose}>×</button></div>
    <div key={selected || 'list'} className="batch-dialog-body">{selected ? <BatchDetails key={selected} id={selected} onBack={() => setSelected(null)} onChoose={onChoose} /> : <BatchList onSelect={setSelected} />}</div>
  </dialog>;
}
