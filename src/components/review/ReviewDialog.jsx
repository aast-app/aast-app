import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '../WorkspaceUI';

export default function ReviewDialog({ title, eyebrow, date, dateLabel, stage = 'upload', steps, busy, onClose, footer, children }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  void steps;
  return createPortal(<dialog ref={ref} className="review-dialog" data-stage={stage} aria-labelledby={titleId} aria-busy={busy || undefined}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={event => {
      if (event.target !== ref.current || busy || stage === 'review') return;
      const rect = ref.current.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
    <header className="review-header">
      <div className="review-heading"><span className="review-heading-icon"><Icon name={eyebrow === 'REGISTRATIONS' ? 'people' : 'activity'} width="24" height="24" /></span><div><p className="review-eyebrow">CEPT DATA / {eyebrow}</p><h2 id={titleId}>{title}</h2></div></div>
      <div className="review-header-tools"><time dateTime={date}><Icon name="calendar" width="16" height="16" />{dateLabel}</time><button type="button" className="review-icon-button" aria-label="Close review" disabled={busy} onClick={onClose}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div>
    </header>

    <div className="review-body">{children}</div>
    <footer className="review-footer">{footer}</footer>
  </dialog>, document.body);
}

export function ReviewMetrics({ items }) {
  return <div className="review-metrics">{items.map(item => <div className="review-metric" data-tone={item.tone || 'neutral'} key={item.label}><span>{item.label}</span><strong>{item.value.toLocaleString()}</strong>{item.detail && <small>{item.detail}</small>}</div>)}</div>;
}
export function ReviewNotice({ children, tone = 'info' }) {
  return <div className="review-notice" data-tone={tone}><span aria-hidden="true">{tone === 'warning' ? '!' : 'i'}</span><p>{children}</p></div>;
}
export function ReviewError({ message }) { return message ? <div className="review-error" role="alert"><strong>We couldn’t complete that step.</strong><span>{message}</span></div> : null; }
export function ReviewBusy({ title, children }) { return <div className="review-busy" role="status"><span className="review-spinner" /><h3>{title}</h3><p>{children}</p></div>; }
export function ReviewSuccess({ title, children }) { return <div className="review-success" role="status"><span className="review-success-icon" aria-hidden="true">✓</span><p className="review-eyebrow">ALL SET</p><h3>{title}</h3><p>{children}</p></div>; }
