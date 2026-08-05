import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { getMainWindow } from '../window.js';
import { Log } from '../db/models.js';
import os from 'os';

function generatePdfHtml(students, logoBase64) {
  let htmlPages = [];
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    
    // Cambridge Colors
    const cambridgeBlue = '#3273B6';
    const cambridgeGold = '#9C8D4B';

    const pageHtml = `
      <div class="page">
        <!-- Header Box -->
        <div class="header-box">
          <div class="header-left">
            <div class="title-top" style="color: ${cambridgeGold}">Cambridge English</div>
            <div class="title-bottom" style="color: ${cambridgeBlue}">Placement Test</div>
          </div>
          <div class="header-right">
            <div class="info-row">
              <div class="info-label" style="background-color: ${cambridgeBlue}">Time</div>
              <div class="info-value" style="background-color: ${cambridgeGold}">${student.time}</div>
            </div>
            <div class="info-full" style="background-color: ${cambridgeBlue}">Location</div>
            <div class="info-full" style="background-color: ${cambridgeGold}">${student.location}</div>
          </div>
        </div>

        <!-- Login Instructions -->
        <h2 class="login-title">Candidate Login Information</h2>
        <p class="login-desc">
          You will need the information below in order to start your test<br/>
          Enter this information on the test login screen
        </p>

        <!-- Data Box -->
        <div class="data-box" style="border-color: ${cambridgeBlue}">
          <div class="data-row">
            <div class="bold-col">Test URL</div>
            <div class="val-col url-val">https://www.metritests.com/metrica/EG230.asp</div>
          </div>
          <div class="data-row">
            <div class="bold-col">Username</div>
            <div class="val-col">${student.username}</div>
            <div class="blue-box" style="background-color: ${cambridgeBlue}">Full Name</div>
          </div>
          <div class="data-row">
            <div class="bold-col">Password</div>
            <div class="val-col">${student.password}</div>
            <div class="blue-box italic-box" style="background-color: ${cambridgeBlue}">${student.fullName}</div>
          </div>
          <div class="data-row">
            <div class="bold-col">Institution ID</div>
            <div class="val-col">EG230</div>
          </div>
        </div>

        <!-- Footer Info -->
        <div class="footer-info-container">
          <div class="footer-row">
            <div class="footer-label" style="background-color: ${cambridgeBlue}">Agent</div>
            <div class="footer-val" style="background-color: ${cambridgeBlue}">AASTMT (EG230)</div>
          </div>
          <div class="footer-row">
            <div class="footer-label" style="background-color: ${cambridgeBlue}">Venue</div>
            <div class="footer-val" style="background-color: ${cambridgeBlue}">AASTMT(Abu Qir)</div>
          </div>
          <div class="product-row">
            <span class="product-bold">Product</span> 
            <span class="product-text">CEPT Reading and Listening</span>
          </div>
        </div>

        <!-- Absolute Logo -->
        ${logoBase64 ? `<img src="${logoBase64}" class="bottom-logo" />` : ''}
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
      
      @page {
        margin: 0;
        size: A4 portrait;
      }
      
      body {
        margin: 0;
        padding: 0;
        font-family: Arial, Helvetica, sans-serif;
        background: white;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .page {
        width: 210mm;
        height: 296mm;
        padding: 25mm 20mm;
        box-sizing: border-box;
        page-break-after: always;
        position: relative;
      }

      /* Header Box */
      .header-box {
        display: flex;
        justify-content: space-between;
        border: 1px solid #B0B0B0;
        border-radius: 12px;
        padding: 15px 25px;
        margin-bottom: 40px;
      }

      .header-left {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .title-top {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      .title-bottom {
        font-size: 38px;
        font-weight: bold;
      }

      .header-right {
        display: flex;
        flex-direction: column;
        gap: 5px;
        width: 250px;
        justify-content: center;
      }
      .info-row {
        display: flex;
        gap: 5px;
      }
      .info-label {
        flex: 1;
        color: white;
        text-align: center;
        padding: 6px;
        font-weight: bold;
        font-size: 14px;
      }
      .info-value {
        flex: 2;
        color: white;
        text-align: center;
        padding: 6px;
        font-size: 14px;
      }
      .info-full {
        color: white;
        text-align: center;
        padding: 6px;
        font-weight: bold;
        font-size: 14px;
      }

      /* Login Instructions */
      .login-title {
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 25px;
        color: black;
      }
      .login-desc {
        text-align: center;
        font-size: 18px;
        margin-bottom: 25px;
        color: black;
        line-height: 1.4;
      }

      /* Data Box */
      .data-box {
        border: 1px solid; /* color set inline */
        padding: 25px 30px;
        margin-bottom: 25px;
      }
      .data-row {
        display: flex;
        align-items: center;
        margin-bottom: 25px;
      }
      .data-row:last-child {
        margin-bottom: 0;
      }
      .bold-col {
        width: 100px;
        font-weight: bold;
        color: black;
        font-size: 13px;
        flex-shrink: 0;
      }
      .val-col {
        width: 130px;
        font-weight: bold;
        color: black;
        font-size: 14px;
        flex-shrink: 0;
      }
      .url-val {
        width: auto;
        flex: 1;
      }
      .blue-box {
        flex: 1;
        color: white;
        text-align: center;
        padding: 8px;
        font-size: 13px;
        font-weight: normal;
      }
      .italic-box {
        font-style: italic;
        font-size: 12px;
      }

      /* Footer Info */
      .footer-info-container {
        display: flex;
        flex-direction: column;
        gap: 3px;
        margin-left: 230px; /* Align strictly with blue boxes in flex layout (100 + 130) */
        width: calc(100% - 230px);
      }
      .footer-row {
        display: flex;
        gap: 3px;
      }
      .footer-label {
        width: 60px;
        color: white;
        text-align: left;
        padding: 4px 8px;
        font-size: 10px;
        font-weight: bold;
      }
      .footer-val {
        flex: 1;
        color: white;
        text-align: left;
        padding: 4px 8px;
        font-size: 11px;
      }
      .product-row {
        margin-top: 5px;
        font-size: 10px;
        text-align: left;
      }
      .product-bold {
        font-weight: bold;
        color: black;
      }
      .product-text {
        color: black;
      }
      
      /* Logo */
      .bottom-logo {
        position: absolute;
        bottom: 25mm;
        left: 20mm;
        width: 260px;
        object-fit: contain;
      }
    </style>
  </head>
  <body>
    ${htmlPages.join('')}
  </body>
  </html>
  `;
}

