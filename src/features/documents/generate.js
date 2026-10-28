import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import html2pdf from 'html2pdf.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { generateRosterPdfHtml, generateLoginPdfHtml } from './templates.js';

export async function readRegistrationFiles(files) {
  const mapped = await Promise.all(Array.from(files).map(async file => {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: true });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
    const headers = (rows[0] || []).map(value => String(value ?? '').toLowerCase().trim());
    if (['regnum', 'name', 'email', 'mobile', 'date', 'time'].some((header, index) => headers[index] !== header)) {
      throw new Error(`Invalid format in ${file.name}. Expected: RegNum, Name, Email, Mobile, Date, Time`);
    }
    const data = rows.slice(1).map(row => Object.fromEntries(['RegNum', 'Name', 'Email', 'Mobile', 'Date', 'Time'].map((key, index) => [key, row[index]]))).filter(row => row.RegNum && row.Name);
    return { file, fileName: file.name, count: data.length, locationName: '', data };
  }));
  return mapped.sort((a, b) => a.count - b.count);
}

export async function readTokenFile(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', raw: true });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
  const headers = (rows[1] || []).map(value => String(value ?? '').toLowerCase().trim());
  if (headers[0] !== 'login' || headers[1] !== 'portal password') throw new Error('Expected row 2 columns: Login, Portal Password');
  return { file, fileName: file.name, data: rows.slice(2).map(row => ({ Login: row[0], Password: row[1] })).filter(row => row.Login && row.Password) };
}

export async function buildRosterArchive(mappedFiles, tokens) {
  // Data Matching Logic
  let allStudents = [];
  for (const mapped of mappedFiles) {
    for (const row of mapped.data) {
      if (row.RegNum && row.Name) {
        allStudents.push({
          regNum: row.RegNum.toString().trim(),
          name: row.Name.toString().trim(),
          email: (row.Email || '').toString().trim(),
          mobile: (row.Mobile || '').toString().trim(),
          date: (row.Date || mapped.fileName.replace('.xlsx', '').replace('.xls', '')).toString().trim(),
          time: (row.Time || 'Unknown Time').toString().trim(),
          location: mapped.locationName
        });
      }
    }
  }

  let unmatched = [];
  let locationGroups = {};
  
  for (const student of allStudents) {
    let username = student.regNum; // Default if no token
    let password = '';
    
    const tRow = tokens.find(t => t.Login && t.Login.toString().trim() === student.regNum.toString().trim());

    if (tRow) {
      username = tRow.Login.toString().trim();
      password = (tRow.Password || '').toString().trim();
    } else {
      unmatched.push(student.regNum);
    }

    const loc = student.location;
    const time = student.time;

    if (!locationGroups[loc]) locationGroups[loc] = {};
    if (!locationGroups[loc][time]) locationGroups[loc][time] = [];

    locationGroups[loc][time].push({
      'Reg num': student.regNum,
      'Name': student.name,
      'Mobile': student.mobile,
      'Date': student.date,
      'Location': loc,
      'Time': time,
      'Username': username,
      'Password': password
    });
  }

  if (Object.keys(locationGroups).length === 0) {
    throw new Error('Zero matches found. Cannot generate tables.');
  }

  const zip = new JSZip();

  for (const loc of Object.keys(locationGroups)) {
    const timeGroups = locationGroups[loc];
    const wb = new ExcelJS.Workbook();
    
    for (const time of Object.keys(timeGroups)) {
      const students = timeGroups[time];
      students.sort((a, b) => a.Name.localeCompare(b.Name));
      
      let safeSheetName = String(time).replace(/[\\/?*[\]:]/g, '-').substring(0, 31);
      if (!safeSheetName) safeSheetName = 'Sheet ' + (wb.worksheets.length + 1);
      
      const ws = wb.addWorksheet(safeSheetName);
      
      // Add Headers
      ws.columns = [
        { header: '#', key: 'index', width: 5 },
        { header: 'Reg num', key: 'Reg num', width: 15 },
        { header: 'Name', key: 'Name', width: 35 },
        { header: 'Mobile', key: 'Mobile', width: 15 },
        { header: 'Date', key: 'Date', width: 10 },
        { header: 'Time', key: 'Time', width: 15 },
        { header: 'Location', key: 'Location', width: 15 },
        { header: 'Username', key: 'Username', width: 15 },
        { header: 'Password', key: 'Password', width: 15 }
      ];

      // Format Header Row
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Add Data
      students.forEach((s, idx) => {
        const row = ws.addRow({ index: idx + 1, ...s });
        row.alignment = { vertical: 'middle', horizontal: 'center' };
        // Zebra Striping
        if ((idx + 2) % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD2E6FA' } };
        } else {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F8FC' } };
        }
      });

      // Add Borders
      ws.eachRow({ includeEmpty: false }, function(row) {
        row.eachCell({ includeEmpty: false }, function(cell) {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    }

    const safeLocName = loc.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Write Excel Buffer
    const excelBuffer = await wb.xlsx.writeBuffer();
    zip.file(`CEPT_Table_${safeLocName}.xlsx`, excelBuffer);

    // Render PDF HTML directly from string
    const pdfHtml = generateRosterPdfHtml(timeGroups);
    const pdfBlob = await html2pdf().from(pdfHtml).set({
      margin: 0,
      filename: `CEPT_Table_${safeLocName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    }).outputPdf('blob');
    
    zip.file(`CEPT_Table_${safeLocName}.pdf`, pdfBlob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { blob: zipBlob, unmatched, totalProcessed: allStudents.length, locationsCount: Object.keys(locationGroups).length };
}

export async function buildLoginArchive(ceptTableFiles) {
  let allStudents = [];
  
  for (const file of ceptTableFiles) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    for (const sheetName of workbook.SheetNames) {
      const ws = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(ws);
      for (const row of rawData) {
         if (row['Reg num'] && row['Name']) {
           allStudents.push(row);
         }
      }
    }
  }

  if (allStudents.length === 0) throw new Error("No students found in the provided CEPT tables.");

  return buildLoginArchiveFromStudents(allStudents);
}

export async function buildLoginArchiveFromStudents(allStudents) {
  if (!allStudents.length) throw new Error("Select at least one student.");
  const zip = new JSZip();
  const locationGroups = {};
  allStudents.forEach(s => {
    const loc = s.Location || 'Unknown';
    if (!locationGroups[loc]) locationGroups[loc] = [];
    locationGroups[loc].push(s);
  });

  for (const loc of Object.keys(locationGroups)) {
    const studentsInLoc = locationGroups[loc];
    
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px';
    document.body.appendChild(container);

    try {
    for (let i = 0; i < studentsInLoc.length; i++) {
      const student = studentsInLoc[i];
      
      container.innerHTML = generateLoginPdfHtml([student]);
      const element = container.querySelector('.page');
      
      await document.fonts.ready;
      await Promise.all(Array.from(element.querySelectorAll('img')).map(image => image.decode()));
      
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        windowWidth: 794,
        width: 794,
        height: 1123
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      
      if (i > 0) doc.addPage();
      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    }
    
    } finally { container.remove(); }
    
    const pdfBlob = doc.output('blob');
    const safeLocName = loc.replace(/[^a-zA-Z0-9_-]/g, '_');
    zip.file(`${safeLocName}_Login_Information.pdf`, pdfBlob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { blob: zipBlob, successCount: Object.keys(locationGroups).length, totalStudents: allStudents.length };
}
