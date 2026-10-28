import { useRef, useState } from 'react';
import { Icon } from '../WorkspaceUI';

export default function ReviewUpload({ title, description, hint, onFiles, inputLabel }) {
  const input = useRef(null);
  const [dragging, setDragging] = useState(false);
  function select(files) { if (files.length) onFiles(Array.from(files)); }
  return <section className={`review-upload ${dragging ? 'dragging' : ''}`}
    onDragOver={event => { event.preventDefault(); setDragging(true); }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
    onDrop={event => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files); }}>
    <span className="review-upload-icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 16v4h16v-4" /></svg></span>
    <h3>{title}</h3><p>{description}</p>
    <input ref={input} type="file" multiple accept=".xlsx,.xls,.csv" aria-label={inputLabel} onChange={event => { select(event.target.files); event.target.value = ''; }} className="review-hidden-input" />
    <button type="button" className="review-button review-button--primary" onClick={() => input.current.click()} autoFocus><Icon name="document" width="18" height="18" />Choose files</button>
    <small>or drag and drop · XLSX, XLS or CSV · multiple files welcome</small>
    <div className="review-upload-hint">{hint}</div>
  </section>;
}
