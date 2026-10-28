import { useState } from 'react';
import api from '../api';
import { saveBlob } from '../utils/download.js';
import { useApiQuery } from '../hooks/useApiQuery.js';

export default function BackupRecovery({ onClose }) {
  const { data, error: listError } = useApiQuery('/admin-list-backups', {});
  const [passphrase, setPassphrase] = useState('');
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [backup, setBackup] = useState(null);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function run(action) {
    setBusy(true); setMessage('');
    try { await action(); } catch (error) { setMessage(error.response?.data?.message || error.message); }
    finally { setBusy(false); }
  }
  async function download() {
    await run(async () => {
      const { data } = await api.post('/admin-export-db', { mode: 'manual', passphrase });
      if (!data.success) throw new Error(data.message);
      await saveBlob(new Blob([JSON.stringify(data.backup)], { type: 'application/json' }), data.fileName);
      setPassphrase(''); setMessage('Complete encrypted backup downloaded. Keep its passphrase somewhere safe.');
    });
  }
  async function readFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPreview(null); setFileName(''); setMessage('');
    try {
      if (file.size > 45 * 1024 * 1024) throw new Error('Choose a backup smaller than 45 MB.');
      setBackup(JSON.parse(await file.text()));
    } catch (error) { setBackup(null); setMessage(error.message); }
    event.target.value = '';
  }
  async function review() {
    await run(async () => {
      const { data } = await api.post('/admin-preview-backup', { backup: fileName ? undefined : backup, fileName: fileName || undefined, passphrase: restorePassphrase });
      if (!data.success) throw new Error(data.message);
      setPreview(data); setConfirmation('');
    });
  }
  async function restore() {
    await run(async () => {
      const { data } = await api.post('/admin-restore-backup', { restoreToken: preview.restoreToken, confirmation });
      if (!data.success) throw new Error(data.message);
      localStorage.setItem('cept_auth_changed', String(Date.now()));
      window.alert(`${data.message} A safety copy was kept: ${data.safetyFileName}`);
      window.location.reload();
    });
  }
  const names = { user: 'Accounts', student: 'Student records', log: 'Activity entries', dailyOperation: 'Calendar days', dailyMetaData: 'Daily activity records', uploadHistory: 'Upload history', registrationBatch: 'Registration batches' };
  return <div className="cept-modal-overlay" role="presentation">
    <section className="cept-modal-container" role="dialog" aria-modal="true" aria-labelledby="backup-title" style={{ maxWidth: 750, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
      <div className="flex justify-between"><h2 id="backup-title">Backups & recovery</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Close backups">Close</button></div>
      <p>Complete backups include students, accounts, passwords in their protected form, calendar records, activity and upload history. Server settings stay separate.</p>
      <fieldset disabled={busy} style={{ margin: '1rem 0', padding: '1rem' }}>
        <legend>Download a complete backup</legend>
        <p>Choose a passphrase of at least 12 characters. You will need it to restore this file on any server.</p>
        <label>Backup passphrase<input type="password" autoComplete="new-password" minLength={12} maxLength={256} value={passphrase} onChange={event => setPassphrase(event.target.value)} /></label>
        <button className="gradient-btn" type="button" disabled={passphrase.length < 12} onClick={download}>DOWNLOAD ENCRYPTED BACKUP</button>
      </fieldset>
      <fieldset disabled={busy} style={{ margin: '1rem 0', padding: '1rem' }}>
        <legend>Recover from a backup</legend>
        <label>Choose a file<input type="file" accept=".json,application/json" onChange={readFile} /></label>
        {backup && !fileName && <p>Backup file loaded.</p>}
        <label>Or choose a server backup<select value={fileName} onChange={event => { setFileName(event.target.value); setBackup(null); setPreview(null); }}><option value="">Select a server backup</option>{data?.backups.map(file => <option key={file.fileName} value={file.fileName}>{file.fileName}</option>)}</select></label>
        <label>File passphrase (downloaded backups)<input type="password" autoComplete="off" value={restorePassphrase} onChange={event => { setRestorePassphrase(event.target.value); setPreview(null); }} /></label>
        <button className="gradient-btn secondary" type="button" disabled={!fileName && !backup} onClick={review}>PREVIEW RECOVERY</button>
      </fieldset>
      {preview && <div>
        <h3>Review recovery from {new Date(preview.exportDate).toLocaleString()}</h3>
        <table><thead><tr><th>Records</th><th>Now</th><th>After recovery</th></tr></thead><tbody>{Object.entries(names).map(([key, label]) => <tr key={key}><td>{label}</td><td>{preview.currentCounts[key]}</td><td>{preview.counts[key]}</td></tr>)}</tbody></table>
        <p>Recovery replaces all current records with this backup. A complete safety copy is saved first. Everyone will be signed out and must use the accounts and passwords from the restored backup.</p>
        <label>Type RESTORE to confirm<input value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" /></label>
        <button className="gradient-btn" type="button" disabled={busy || confirmation !== 'RESTORE'} onClick={restore}>RESTORE THIS BACKUP</button>
      </div>}
      {(message || listError) && <p role="status">{message || listError}</p>}
      {busy && <p role="status">Working. Please keep this window open…</p>}
    </section>
  </div>;
}
