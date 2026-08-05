import { ipcMain, dialog } from 'electron';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { execFile } from 'child_process';
import { getMainWindow } from '../window.js';
import { Log } from '../db/models.js';
import os from 'os';
import { BrowserWindow } from 'electron';

function generateRosterPdfHtml(timeGroups) {
  let htmlPages = [];
  const timeKeys = Object.keys(timeGroups);
  
  for (const time of timeKeys) {
    const students = timeGroups[time];
    let rowsHtml = '';
    
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      rowsHtml += `
        <tr>
          <td>${student['Reg num']}</td>
          <td>${student['Name']}</td>
          <td>${student['Mobile']}</td>
          <td>${student['Date']}</td>
          <td>${student['Time']}</td>
          <td>${student['Location']}</td>
          <td>${student['Username']}</td>
          <td>${student['Password']}</td>
        </tr>
      `;
    }
    
    const pageHtml = `
      <div class="page">
        <div class="header">
          <div class="header-left">Arab Academy for Science, Technology<br/>and Maritime Transport</div>
          <div class="header-right">AASTMT-CEPT-IEC</div>
        </div>
        <table>
          <thead>
            <tr>
              <th class="w-reg">Reg num</th>
              <th class="w-name">Name</th>
              <th class="w-mobile">Mobile</th>
              <th class="w-date">Date</th>
              <th class="w-time">Time</th>
              <th class="w-loc">Location</th>
              <th class="w-user">Username</th>
              <th class="w-pass">Password</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
    htmlPages.push(pageHtml);
  }
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Arial:wght@400;700&display=swap');
        @page { margin: 15mm; size: A4 landscape; }
        body { font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0; padding: 0; }
        .page { page-break-after: always; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; font-weight: bold; font-size: 12px; }
        .header-left { width: 50%; }
        .header-right { width: 50%; text-align: center; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; text-align: center; }
        th { background-color: #5B9BD5; color: white; border: 1px solid #1f4e78; padding: 6px 4px; font-weight: bold; }
        td { border: 1px solid #1f4e78; padding: 5px 4px; color: black; }
        tr:nth-child(odd) td { background-color: #EDF4FC; }
        tr:nth-child(even) td { background-color: #DDEBF7; }
        .w-reg { width: 12%; }
        .w-name { width: 25%; }
        .w-mobile { width: 12%; }
        .w-date { width: 9%; }
        .w-time { width: 9%; }
        .w-loc { width: 12%; }
        .w-user { width: 12%; }
        .w-pass { width: 9%; }
      </style>
    </head>
    <body>
      ${htmlPages.join('')}
    </body>
    </html>
  `;
}

