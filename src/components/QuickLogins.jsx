import { useRef, useState } from 'react';
import api from '../api';
import { readTokenFile, buildLoginArchiveFromStudents } from '../features/documents/generate.js';
import { generateLoginPdfHtml } from '../features/documents/templates.js';
import { createDownloadTarget } from '../utils/download.js';

export default function QuickLogins() {
  const input = useRef(null);
  const [tokens, setTokens] = useState([]);
  const [fileName, setFileName] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState(null);
  const [individual, setIndividual] = useState(false);
  const [location, setLocation] = useState('');
  const [time, setTime] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  async function upload(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try {
      if (file.size > 32 * 1024 * 1024) throw new Error('Choose a tokens file smaller than 32 MB.');
      const parsed = await readTokenFile(file);
      const unique = new Map();
      for (const row of parsed.data) {
        const Login = String(row.Login).trim(), Password = String(row.Password).trim();
        if (unique.has(Login) && unique.get(Login).Password !== Password) throw new Error(`Different passwords found for ${Login}. Check the tokens file.`);
        unique.set(Login, { Login, Password });
      }
      if (!unique.size) throw new Error('No login tokens found in this file.');
      const found = new Map();
      const numbers = [...unique.keys()];
      for (let offset = 0; offset < numbers.length; offset += 100) {
        const { data } = await api.post('/login-student-details', { registrationNumbers: numbers.slice(offset, offset + 100) });
        if (!data.success) throw new Error(data.message);
        for (const student of data.students) found.set(student.registrationNumber, student);
      }
      const resolved = [...unique.values()].map(token => ({ ...token, name: found.get(token.Login)?.name || '', found: Boolean(found.get(token.Login)?.name), verified: found.get(token.Login)?.nameVerified, source: found.get(token.Login)?.matchedRegistrationNumber, location: '', time: '' }));
      setTokens(resolved); setFileName(file.name); setSelected(new Set()); setStudents(null); setPreview(false); setSaved(false); setQuery('');
    } catch (failure) { setError(failure.response?.data?.message || failure.message); }
    finally { setBusy(false); }
  }
  function continueSelection() {
    setError(''); setPreview(false); setSaved(false);
    setStudents(tokens.filter(token => selected.has(token.Login)).map(token => ({ ...token })));
  }
  const ready = students?.length && students.every(student => student.name.trim() && (individual ? student.location.trim() && student.time : location.trim() && time));
  const formatTime = value => value ? new Date(`2000-01-01T${value}`).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
  const rows = (students || []).map(student => ({ 'Reg num': student.Login, Name: student.name.trim(), Username: student.Login, Password: student.Password, Location: (individual ? student.location : location).trim(), Time: formatTime(individual ? student.time : time) }));
  function updateStudent(index, field, value) {
    setStudents(previous => previous.map((student, position) => position === index ? { ...student, [field]: value } : student)); setSaved(false);
  }
  async function download() {
    if (!ready) return;
    setBusy(true); setError('');
    try {
      const target = await createDownloadTarget({ suggestedName: 'Quick_Logins.zip', types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }] });
      const result = await buildLoginArchiveFromStudents(rows);
      const writable = await target.createWritable(); await writable.write(result.blob); await writable.close();
      setSaved(true);
      // Logging must not turn a successful local download into an apparent failure.
      api.post('/log-login-pdfs', { successCount: result.successCount, totalStudents: result.totalStudents }).catch(() => {});
    } catch (failure) { if (failure.name !== 'AbortError') setError(failure.message); }
    finally { setBusy(false); }
  }
  const filtered = tokens.filter(token => [token.Login, token.name].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="quick-logins" aria-label="Quick logins">
    <p className="quick-intro">Create a few login slips from existing tokens. No batch or master table needed.</p>
    <input ref={input} type="file" accept=".csv,.xlsx,.xls" aria-label="Quick login tokens" hidden onChange={upload} disabled={busy} />
    <button type="button" className="gradient-btn secondary w-full" disabled={busy} onClick={() => input.current.click()}>{busy ? 'Please wait…' : fileName ? 'Change tokens file' : 'Upload tokens file'}</button>
    {fileName && <p className="quick-file">{fileName} · {tokens.length} tokens</p>}
    {tokens.length > 0 && !students && <>
      <label className="quick-field">Find a name or registration number<input className="modern-input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Include the retake suffix, e.g. 123-R2" /></label>
      <div className="quick-token-list" aria-label="Available login tokens">{filtered.slice(0, 100).map(token => <label key={token.Login}><input type="checkbox" checked={selected.has(token.Login)} disabled={busy || (!selected.has(token.Login) && selected.size >= 100)} onChange={() => setSelected(previous => { const next = new Set(previous); if (next.has(token.Login)) next.delete(token.Login); else next.add(token.Login); return next; })} /><span><strong>{token.Login}</strong><small className="quick-token-name">{token.name || "Not found — enter name after selecting"}</small></span></label>)}{!filtered.length && <p>No matching tokens.</p>}</div>
      {filtered.length > 100 && <p className="quick-help">Showing the first 100 matches. Search to find another registration number.</p>}
      <button className="gradient-btn primary w-full" disabled={!selected.size || busy} onClick={continueSelection}>{busy ? 'Finding students…' : `Continue with ${selected.size} selected`}</button>
    </>}
    <datalist id="quick-login-locations"><option value="CS_lab 404" /><option value="Maritime_lab 232" /></datalist>
    {students && <>
      <div className="quick-section-heading"><strong>{students.length} selected {students.length === 1 ? 'student' : 'students'}</strong><button className="batch-back" disabled={busy} onClick={() => { setTokens(previous => previous.map(token => ({ ...token, ...(students.find(student => student.Login === token.Login) || {}) }))); setStudents(null); setPreview(false); setSaved(false); }}>Change students</button></div>
      <label className="quick-field">Location and time<select className="modern-input" aria-label="Location and time settings" disabled={busy} value={individual ? 'individual' : 'shared'} onChange={event => { const next = event.target.value === 'individual'; if (next) setStudents(previous => previous.map(student => ({ ...student, location: student.location || location, time: student.time || time }))); setIndividual(next); setSaved(false); }}><option value="shared">Same for everyone</option><option value="individual">Set for each student</option></select></label>
      <div className="quick-students">{students.map((student, index) => <div className="quick-student" key={student.Login}><strong>{student.Login}</strong>{student.found ? <><span>{student.name}</span><small>{student.verified ? 'Official name' : 'Name from database'} · {student.source}</small></> : <label className="quick-field">Student name<input className="modern-input" aria-label={`Name for ${student.Login}`} value={student.name} maxLength={200} placeholder="Not found — enter their full name" disabled={busy} onChange={event => { setStudents(previous => previous.map((row, position) => position === index ? { ...row, name: event.target.value } : row)); setPreview(false); setSaved(false); }} /></label>}{individual && <div className="quick-session"><label className="quick-field">Location<input aria-label={`Location for ${student.Login}`} className="modern-input" list="quick-login-locations" value={student.location} maxLength={150} disabled={busy} onChange={event => updateStudent(index, 'location', event.target.value)} /></label><label className="quick-field">Exam time<input aria-label={`Time for ${student.Login}`} className="modern-input" type="time" value={student.time} disabled={busy} onChange={event => updateStudent(index, 'time', event.target.value)} /></label></div>}</div>)}</div>
      {!individual && <div className="quick-session"><label className="quick-field">Location<input className="modern-input" list="quick-login-locations" value={location} maxLength={150} placeholder="Choose or enter a location" disabled={busy} onChange={event => { setLocation(event.target.value); setSaved(false); }} /></label><label className="quick-field">Exam time<input className="modern-input" type="time" value={time} disabled={busy} onChange={event => { setTime(event.target.value); setSaved(false); }} /></label></div>}
      <p className="quick-help">Manual names and session details are used only on these slips.</p>
      <div className="quick-actions"><button className="gradient-btn secondary" disabled={!ready || busy} onClick={() => setPreview(value => !value)}>{preview ? 'Hide preview' : 'Preview slips'}</button><button className="gradient-btn primary" disabled={!ready || busy} onClick={download}>{busy ? 'Creating slips…' : 'Download login slips'}</button></div>
      {preview && ready && <iframe className="quick-preview" title="Quick login slips preview" srcDoc={generateLoginPdfHtml(rows)} />}
      {saved && <p className="quick-success" role="status">Login slips downloaded.</p>}
    </>}
    {error && <p role="alert" className="batch-error">{error}</p>}
  </section>;
}
