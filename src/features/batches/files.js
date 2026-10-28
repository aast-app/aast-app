import * as XLSX from 'xlsx';
import { validateHeaders } from '../../utils/spreadsheetHeaders.js';
export async function readBatchFiles(files) {
  if (files.reduce((size, file) => size + file.size, 0) > 32 * 1024 * 1024) throw new Error('Choose registration files totaling less than 32 MB.');
  return Promise.all(files.map(async file => {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: true });
    const sheets = workbook.SheetNames.map(name => {
      const sheet = workbook.Sheets[name];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      if (range.e.r > 100000 || range.e.c > 999) throw new Error(`${file.name} contains too many rows or columns.`);
      return { name, rows: XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '', blankrows: true }) };
    });
    validateHeaders(sheets[0]?.rows[0] || [], 'ids');
    return { fileName: file.name, sheets };
  }));
}