export function registerDocHandlers() {
  ipcMain.handle('preview-pdf-layout', async (event) => {
    try {
      let logoBase64 = '';
      try {
        const logoPath = path.join(process.env.PUBLIC, 'cambridge-logo.png');
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        }
      } catch (e) {
        console.error('Failed to load preview logo:', e);
      }

      const dummyStudent = {
        time: '09:00 - 10:00',
        location: 'Computer Science Lab 406',
        username: 'student123',
        password: 'passwordABC',
        fullName: 'John Doe'
      };
      const html = generatePdfHtml([dummyStudent], logoBase64);
      return { success: true, html };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('generate-documents', async (event, payload) => {
    const { username, ceptTablePaths } = payload;
    
    try {
      if (!ceptTablePaths || ceptTablePaths.length === 0) {
        return { success: false, message: 'No CEPT Table files provided.' };
      }

      let allStudents = [];

      for (const tablePath of ceptTablePaths) {
        if (!fs.existsSync(tablePath)) {
          return { success: false, message: `Could not locate the file: ${path.basename(tablePath)}` };
        }

        // 1. Parse the Excel File
        let fileBuffer;
        try {
          fileBuffer = fs.readFileSync(tablePath);
        } catch (err) {
          return { success: false, message: `Cannot access ${path.basename(tablePath)}. Make sure it is completely closed in Microsoft Excel! Details: ${err.message}` };
        }
        
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json(sheet);
          
          // Push every student from every time-slot tab
          for (const row of rawData) {
            if (row['Reg num']) {
              allStudents.push({
                time: row['Time'] || 'Unknown Time',
                location: row['Location'] || 'Unknown Location',
                username: row['Username'] || row['Reg num'],
                password: row['Password'] || '',
                fullName: row['Name'] || ''
              });
            }
          }
        }
      }

      if (allStudents.length === 0) {
        return { success: false, message: 'No students found in the provided Excel file.' };
      }

      // Load Logo
      let logoBase64 = '';
      try {
        const logoPath = path.join(process.env.PUBLIC, 'cambridge-logo.png');
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        }
      } catch (e) {
        console.error('Failed to load logo for PDF:', e);
      }

      // 2. Group Students by Location
      const locationGroups = {};
      for (const student of allStudents) {
        const loc = student.location || 'Unknown_Location';
        if (!locationGroups[loc]) locationGroups[loc] = [];
        locationGroups[loc].push(student);
      }
      const locations = Object.keys(locationGroups);

      // 3. Prompt User for EXPORT FOLDER BEFORE rendering
      const { canceled, filePaths } = await dialog.showOpenDialog(getMainWindow(), {
        title: 'Select Folder to Save Login PDFs',
        properties: ['openDirectory']
      });

      if (canceled || !filePaths || filePaths.length === 0) {
        return { success: false, message: 'Export canceled by user.' };
      }
      
      const exportDir = filePaths[0];
      let successCount = 0;

      // 4. Native PDF Generation via Electron BrowserWindow (Sequential Loop)
      for (const loc of locations) {
        const studentsInLoc = locationGroups[loc];
        const fullHtml = generatePdfHtml(studentsInLoc, logoBase64);
        
        // Sanitize location name for Windows file paths
        const safeLocName = loc.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '_');
        const filePath = path.join(exportDir, `${safeLocName}_Login_Information.pdf`);

        await new Promise((resolve, reject) => {
          let printWindow = new BrowserWindow({
            show: false,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true
            }
          });

          const tempHtmlPath = path.join(os.tmpdir(), `cept_pdf_${Date.now()}_${Math.random().toString(36).substring(7)}.html`);
          fs.writeFileSync(tempHtmlPath, fullHtml, 'utf8');

          printWindow.loadURL(`file://${tempHtmlPath}`);

          printWindow.webContents.on('did-finish-load', async () => {
            try {
              const pdfBuffer = await printWindow.webContents.printToPDF({
                printBackground: true,
                margins: { marginType: 'none' },
                pageSize: 'A4'
              });

              fs.writeFileSync(filePath, pdfBuffer);
              
              // Clean up
              printWindow.destroy();
              try { fs.unlinkSync(tempHtmlPath); } catch (e) {}
              
              successCount++;
              resolve();
            } catch (pdfErr) {
              if (!printWindow.isDestroyed()) printWindow.destroy();
              try { if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath); } catch (e) {}
              reject(pdfErr);
            }
          });
        });
      }

      // Log operation
      await Log.create({
        username,
        action: 'Documents Generated',
        details: `Generated ${successCount} PDF login files across ${locations.length} locations.`,
        metadata: {
          totalStudents: allStudents.length,
          exportFolder: exportDir
        }
      });

      return { success: true, pdfPath: exportDir };

    } catch (error) {
      console.error("Generate Documents error:", error);
      return { success: false, message: error.message };
    }
  });
}
