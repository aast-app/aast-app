import { useMemo, useState } from 'react';
import api from '../api';
import { useImportDraft } from '../hooks/useImportDraft.js';
import { readBatchFiles } from '../features/batches/files.js';
import ReviewDialog, { ReviewBusy, ReviewError, ReviewSuccess } from './review/ReviewDialog';
import ReviewUpload from './review/ReviewUpload';
import ReviewFiles from './review/ReviewFiles';
import { registrationReviewFiles } from './review/reviewData.js';

export default function IdsModal({ modalData, onClose }) {
  const draft = useImportDraft();
  const [sourceFiles, setSourceFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [savedBatch, setSavedBatch] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const reviewFiles = useMemo(() => preview ? registrationReviewFiles(preview.files) : [], [preview]);
  async function upload(files) {
    setBusy(true); setMessage(''); setPreview(null); draft.prepare(null);
    try {
      const parsed = await readBatchFiles(files);
      setSourceFiles(parsed);
      const { data } = await api.post('/preview-ids', { targetDate: modalData.date, files: parsed });
      if (!data.success) throw new Error(data.message);
      draft.prepare(data.draftId); setPreview(data);
    } catch (error) { setMessage(error.response?.data?.message || error.message); }
    finally { setBusy(false); }
  }
  async function keepEntry(fileIndex, rowIndex, group) {
    setBusy(true); setMessage(''); discard(); draft.prepare(null);
    const removed = new Map();
    preview.files.forEach((file, index) => removed.set(index, new Set(file.students.filter(student => student.duplicateGroup === group && !(index === fileIndex && student.rowIndex === rowIndex)).map(student => student.rowIndex))));
    const files = sourceFiles.map((file, index) => ({ ...file, sheets: file.sheets.map((sheet, sheetIndex) => sheetIndex ? sheet : { ...sheet, rows: sheet.rows.filter((_, row) => !removed.get(index).has(row)) }) })).filter(file => file.sheets[0].rows.slice(1).some(row => row.some(value => String(value).trim())));
    try {
      const { data } = await api.post('/preview-ids', { targetDate: modalData.date, files });
      if (!data.success) throw new Error(data.message);
      setSourceFiles(files); setPreview(data); draft.prepare(data.draftId);
    } catch (error) { setMessage(error.response?.data?.message || error.message); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setMessage('');
    try { setSavedBatch((await draft.commit()).batch); }
    catch (error) { setMessage(`${error.response?.data?.message || error.message} You can retry safely with this preview.`); }
    finally { setBusy(false); }
  }
  function discard() {
    if (!draft.isSaved() && draft.draftId) api.post('/discard-import', { draftId: draft.draftId }).catch(() => {});
  }
  function close() { if (!busy) { discard(); onClose(); } }
  function replace() { discard(); draft.prepare(null); setPreview(null); setMessage(''); }
  const stage = savedBatch ? 'saved' : preview ? 'review' : 'upload';
  return <ReviewDialog title="Check registration IDs" eyebrow="REGISTRATIONS" date={modalData.date} dateLabel={modalData.displayDate} stage={stage} steps={['Upload files', 'Review IDs', 'Save batch']} busy={busy} onClose={close}
    footer={<><span className="review-footer-note"><span aria-hidden="true">{savedBatch ? '✓' : '○'}</span>{savedBatch ? 'Batch and student attempts saved' : 'Preview only · nothing saved yet'}</span><div className="review-footer-actions">{savedBatch ? <button className="review-button review-button--primary" onClick={close}>Done</button> : <><button className="review-button review-button--secondary" disabled={busy} onClick={close}>Cancel</button>{preview && <button className="review-button review-button--primary" disabled={busy || !draft.draftId} onClick={save}>{busy ? 'Saving batch…' : 'Save batch'}<span aria-hidden="true">→</span></button>}</>}</div></>}>
    {busy ? <ReviewBusy title={preview ? 'Saving your batch' : 'Checking registration numbers'}>{preview ? 'Your batch and student attempts are being saved together.' : 'We’re checking existing attempts and keeping your file groups together.'}</ReviewBusy> : savedBatch ? <ReviewSuccess title={`Batch ${savedBatch.name} is ready`}>Your checked students are saved. Find this batch and its upload.xlsx file under Batches in CEPT Create.</ReviewSuccess> : preview ? <>
      <div className="review-section-heading"><div><h3>Review your checked students</h3><p>Adjusted IDs stand out in amber. Compare the original and final number at a glance.</p></div><button type="button" className="review-text-button" onClick={replace}>Choose different files</button></div>
      <p className="review-summary">{preview.processedCount} students · {preview.modifiedCount} adjusted IDs{preview.duplicates?.length ? ` · ${preview.duplicates.length} repeated students — choose “Keep this entry” on the row you want. Other copies will be removed.` : ''}</p>
      <ReviewFiles key={draft.draftId} files={reviewFiles} mode="ids" onKeep={keepEntry} />
    </> : <>
      <ReviewUpload title="Start with your registration files" description="Upload the official student lists for this exam day. We’ll check retakes and show every adjustment before you save." hint="Columns: RegNum · Name · Email · Mobile · Date · Time" inputLabel="Upload registration files" onFiles={upload} />

    </>}
    <ReviewError message={message} />
  </ReviewDialog>;
}
