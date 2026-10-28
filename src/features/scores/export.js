import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
// Preserve the uploaded workbook and change only registration cells that have a retake suffix.
export async function cleanScoreWorkbook(file) {
  if (/\.xlsx$/i.test(file.file.name)) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.originalBuffer);
    const sheet = workbook.getWorksheet(file.sheetName);
    for (const row of file.rows) if (row.regNumRaw !== row.strippedRegNum) sheet.getCell(row.r + 1, 1).value = row.strippedRegNum;
    return workbook.xlsx.writeBuffer();
  }
  // ExcelJS does not read legacy XLS/CSV; retain all parsed sheets in the XLSX conversion.
  return XLSX.write(file.workbook, { type: 'array', bookType: 'xlsx' });
}