export function registerCeptCreateHandlers() {
  
  // New handler to analyze files for the mapping wizard
  ipcMain.handle('analyze-student-files', async (event, payload) => {
    try {
      const { filePaths } = payload;
      if (!filePaths || filePaths.length === 0) return { success: false, message: 'No files provided.' };
      
      const results = await Promise.all(filePaths.map(async (filePath) => {
        try {
          if (!fs.existsSync(filePath)) return null;
          
          const studentBuffer = await fs.promises.readFile(filePath);
          
          const studentWorkbook = XLSX.read(studentBuffer, { 
            type: "buffer",
            cellStyles: false,
            cellFormula: false,
            cellNF: false,
            sheetStubs: false 
          });
          
          const studentSheetName = studentWorkbook.SheetNames[0];
          const studentSheet = studentWorkbook.Sheets[studentSheetName];
          const studentRawData = XLSX.utils.sheet_to_json(studentSheet, { header: 1 });
          
          let count = 0;
          for (let i = 1; i < studentRawData.length; i++) {
            const row = studentRawData[i];
            if (row && row.length > 0 && row[0]) count++; // Count valid Reg Num rows
          }
          
          return {
            filePath,
            fileName: path.basename(filePath),
            count,
            locationName: '' // Unmapped by default
          };
        } catch(e) {
          console.error("Error analyzing file:", filePath, e);
          return null;
        }
      }));

      return { success: true, files: results.filter(r => r !== null) };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  // Helper to smartly truncate long names to keep them on one line
  const truncateName = (fullName, maxChars = 25) => {
    if (!fullName || fullName.length <= maxChars) return fullName;
    const truncated = fullName.substring(0, maxChars + 1);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 0) {
      return truncated.substring(0, lastSpace).trim();
    }
    return fullName.substring(0, maxChars).trim();
  };

  ipcMain.handle('generate-cept-table', async (event, payload) => {
    const { username, mappedFiles, tokenFilePath } = payload;
    
    try {
      if (!mappedFiles || mappedFiles.length === 0 || !fs.existsSync(tokenFilePath)) {
        return { success: false, message: 'One or both of the uploaded files could not be read.' };
      }

      // 1. Read Student Data and attach specific mapped location
      const students = [];
      for (const mapped of mappedFiles) {
        if (!fs.existsSync(mapped.filePath)) continue;
        let studentBuffer;
        try {
          studentBuffer = fs.readFileSync(mapped.filePath);
        } catch (err) {
          throw new Error(`Cannot read Student Data file ${mapped.fileName}. Make sure it is not open in Excel! Details: ${err.message}`);
        }
        const studentWorkbook = XLSX.read(studentBuffer, { type: "buffer" });
        const studentSheetName = studentWorkbook.SheetNames[0];
        const studentSheet = studentWorkbook.Sheets[studentSheetName];
        const studentRawData = XLSX.utils.sheet_to_json(studentSheet, { header: 1 });
        
        for (let i = 1; i < studentRawData.length; i++) {
          const row = studentRawData[i];
          if (!row || row.length === 0 || !row[0]) continue; // Skip empty rows
          
          students.push({
            regNum: String(row[0]).trim(),
            name: truncateName(row[1] || ''),
            mobile: row[3] || '',
            date: row[4] || '',
            time: row[5] || '',
            locationName: mapped.locationName || 'Unknown Location'
          });
        }
      }

      // 2. Read Token Data
      let tokenBuffer;
      try {
        tokenBuffer = fs.readFileSync(tokenFilePath);
      } catch (err) {
        throw new Error(`Cannot read Token Data file. Make sure it is not open in Excel! Details: ${err.message}`);
      }
      const tokenWorkbook = XLSX.read(tokenBuffer, { type: "buffer" });
      const tokenSheetName = tokenWorkbook.SheetNames[0];
      const tokenSheet = tokenWorkbook.Sheets[tokenSheetName];
      const tokenRawData = XLSX.utils.sheet_to_json(tokenSheet, { header: 1 });
      
      const tokens = {};
      for (let i = 2; i < tokenRawData.length; i++) {
        const row = tokenRawData[i];
        if (!row || row.length === 0 || !row[0]) continue;
        
        const login = String(row[0]).trim();
        const password = row[1] || '';
        tokens[login] = password;
      }

      // 3. Match, Merge, and Group by LOCATION -> TIME
      const locationGroups = {};
      const unmatched = [];
      let totalProcessed = 0;

      for (const student of students) {
        const password = tokens[student.regNum];
        
        if (!password) {
          unmatched.push(student.regNum);
          continue;
        }

        const loc = student.locationName;
        const time = student.time || 'Unknown Time';

        if (!locationGroups[loc]) {
          locationGroups[loc] = {};
        }
        if (!locationGroups[loc][time]) {
          locationGroups[loc][time] = [];
        }

        locationGroups[loc][time].push({
          'Reg num': student.regNum,
          'Name': student.name,
          'Mobile': student.mobile,
          'Date': student.date,
          'Location': loc,
          'Time': time,
          'Username': student.regNum,
          'Password': password
        });
        
        totalProcessed++;
      }

      if (Object.keys(locationGroups).length === 0) {
        return { success: false, message: 'Zero matches found between Student RegNums and Token Logins. Cannot generate tables.' };
      }

      // 4. Prompt user to select EXPORT FOLDER
      const { canceled, filePaths: exportPaths } = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Select Export Directory',
        properties: ['openDirectory']
      });

      if (canceled || exportPaths.length === 0) {
        return { success: false, message: 'Export canceled by user.' };
      }
      const exportDir = exportPaths[0];

      // 5. Generate Files per Location
      for (const loc of Object.keys(locationGroups)) {
        const timeGroups = locationGroups[loc];
        
        // Build Excel Workbook for this location
        const wb = XLSX.utils.book_new();
        const timeKeys = Object.keys(timeGroups);
        
        for (const time of timeKeys) {
          timeGroups[time].sort((a, b) => {
            if (a.Name < b.Name) return -1;
            if (a.Name > b.Name) return 1;
            return 0;
          });

          const numberedData = timeGroups[time].map((student, index) => {
            return {
              '#': index + 1,
              ...student
            };
          });

          const ws = XLSX.utils.json_to_sheet(numberedData);
          ws['!cols'] = [
            { wch: 5 }, { wch: 15 }, { wch: 35 }, { wch: 15 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 15 }
          ];
          
          let safeSheetName = String(time).replace(/[\\/?*\[\]:]/g, '-').substring(0, 31);
          if (!safeSheetName || safeSheetName === 'Unknown Time') safeSheetName = 'Sheet ' + (wb.SheetNames.length + 1);
          XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
        }

        const safeLocName = loc.replace(/[^a-zA-Z0-9_-]/g, '_');
        const excelPath = path.join(exportDir, `CEPT_Table_${safeLocName}.xlsx`);
        const pdfPath = path.join(exportDir, `CEPT_Table_${safeLocName}.pdf`);

        try {
          // Write Excel
          const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
          fs.writeFileSync(excelPath, buffer);
          
          // Format Excel via VBScript
          const vbsCode = `
Set objArgs = WScript.Arguments
If objArgs.Count = 0 Then WScript.Quit 1
filePath = objArgs(0)
On Error Resume Next
Set objExcel = CreateObject("Excel.Application")
objExcel.Visible = False
objExcel.DisplayAlerts = False
Set objWorkbook = objExcel.Workbooks.Open(filePath)
If Err.Number <> 0 Then WScript.Quit 2
For Each objWorksheet In objWorkbook.Worksheets
    Set objRange = objWorksheet.UsedRange
    If objRange.Rows.Count > 1 Then
        Set objHeader = objWorksheet.Range(objWorksheet.Cells(1, 1), objWorksheet.Cells(1, objRange.Columns.Count))
        objHeader.Interior.Color = RGB(68, 114, 196)
        objHeader.Font.Color = RGB(255, 255, 255)
        objHeader.Font.Bold = True
        objHeader.HorizontalAlignment = -4108
        objHeader.VerticalAlignment = -4108
        objHeader.AutoFilter 1
        For i = 2 To objRange.Rows.Count
            Set objRow = objWorksheet.Range(objWorksheet.Cells(i, 1), objWorksheet.Cells(i, objRange.Columns.Count))
            objRow.HorizontalAlignment = -4108
            objRow.VerticalAlignment = -4108
            If i Mod 2 = 0 Then
                objRow.Interior.Color = RGB(210, 230, 250)
            Else
                objRow.Interior.Color = RGB(242, 248, 252)
            End If
        Next
        objRange.Borders.LineStyle = 1
        objRange.Borders.Weight = 2
        objRange.Borders.Color = RGB(0, 0, 0)
        objRange.Columns.AutoFit
    End If
Next
objWorkbook.Save
objWorkbook.Close True
objExcel.Quit
`;
          const tempVbsPath = path.join(os.tmpdir(), `format_excel_temp_${Date.now()}.vbs`);
          fs.writeFileSync(tempVbsPath, vbsCode);
          await new Promise((resolve) => {
            execFile('cscript.exe', ['//NoLogo', tempVbsPath, excelPath], () => { resolve(); });
          });
          try { fs.unlinkSync(tempVbsPath); } catch (e) {}

          // Generate PDF
          const pdfHtml = generateRosterPdfHtml(timeGroups);
          const tempHtmlPath = path.join(os.tmpdir(), `roster_pdf_${Date.now()}.html`);
          fs.writeFileSync(tempHtmlPath, pdfHtml, 'utf8');

          await new Promise((resolve) => {
            let printWindow = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
            printWindow.loadURL(`file://${tempHtmlPath}`);
            printWindow.webContents.on('did-finish-load', async () => {
              try {
                const pdfBuffer = await printWindow.webContents.printToPDF({
                  printBackground: true, landscape: true, margins: { marginType: 'none' }, pageSize: 'A4'
                });
                fs.writeFileSync(pdfPath, pdfBuffer);
              } catch (e) {
                console.error("PDF Print error:", e);
              } finally {
                if (!printWindow.isDestroyed()) printWindow.destroy();
                try { fs.unlinkSync(tempHtmlPath); } catch (e) {}
                resolve();
              }
            });
          });

        } catch (writeErr) {
          throw new Error(`Failed to save files for location ${loc}. Details: ${writeErr.message}`);
        }
      }

      // 6. Log the successful operation
      await Log.create({
        username,
        action: 'Table Created',
        details: `Generated CEPT tables/PDFs for ${Object.keys(locationGroups).length} locations. Processed ${totalProcessed} students.`,
        metadata: {
          locations: Object.keys(locationGroups),
          totalProcessed: totalProcessed,
          unmatchedCount: unmatched.length,
          unmatchedRegNums: unmatched
        }
      });

      return { 
        success: true, 
        message: 'Table generated successfully.',
        unmatched: unmatched 
      };

    } catch (error) {
      console.error("Generate CEPT Table error:", error);
      await Log.create({ 
        username, 
        action: 'Error', 
        details: 'Failed to generate CEPT table', 
        metadata: { error: error.message } 
      });
      return { success: false, message: error.message };
    }
  });

  // Helper handler for the frontend to select a file
  ipcMain.handle('select-file', async (event, payload) => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog(getMainWindow(), {
        title: payload?.title || 'Select File',
        properties: payload?.properties || ['openFile'],
        filters: payload?.filters || [{ name: 'All Files', extensions: ['*'] }]
      });

      if (canceled || filePaths.length === 0) {
        return { success: false };
      }

      return { success: true, filePaths: filePaths };
    } catch (err) {
      console.error(err);
      return { success: false, message: err.message };
    }
  });
}
