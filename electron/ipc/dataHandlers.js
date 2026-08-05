import { ipcMain, dialog } from 'electron';
import fs from 'node:fs';
import path, { basename } from 'node:path';
import os from 'node:os';
import * as XLSX from 'xlsx';
import { getMainWindow } from '../window.js';
import { Log, DailyOperation, FileLock } from '../db/models.js';

// Module-level state replaces globals
let baseDataMemory = null;
let newDataMemory = null;
let scoresDataMemory = null;

export function registerDataHandlers() {
  
  // Helper: Silent Backup Engine
  const createSilentBackup = async (buffer) => {
    try {
      if (!baseDataMemory || !baseDataMemory.path) return;
      const baseDir = path.dirname(baseDataMemory.path);
      const backupDir = path.join(baseDir, 'Backups', 'Data');
      
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
      const backupPath = path.join(backupDir, `backup_${timestamp}.xlsx`);
      
      fs.writeFileSync(backupPath, buffer);
      console.log(`Silent backup created at: ${backupPath}`);
    } catch (err) {
      console.error("Failed to create silent backup (non-fatal):", err);
    }
  };

  // --- 1. UPLOAD BASE DATA (AUTO-SYNC) ---
  ipcMain.handle('upload-base-data', async (event, payload) => {
    const username = payload && payload.username ? payload.username : 'System';
    try {
      const primaryPath = path.join(os.homedir(), 'OneDrive - Arab Academy for Science and Technology', 'AAST App Database', 'CEPT Group Report.xlsx');
      const secondaryPath = path.join(os.homedir(), 'OneDrive - Arab Academy for Science and Technology', "Youssef Wael Atia's files - AAST App Database", 'CEPT Group Report.xlsx');
      
      let filePath = primaryPath;
      if (!fs.existsSync(primaryPath)) {
        if (fs.existsSync(secondaryPath)) {
          filePath = secondaryPath;
        } else {
          return { success: false, message: `Could not find Master Data file in OneDrive Database. Ensure 'CEPT Group Report.xlsx' exists in either primary or shared folders.` };
        }
      }

      const fileBuffer = fs.readFileSync(filePath);
      baseDataMemory = { path: filePath, data: fileBuffer };
      
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const fileName = basename(filePath);

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:A1");
      let endRow = 13;
      for (let R = range.e.r; R >= 12; --R) {
        const checkCols = ['C', 'D', 'E', 'H', 'I'];
        let hasData = false;
        for (const col of checkCols) {
          const cell = worksheet[col + (R + 1)];
          if (cell && cell.v !== undefined && String(cell.v).trim() !== '') {
            hasData = true;
            break;
          }
        }
        if (hasData) {
          endRow = R + 1;
          break;
        }
      }

      const extractedData = {
        startRow: 13,
        endRow: endRow,
        totalRows: endRow - 12
      };

      return {
        success: true,
        message: `Successfully synced Master Base Data`,
        dataPreview: extractedData
      };
    } catch (error) {
      console.error("Failed to read file:", error);
      return { success: false, message: error.message };
    }
  });

  // --- 2. UPLOAD NEW DATA ---
  ipcMain.handle('upload-new-data', async (event, payload) => {
    const username = payload && payload.username ? payload.username : 'System';
    const { canceled, filePaths } = await dialog.showOpenDialog(getMainWindow(), {
      title: 'Select New Data (.xlsx)',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, message: 'Upload canceled by user.' };
    }

    try {
      const processedFiles = [];
      const tempMemory = [];

      for (const filePath of filePaths) {
        const fileBuffer = fs.readFileSync(filePath);
        const fileName = basename(filePath);
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const getCellValue = (cellAddress) => {
          const cell = worksheet[cellAddress];
          return cell ? (cell.w !== undefined ? String(cell.w).trim() : String(cell.v).trim()) : '';
        };

        // Strict Structure Validation
        const expectedHeaders = {
          'A1': 'RegNum', 'B1': 'Name', 'C1': 'Email', 
          'D1': 'Mobile', 'E1': 'Date', 'F1': 'Time'
        };

        for (const [cell, expectedValue] of Object.entries(expectedHeaders)) {
          const actualValue = getCellValue(cell).toLowerCase();
          if (actualValue !== expectedValue.toLowerCase()) {
            const errorMsg = `INVALID FILE STRUCTURE IN "${fileName}": Column ${cell[0]} must be "${expectedValue}". Please upload correct files.`;
            await Log.create({ username, action: 'Error', details: 'Invalid New Data File', metadata: { error: errorMsg, fileName } });
            return { 
              success: false, 
              message: errorMsg 
            };
          }
        }
        
        tempMemory.push({ path: filePath, fileName, sheetName: firstSheetName, data: fileBuffer });
        processedFiles.push({ fileName });
      }

      // If all files passed validation, save them to memory
      newDataMemory = tempMemory;

      return {
        success: true,
        message: `Extracted ${processedFiles.length} file(s)`,
        count: processedFiles.length
      };
    } catch (error) {
      console.error("Failed to read new file:", error);
      await Log.create({ username, action: 'Error', details: 'New Data Upload failed', metadata: { error: error.message } });
      return { success: false, message: error.message };
    }
  });

  // --- 3. CHECK REGISTRATION NUMBERS ---
  ipcMain.handle('check-registration-numbers', async (event, payload) => {
    const username = payload && payload.username ? payload.username : 'System';
    try {
      if (!baseDataMemory || !newDataMemory || newDataMemory.length === 0) {
        return { success: false, message: "Missing data. Please upload files first." };
      }

      const baseWorkbook = XLSX.read(baseDataMemory.data, { type: "buffer" });
      const baseSheet = baseWorkbook.Sheets[baseWorkbook.SheetNames[0]];
      const baseRange = XLSX.utils.decode_range(baseSheet['!ref'] || "A1:A1");
      
      const baseRegMap = new Map();
      for (let R = 12; R <= baseRange.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ c: 2, r: R });
        const cell = baseSheet[cellAddress];
        if (cell && cell.v !== undefined) {
          const val = String(cell.v).trim();
          if (val !== '') {
            let baseId = val;
            let retake = 0;
            const match = val.match(/^(.*?)-R(\d+)$/i);
            if (match) {
              baseId = match[1];
              retake = parseInt(match[2], 10);
            }
            
            const gradeCell = baseSheet[XLSX.utils.encode_cell({ c: 7, r: R })];
            const hasGrade = Boolean(gradeCell && gradeCell.v !== undefined && String(gradeCell.v).trim() !== '');

            const current = baseRegMap.get(baseId);
            if (!current || retake > current.retake || (retake === current.retake && hasGrade)) {
              baseRegMap.set(baseId, { retake, hasGrade });
            }
          }
        }
      }

      const allTransformedDatasets = [];

      for (const fileMemory of newDataMemory) {
        const newWorkbook = XLSX.read(fileMemory.data, { type: "buffer" });
        const newSheet = newWorkbook.Sheets[newWorkbook.SheetNames[0]];
        const newRange = XLSX.utils.decode_range(newSheet['!ref'] || "A1:A1");

        const finalData = [];
        
        const getCellStr = (sheet, c, r) => {
          const cellAddress = XLSX.utils.encode_cell({ c, r });
          const cell = sheet[cellAddress];
          return cell && cell.v !== undefined ? String(cell.w !== undefined ? cell.w : cell.v).trim() : '';
        };

        for (let R = 1; R <= newRange.e.r; ++R) {
          const regNumRaw = getCellStr(newSheet, 0, R);
          if (regNumRaw === '') continue;

          const name = getCellStr(newSheet, 1, R);
          const email = getCellStr(newSheet, 2, R);
          const mobile = getCellStr(newSheet, 3, R);
          const date = getCellStr(newSheet, 4, R);
          const time = getCellStr(newSheet, 5, R);

          let finalRegNum = regNumRaw;
          let wasModified = false;

          let baseId = regNumRaw;
          const match = regNumRaw.match(/^(.*?)-R(\d+)$/i);
          if (match) {
            baseId = match[1];
          }
          
          let isReused = false;

          if (baseRegMap.has(baseId)) {
            const current = baseRegMap.get(baseId);
            if (current.hasGrade === false) {
              finalRegNum = current.retake === 0 ? baseId : `${baseId}-R${current.retake}`;
              wasModified = (finalRegNum !== regNumRaw);
              isReused = true;
            } else {
              finalRegNum = `${baseId}-R${current.retake + 1}`;
              wasModified = true;
              baseRegMap.set(baseId, { retake: current.retake + 1, hasGrade: false });
            }
          } else {
            baseRegMap.set(baseId, { retake: 0, hasGrade: false });
          }

          finalData.push({
            originalRegNum: regNumRaw,
            regNum: finalRegNum,
            wasModified: wasModified,
            isReused: isReused,
            name: name,
            email: email,
            mobile: mobile,
            date: date,
            time: time
          });
        }
        
        allTransformedDatasets.push({
          fileName: fileMemory.fileName,
          sheetName: fileMemory.sheetName,
          data: finalData
        });
      }

      const totalRecords = allTransformedDatasets.reduce((acc, curr) => acc + curr.data.length, 0);
      await Log.create({
        username,
        action: 'ID Check',
        details: `Verified ${totalRecords} records across ${allTransformedDatasets.length} files.`,
        metadata: {
          totalFilesProcessed: allTransformedDatasets.length,
          totalRecordsProcessed: totalRecords
        }
      });

      return {
        success: true,
        finalData: allTransformedDatasets
      };

    } catch (error) {
      console.error("Check failed:", error);
      await Log.create({ username, action: 'Error', details: 'Check IDs failed', metadata: { error: error.message } });
      return { success: false, message: error.message };
    }
  });

  // --- 4. EXPORT TO EXCEL ---
  ipcMain.handle('export-data', async (event, payload) => {
    const username = payload && payload.username ? payload.username : 'System';
    const data = payload && payload.data ? payload.data : [];
    const isCloud = payload && payload.isCloud ? payload.isCloud : false;
    try {
      let outputDir;

      if (isCloud) {
        if (!baseDataMemory || !baseDataMemory.path) {
          throw new Error("Master Data is not loaded. Cannot determine cloud path.");
        }
        
        // Derive the exact cloud folder from the currently loaded Master File
        const baseDir = path.dirname(baseDataMemory.path);

        const now = new Date();
        const folderName = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
        
        const idsBaseDir = path.join(baseDir, 'IDs');
        if (!fs.existsSync(idsBaseDir)) {
          fs.mkdirSync(idsBaseDir, { recursive: true });
        }

        outputDir = path.join(idsBaseDir, folderName);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Handle rotating folders (max 7)
        let existingFolders = fs.readdirSync(idsBaseDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => ({
            name: dirent.name,
            path: path.join(idsBaseDir, dirent.name),
            time: fs.statSync(path.join(idsBaseDir, dirent.name)).mtime.getTime()
          }))
          .sort((a, b) => a.time - b.time); // Oldest first

        if (existingFolders.length > 7) {
          const foldersToDelete = existingFolders.length - 7;
          for (let i = 0; i < foldersToDelete; i++) {
            fs.rmSync(existingFolders[i].path, { recursive: true, force: true });
          }
        }
      } else {
        // Fall back to the traditional manual folder selection
        const { canceled, filePaths } = await dialog.showOpenDialog(getMainWindow(), {
          title: 'Select Folder to Save Extracted Data',
          properties: ['openDirectory']
        });

        if (canceled || filePaths.length === 0) {
          return { success: false, message: 'Export canceled by user.' };
        }
        outputDir = filePaths[0];
      }

      let successCount = 0;
      let allRegNums = []; // Collect all reg numbers

      // 1. Save extracted files
      for (const dataset of data) {
        const originalMemoryFile = newDataMemory?.find(f => f.fileName === dataset.fileName);
        
        if (!originalMemoryFile) {
          throw new Error(`Could not find original file memory for ${dataset.fileName}`);
        }

        // Read the original workbook to preserve all formatting/columns
        const workbook = XLSX.read(originalMemoryFile.data, { type: "buffer" });
        const sheetName = dataset.sheetName || originalMemoryFile.sheetName || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:A1");
        
        // Build a map of only the IDs that were modified
        const modifiedMap = new Map();
        for (const row of dataset.data) {
          if (row.regNum) {
            allRegNums.push([row.regNum]); // Add to the master upload list
          }
          if (row.wasModified) {
            modifiedMap.set(row.originalRegNum, row.regNum);
          }
        }

        // Modify the original cells in Column A in-place
        for (let R = 1; R <= range.e.r; ++R) {
          const cellAddress = XLSX.utils.encode_cell({ c: 0, r: R }); // Column A
          const cell = worksheet[cellAddress];
          
          if (cell && cell.v !== undefined) {
            const currentVal = String(cell.w !== undefined ? cell.w : cell.v).trim();
            if (modifiedMap.has(currentVal)) {
              cell.v = modifiedMap.get(currentVal);
              cell.t = 's'; // Force string type
              delete cell.w; // Clear formatted text so it regenerates correctly
            }
          }
        }
        
        const originalName = dataset.fileName || 'Data.xlsx';
        const newFileName = originalName.replace(/\.xlsx?$/i, '') + '-Transformed.xlsx';
        const filePath = path.join(outputDir, newFileName);

        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        try {
          fs.writeFileSync(filePath, buffer);
          successCount++;
        } catch (writeErr) {
          if (writeErr.code === 'EBUSY' || writeErr.code === 'EPERM') {
            const errorMsg = `File ${newFileName} is locked. Please close it in Excel and try again.`;
            await Log.create({ username, action: 'Error', details: 'Export File Locked', metadata: { error: errorMsg, fileName: newFileName } });
            throw new Error(errorMsg);
          } else {
            await Log.create({ username, action: 'Error', details: 'Export Failed', metadata: { error: writeErr.message, fileName: newFileName } });
            throw writeErr;
          }
        }
      }

      // 1.5 Save the aggregated upload.xlsx file
      if (allRegNums.length > 0) {
        const uploadWorkbook = XLSX.utils.book_new();
        const uploadSheet = XLSX.utils.aoa_to_sheet(allRegNums);
        XLSX.utils.book_append_sheet(uploadWorkbook, uploadSheet, 'upload');
        const uploadPath = path.join(outputDir, 'upload.xlsx');
        try {
          const buffer = XLSX.write(uploadWorkbook, { type: "buffer", bookType: "xlsx" });
          fs.writeFileSync(uploadPath, buffer);
        } catch (writeErr) {
          console.error("Could not write upload.xlsx:", writeErr);
        }
      }

      // 2. Update Master Base Data File
      if (baseDataMemory && baseDataMemory.path) {
        const baseWorkbook = XLSX.read(baseDataMemory.data, { type: "buffer" });
        const baseSheet = baseWorkbook.Sheets[baseWorkbook.SheetNames[0]];

        const insertRowBelow = (sheet, searchId, newRegNum, firstName) => {
          const range = XLSX.utils.decode_range(sheet['!ref']);
          let insertIndex = -1;
          
          if (searchId) {
            for (let R = range.e.r; R >= 12; --R) {
              const cell = sheet[XLSX.utils.encode_cell({ c: 2, r: R })]; // Column C
              if (cell && cell.v) {
                const val = String(cell.v).trim();
                let baseId = val;
                const match = val.match(/^(.*?)-R(\d+)$/i);
                if (match) baseId = match[1];
                
                if (baseId === searchId) {
                  insertIndex = R + 1;
                  break;
                }
              }
            }
          }
          
          if (insertIndex === -1) {
            insertIndex = range.e.r + 1; // Append to bottom
          }

          // Shift rows down
          for (let R = range.e.r; R >= insertIndex; --R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const oldAddr = XLSX.utils.encode_cell({ c: C, r: R });
              const newAddr = XLSX.utils.encode_cell({ c: C, r: R + 1 });
              if (sheet[oldAddr]) {
                sheet[newAddr] = sheet[oldAddr];
                delete sheet[oldAddr];
              } else {
                delete sheet[newAddr];
              }
            }
          }
          
          // Shift merges
          if (sheet['!merges']) {
            sheet['!merges'].forEach(m => {
              if (m.s.r >= insertIndex) m.s.r++;
              if (m.e.r >= insertIndex) m.e.r++;
            });
          }
          
          // Insert RegNum at Column C (c: 2)
          sheet[XLSX.utils.encode_cell({ c: 2, r: insertIndex })] = { v: newRegNum, t: 's' };
          
          // Insert First Name at Column E (c: 4)
          if (firstName) {
            sheet[XLSX.utils.encode_cell({ c: 4, r: insertIndex })] = { v: firstName, t: 's' };
          }
          
          // Merge E, F, G for First Name (c: 4, 5, 6)
          if (!sheet['!merges']) sheet['!merges'] = [];
          sheet['!merges'].push({ s: { c: 4, r: insertIndex }, e: { c: 6, r: insertIndex } });

          range.e.r++;
          sheet['!ref'] = XLSX.utils.encode_range(range);
        };

        let baseUpdated = false;
        for (const dataset of data) {
          for (const row of dataset.data) {
            if (row.isReused) {
              continue; // Do not insert again, it already exists perfectly in the master file
            }
            const firstNameOnly = row.name ? row.name.split(' ')[0] : '';
            if (row.wasModified) {
              const match = row.regNum.match(/^(.*?)-R(\d+)$/i);
              const baseId = match ? match[1] : row.regNum;
              insertRowBelow(baseSheet, baseId, row.regNum, firstNameOnly);
              baseUpdated = true;
            } else {
              insertRowBelow(baseSheet, null, row.regNum, firstNameOnly);
              baseUpdated = true;
            }
          }
        }

        if (baseUpdated) {
          const lock = await FileLock.findOne({ lockId: 'masterData' });
          if (!lock || !lock.isLocked || lock.lockedBy !== username || !lock.lockExpiresAt || lock.lockExpiresAt <= new Date()) {
            throw new Error(`Cannot export. Your session expired or was overridden. Please cancel and try again.`);
          }

          const baseBuffer = XLSX.write(baseWorkbook, { type: "buffer", bookType: "xlsx" });
          try {
            // [SAFETY NET]: Silently backup the current state before overwriting
            await createSilentBackup(baseDataMemory.data);

            fs.writeFileSync(baseDataMemory.path, baseBuffer);
            // Refresh in-memory buffer so subsequent checks use updated data
            baseDataMemory.data = baseBuffer;
          } catch (writeErr) {
             if (writeErr.code === 'EBUSY' || writeErr.code === 'EPERM') {
              const errorMsg = `Master File is locked. Please close 'CEPT Group Report.xlsx' in Excel and try again.`;
              await Log.create({ username, action: 'Error', details: 'Master File Locked', metadata: { error: errorMsg } });
              throw new Error(errorMsg);
            } else {
              throw writeErr;
            }
          }
        }
      }

      await Log.create({
        username,
        action: 'ID Export',
        details: `Exported ${successCount} file(s) and synced Master Data`,
        metadata: { destinationFolder: outputDir, fileCount: successCount }
      });

      if (payload.targetDate) {
        await DailyOperation.findOneAndUpdate(
          { date: payload.targetDate },
          { idsUploaded: true },
          { upsert: true }
        );
      }

      return { success: true, message: `Successfully saved ${successCount} file(s) to folder\nThe base data file got successfully updated as well` };
    } catch (error) {
      console.error("Export failed:", error);
      return { success: false, message: error.message };
    }
  });

  // --- 5. CLEAR DATA ---
  ipcMain.handle('clear-data', async (event, payload) => {
    baseDataMemory = null;
    newDataMemory = null;
    scoresDataMemory = null;
    return { success: true };
  });

  // --- 6. UPLOAD SCORES DATA ---
  ipcMain.handle('upload-scores-data', async (event, payload) => {
    const username = payload && payload.username ? payload.username : 'System';
    const { canceled, filePaths } = await dialog.showOpenDialog(getMainWindow(), {
      title: 'Select Scores Data (.csv or .xlsx)',
      properties: ['openFile'],
      filters: [{ name: 'Data Files', extensions: ['csv', 'xlsx', 'xls'] }]
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, message: 'Upload canceled by user.' };
    }

    try {
      const filePath = filePaths[0];
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = basename(filePath);
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:A1");
      const totalRows = range.e.r - range.s.r; // Since row 1 is header

      if (totalRows <= 0) {
         throw new Error("File is empty or missing data rows.");
      }

      scoresDataMemory = { path: filePath, fileName, data: fileBuffer, worksheet, range };

      return {
        success: true,
        message: `Successfully extracted ${totalRows} scores from ${fileName}`,
        count: totalRows
      };

    } catch (error) {
      console.error("Failed to read scores file:", error);
      await Log.create({ username, action: 'Error', details: 'Scores Upload failed', metadata: { error: error.message } });
      return { success: false, message: error.message };
    }
  });

  // --- 7. PROCESS SCORES ---
  ipcMain.handle('process-scores', async (event, payload) => {
    const username = payload && payload.username ? payload.username : 'System';
    try {
      if (!baseDataMemory || !scoresDataMemory) {
        return { success: false, message: "Missing data. Please upload Master Data and Scores Data first." };
      }

      const baseWorkbook = XLSX.read(baseDataMemory.data, { type: "buffer" });
      const baseSheet = baseWorkbook.Sheets[baseWorkbook.SheetNames[0]];
      const baseRange = XLSX.utils.decode_range(baseSheet['!ref'] || "A1:A1");

      const scoresSheet = scoresDataMemory.worksheet;
      const scoresRange = scoresDataMemory.range;

      const getCellStr = (sheet, c, r) => {
        const cellAddress = XLSX.utils.encode_cell({ c, r });
        const cell = sheet[cellAddress];
        return cell && cell.v !== undefined ? String(cell.w !== undefined ? cell.w : cell.v).trim() : '';
      };

      // Create grouping of Master Data IDs to their Row Indexes by base ID
      const masterMap = new Map();
      for (let R = 12; R <= baseRange.e.r; ++R) {
        const id = getCellStr(baseSheet, 2, R); // Column C is c:2
        if (id !== '') {
          let baseId = id;
          let retake = 0;
          const match = id.match(/^(.*?)-R(\d+)$/i);
          if (match) {
            baseId = match[1];
            retake = parseInt(match[2], 10);
          }
          
          const scoreCell = getCellStr(baseSheet, 7, R); // Column H is c:7
          const hasScore = scoreCell !== '';
          
          if (!masterMap.has(baseId)) {
            masterMap.set(baseId, []);
          }
          masterMap.get(baseId).push({ exactId: id, retake, row: R, hasScore });
        }
      }

      // Sort variants so retake 0 is first, then 1, 2, etc.
      for (const variants of masterMap.values()) {
        variants.sort((a, b) => a.retake - b.retake);
      }

      let matchedCount = 0;
      let unmatchedList = [];
      let fullyScoredList = [];
      const cleanData = [];

      let baseUpdated = false;

      // Start from Row 2 (index 1) in scores data
      for (let R = 1; R <= scoresRange.e.r; ++R) {
        const rawRegNum = getCellStr(scoresSheet, 0, R); // Col A
        if (rawRegNum === '') continue;

        const lastName = getCellStr(scoresSheet, 1, R);  // Col B
        const firstName = getCellStr(scoresSheet, 2, R); // Col C
        const score = getCellStr(scoresSheet, 3, R);     // Col D
        const value = getCellStr(scoresSheet, 4, R);     // Col E

        let isMatched = false;
        
        let strippedRegNum = rawRegNum;
        const match = rawRegNum.match(/^(.*?)-R(\d+)$/i);
        if (match) {
          strippedRegNum = match[1];
        }

        if (!masterMap.has(strippedRegNum)) {
          unmatchedList.push(rawRegNum);
        } else {
          const variants = masterMap.get(strippedRegNum);
          
          // Deep search: find the lowest retake variant that does NOT have a score
          let targetVariant = variants.find(v => !v.hasScore);
          
          if (targetVariant) {
            if (score !== '') {
              baseSheet[XLSX.utils.encode_cell({ c: 7, r: targetVariant.row })] = { v: Number(score), t: 'n' };
            }
            if (value !== '') {
              baseSheet[XLSX.utils.encode_cell({ c: 8, r: targetVariant.row })] = { v: value, t: 's' };
            }
            targetVariant.hasScore = true; // Mark as scored so we don't fill it again in the same run
            isMatched = true;
            matchedCount++;
            baseUpdated = true;
          } else {
            fullyScoredList.push(rawRegNum);
          }
        }

        cleanData.push({
          rawRegNum, // Needed to find it during in-place export
          strippedRegNum, // The cleaned up ID
          isMatched
        });
      }

      if (baseUpdated) {
        // Expand baseRange to include columns H and I if necessary
        if (baseRange.e.c < 8) {
          baseSheet['!ref'] = XLSX.utils.encode_range(baseRange.s, { c: 8, r: baseRange.e.r });
        }
        
        const baseBuffer = XLSX.write(baseWorkbook, { type: "buffer", bookType: "xlsx" });
        // Store in memory for later export, do NOT write to disk yet to protect database
        scoresDataMemory.pendingBaseBuffer = baseBuffer;
      }

      await Log.create({
        username,
        action: 'Scores Check',
        details: `Processed scores. Matched: ${matchedCount}. Unmatched: ${unmatchedList.length}. Fully Scored: ${fullyScoredList.length}.`,
        metadata: { matchedCount, unmatchedList, fullyScoredList, totalRecords: cleanData.length }
      });

      // Save processed clean data to memory for exporting
      scoresDataMemory.cleanData = cleanData;

      return {
        success: true,
        matchedCount,
        unmatchedList,
        fullyScoredList,
        cleanData
      };

    } catch (error) {
      console.error("Process scores failed:", error);
      await Log.create({ username, action: 'Error', details: 'Process Scores failed', metadata: { error: error.message } });
      return { success: false, message: error.message };
    }
  });

  // --- 8. EXPORT SCORES ---
  ipcMain.handle('export-scores', async (event, payload) => {
    const username = payload && payload.username ? payload.username : 'System';
    try {
      if (!scoresDataMemory || !scoresDataMemory.cleanData) {
        return { success: false, message: "No processed scores to export." };
      }

      const { canceled, filePath } = await dialog.showSaveDialog(getMainWindow(), {
        title: 'Save Clean AAST Scores',
        defaultPath: 'Clean_AAST_Scores.xlsx',
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
      });

      if (canceled || !filePath) {
        return { success: false, message: 'Export canceled by user.' };
      }

      // Read the original scores file to preserve columns/headers
      const workbook = XLSX.read(scoresDataMemory.data, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const range = XLSX.utils.decode_range(worksheet['!ref'] || "A1:A1");
      
      // Build a map of only the IDs that need to be stripped
      const modifiedMap = new Map();
      for (const row of scoresDataMemory.cleanData) {
        if (row.rawRegNum !== row.strippedRegNum) {
          modifiedMap.set(row.rawRegNum, row.strippedRegNum);
        }
      }

      // Modify the original cells in Column A in-place
      for (let R = 1; R <= range.e.r; ++R) {
        const cellAddress = XLSX.utils.encode_cell({ c: 0, r: R }); // Column A
        const cell = worksheet[cellAddress];
        
        if (cell && cell.v !== undefined) {
          const currentVal = String(cell.w !== undefined ? cell.w : cell.v).trim();
          if (modifiedMap.has(currentVal)) {
            cell.v = modifiedMap.get(currentVal);
            cell.t = 's'; // Force string type
            delete cell.w; // Clear formatted text so it regenerates correctly
          }
        }
      }

      // Explicitly write as XLSX, even if original was CSV
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      try {
        fs.writeFileSync(filePath, buffer);
      } catch (writeErr) {
        if (writeErr.code === 'EBUSY' || writeErr.code === 'EPERM') {
          throw new Error(`cannot save file ${filePath}`);
        }
        throw writeErr;
      }

      // Safe to save the Master Data now that the user confirmed export
      if (scoresDataMemory.pendingBaseBuffer && baseDataMemory) {
        try {
          const lock = await FileLock.findOne({ lockId: 'masterData' });
          if (!lock || !lock.isLocked || lock.lockedBy !== username || !lock.lockExpiresAt || lock.lockExpiresAt <= new Date()) {
            throw new Error(`Cannot export. Your session expired or was overridden. Please cancel and try again.`);
          }

          // [SAFETY NET]: Silently backup the current state before overwriting
          await createSilentBackup(baseDataMemory.data);

          fs.writeFileSync(baseDataMemory.path, scoresDataMemory.pendingBaseBuffer);
          baseDataMemory.data = scoresDataMemory.pendingBaseBuffer; // Refresh memory
          delete scoresDataMemory.pendingBaseBuffer; // Cleanup
        } catch (writeErr) {
          if (writeErr.code === 'EBUSY' || writeErr.code === 'EPERM') {
            throw new Error(`Master File is locked. Please close 'CEPT Group Report.xlsx' in Excel and try again.`);
          }
          throw writeErr;
        }
      }

      await Log.create({
        username,
        action: 'Scores Export',
        details: `Exported clean scores for ${scoresDataMemory.cleanData.length} records.`,
        metadata: { filePath, recordCount: scoresDataMemory.cleanData.length }
      });

      if (payload.targetDate) {
        await DailyOperation.findOneAndUpdate(
          { date: payload.targetDate },
          { scoresUploaded: true },
          { upsert: true }
        );
      }

      return { success: true, message: `Successfully saved clean scores to ${basename(filePath)}` };
    } catch (error) {
      console.error("Export scores failed:", error);
      let errorMsg = error.message;
      if (errorMsg.includes('cannot save file')) {
        const pathPart = errorMsg.replace('cannot save file', '').trim();
        const lockedFileName = pathPart ? basename(pathPart) : 'the export file';
        errorMsg = `Export Failed: The file is currently locked.\nPlease close '${lockedFileName}' in Microsoft Excel and try again.`;
      }
      return { success: false, message: errorMsg };
    }
  });

  // --- 9. GET WEEK OPERATIONS ---
  ipcMain.handle('get-week-operations', async (event, payload) => {
    try {
      const { dates } = payload; // Array of YYYY-MM-DD strings
      if (!dates || !Array.isArray(dates)) {
        return { success: false, message: "Invalid dates provided." };
      }

      const operations = await DailyOperation.find({ date: { $in: dates } });
      
      // Convert to map for easy lookup
      const opsMap = {};
      dates.forEach(d => {
        const dateObj = new Date(d);
        const day = dateObj.getDay(); // 0 is Sun, 5 is Fri, 6 is Sat
        const isWeekend = (day === 5 || day === 6);
        
        opsMap[d] = { 
          idsUploaded: false, 
          scoresUploaded: false,
          idsNotNeeded: isWeekend,
          scoresNotNeeded: isWeekend
        };
      });
      operations.forEach(op => {
        opsMap[op.date] = { 
          idsUploaded: op.idsUploaded, 
          scoresUploaded: op.scoresUploaded,
          idsNotNeeded: op.idsNotNeeded,
          scoresNotNeeded: op.scoresNotNeeded
        };
      });

      return { success: true, data: opsMap };
    } catch (error) {
      console.error("Get week operations failed:", error);
      return { success: false, message: error.message };
    }
  });

  // --- 10. TOGGLE NOT NEEDED ---
  ipcMain.handle('toggle-not-needed', async (event, payload) => {
    try {
      const { targetDate, type, value } = payload; // type: 'ids' | 'scores' | 'both', value: boolean
      
      let updateField = {};
      if (type === 'both') {
        updateField = { idsNotNeeded: value, scoresNotNeeded: value };
      } else {
        updateField = type === 'ids' ? { idsNotNeeded: value } : { scoresNotNeeded: value };
      }
      
      await DailyOperation.findOneAndUpdate(
        { date: targetDate },
        updateField,
        { upsert: true }
      );

      // We don't have the username from the frontend here, but we can pass it in. 
      // Assuming payload.username is passed, or default to 'System'
      const username = payload.username || 'System';
      const actionStr = value ? 'Skip Day' : 'Undo Skip';
      
      await Log.create({
        username,
        action: actionStr,
        details: `Toggled skip status for ${targetDate} (${type}). Set to: ${value}`,
        metadata: { targetDate, type, value }
      });

      return { success: true };
    } catch (error) {
      console.error("Toggle not needed failed:", error);
      return { success: false, message: error.message };
    }
  });

  // --- 11. LOG FRONTEND ACTION ---
  ipcMain.handle('log-frontend-action', async (event, payload) => {
    try {
      const { username, action, details, metadata } = payload;
      await Log.create({
        username: username || 'System',
        action,
        details,
        metadata
      });
      return { success: true };
    } catch (error) {
      console.error("Frontend log failed:", error);
      return { success: false, message: error.message };
    }
  });

}
