import { useState } from 'react';
function Sheet({ sheet, students }) {
  const [page, setPage] = useState(0);
  const headers = sheet.rows[0] || [];
  const data = sheet.rows.slice(1);
  const width = sheet.rows.reduce((count, row) => Math.max(count, row.length), 1);
  const originals = new Map((students || []).map(student => [student.rowIndex, student.originalRegistrationNumber]));
  const pages = Math.max(1, Math.ceil(data.length / 100));
  return <section className="batch-sheet">
    <h4>{sheet.name}</h4>
    <div className="batch-table-scroll" tabIndex={0} aria-label={`${sheet.name} student data`}>
      <table className="results-table"><thead><tr>{Array.from({ length: width }, (_, index) => <th key={index}>{String(headers[index] ?? '') || `Column ${index + 1}`}</th>)}{students && <th>Original registration</th>}</tr></thead>
        <tbody>{data.slice(page * 100, page * 100 + 100).map((row, index) => <tr key={index}>{Array.from({ length: width }, (_, column) => <td key={column}>{String(row[column] ?? '')}</td>)}{students && <td className="text-muted">{originals.get(page * 100 + index + 1) || ''}</td>}</tr>)}</tbody>
      </table>
    </div>
    {pages > 1 && <div className="batch-pagination"><button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous rows</button><span>Page {page + 1} of {pages}</span><button type="button" disabled={page + 1 >= pages} onClick={() => setPage(value => value + 1)}>Next rows</button></div>}
  </section>;
}
export default function BatchFiles({ files }) {
  return <div className="batch-files">{files.map((file, index) => <section className="batch-file" key={index}>
    <div className="batch-file-heading"><h3>{file.fileName}</h3><span>{file.students.length} {file.students.length === 1 ? 'student' : 'students'}</span></div>
    {file.sheets.map((sheet, sheetIndex) => <Sheet key={`${index}/${sheetIndex}`} sheet={sheet} students={sheetIndex === 0 ? file.students : undefined} />)}
  </section>)}</div>;
}
