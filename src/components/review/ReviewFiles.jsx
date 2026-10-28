import { useState } from 'react';
import { Icon } from '../WorkspaceUI';

function IdChange({ before, after }) {
  const changed = before !== after;
  return <span className={`review-id ${changed ? 'review-id--changed' : ''}`}>{changed && <><span className="review-id-before" title="Original uploaded number">{before}</span><span className="review-id-arrow" aria-hidden="true">→</span></>}<strong title={changed ? 'Adjusted number' : 'Registration number'}>{after}</strong></span>;
}
const hasError = row => Boolean(row.duplicateGroup || row.unmatched);
const matches = (row, filter, query) => (filter === 'all' || (filter === 'errors' ? hasError(row) : filter === 'changed' ? row.changed : !row.changed)) && (!query || [row.before, row.after, ...row.cells].join(' ').toLowerCase().includes(query));

function SheetPreview({ file, sheet, fileIndex, mode, onKeep, filter, query }) {
  const [page, setPage] = useState(0);
  const filtered = sheet.rows.filter(row => matches(row, filter, query));
  const pages = Math.max(1, Math.ceil(filtered.length / 50));
  const currentPage = Math.min(page, pages - 1);
  if (!filtered.length) return null;
  return <div className="review-sheet-block">
    {file.sheets.length > 1 && <h4 className="review-sheet-heading">{sheet.name}</h4>}
    <div className="review-table-scroll" tabIndex={0} aria-label={`${file.name} ${sheet.name} preview table`}>
      <table className="review-table"><thead><tr>{sheet.columns.map((header, index) => <th scope="col" key={index}>{index === 0 && sheet.hasIds ? (mode === 'scores' ? 'Attempt ID → download ID' : 'Original → adjusted ID') : header || `Column ${index + 1}`}</th>)}{sheet.hasIds && <th scope="col">Status</th>}</tr></thead>
        <tbody>{filtered.slice(currentPage * 50, currentPage * 50 + 50).map(row => <tr key={row.key} data-duplicate={Boolean(row.duplicateGroup) || undefined} data-changed={row.changed || undefined} data-unmatched={row.unmatched || undefined}>{sheet.columns.map((_, column) => <td key={column}>{column === 0 && sheet.hasIds ? <IdChange before={row.before} after={row.after} /> : String(row.cells[column] ?? '')}</td>)}{sheet.hasIds && <td>{row.duplicateGroup ? <><strong className="review-duplicate-label">Repeated student</strong><button className="review-button review-button--secondary" onClick={() => onKeep(fileIndex, row.sourceRow, row.duplicateGroup)}>Keep this entry</button></> : <span className="review-status" data-tone={row.unmatched ? 'danger' : mode === 'scores' ? 'success' : row.changed ? 'changed' : 'neutral'}>{row.unmatched ? 'Not found' : mode === 'scores' ? 'Matched' : row.changed ? 'Adjusted' : 'Unchanged'}</span>}{mode === 'scores' && row.changed && <small className="review-cleaned-label">ID cleaned</small>}</td>}</tr>)}</tbody>
      </table>
    </div>
    {filtered.length > 50 && <div className="review-table-pagination"><span>{currentPage * 50 + 1}–{Math.min((currentPage + 1) * 50, filtered.length)} of {filtered.length} rows</span><div><button type="button" aria-label={`Previous rows in ${file.name} ${sheet.name}`} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>←</button><span>{currentPage + 1} / {pages}</span><button type="button" aria-label={`Next rows in ${file.name} ${sheet.name}`} disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>→</button></div></div>}
  </div>;
}

export default function ReviewFiles({ files, mode, onKeep }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const rows = files.flatMap(file => file.sheets.filter(sheet => sheet.hasIds).flatMap(sheet => sheet.rows));
  const query = search.trim().toLowerCase();
  const filters = [['all', 'All', rows.length], ['unchanged', 'Unchanged', rows.filter(row => !row.changed).length], ['changed', 'Changed', rows.filter(row => row.changed).length], ['errors', 'Errors', rows.filter(hasError).length]];
  const visibleFiles = files.map((file, fileIndex) => ({ file, fileIndex, count: file.sheets.reduce((count, sheet) => count + sheet.rows.filter(row => (filter === 'all' || sheet.hasIds) && matches(row, filter, query)).length, 0) })).filter(item => item.count);
  return <section className="review-files" aria-label="Student preview">
    <div className="review-table-toolbar"><div className="review-filter-group" aria-label="Filter preview">{filters.map(([value, label, count]) => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label} {count}</button>)}</div><label className="review-search"><Icon name="search" width="17" height="17" /><input aria-label="Search preview" placeholder="Search names or IDs…" value={search} onChange={event => setSearch(event.target.value)} /></label></div>
    {visibleFiles.map(({ file, fileIndex, count }) => <section className="review-file-block" key={fileIndex} aria-label={file.name}>
      <header className="review-file-heading"><Icon name="document" width="17" height="17" /><h3>{file.name}</h3><span>{count} rows</span></header>
      {file.sheets.map((sheet, index) => (filter === 'all' || sheet.hasIds) && <SheetPreview key={`${index}-${filter}-${query}`} file={file} sheet={sheet} fileIndex={fileIndex} mode={mode} onKeep={onKeep} filter={filter} query={query} />)}
    </section>)}
    {!visibleFiles.length && <div className="review-empty"><strong>No rows match this view</strong><p>Try another search or filter.</p><button type="button" className="review-button review-button--secondary" onClick={() => { setFilter('all'); setSearch(''); }}>Clear filters</button></div>}
  </section>;
}
