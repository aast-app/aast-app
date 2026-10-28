import { cleanScoreWorkbook } from '../features/scores/export.js';
import { validateHeaders } from '../utils/spreadsheetHeaders.js';
import { useImportDraft } from '../hooks/useImportDraft.js';
import { createDownloadTarget } from '../utils/download.js';
import { useMemo, useState } from 'react';
import api from '../api';
import ReviewDialog, { ReviewBusy, ReviewError, ReviewNotice, ReviewSuccess } from './review/ReviewDialog';
import ReviewUpload from './review/ReviewUpload';
import ReviewFiles from './review/ReviewFiles';
import { scoreReviewFiles } from './review/reviewData.js';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

function ScoresModal({ modalData, onClose }) {
  const draft = useImportDraft();
  
  const [preview, setPreview] = useState(null);
  const [saved, setSaved] = useState(false);
  const [isScoresLoaded, setIsScoresLoaded] = useState(false);
  
  const [transformedData, setTransformedData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');

  const reviewFiles = useMemo(() => scoreReviewFiles(transformedData), [transformedData]);
  const changedCount = transformedData.reduce((count, file) => count + file.rows.filter(row => row.regNumRaw !== row.strippedRegNum).length, 0);
  const studentCount = transformedData.reduce((count, file) => count + file.rows.length, 0);

  const handleUploadScoresData = async (files) => {
    if (!files.length) return;

    draft.prepare(null);
    setTransformedData([]);
    setIsScoresLoaded(false);
    setIsProcessing(true);
    setExportMessage(''); setPreview(null);
    
    try {
      const parsedFiles = [];
      const allScores = [];

      // 1. Read files
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array', cellStyles: true, raw: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        validateHeaders(XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] || [], 'scores');
        const range = XLSX.utils.decode_range(sheet['!ref'] || "A1:A1");

        const rows = [];
        const getCellStr = (c, r) => {
          const cell = sheet[XLSX.utils.encode_cell({ c, r })];
          return cell && cell.v !== undefined ? String(cell.w !== undefined ? cell.w : cell.v).trim() : '';
        };

        for (let R = 1; R <= range.e.r; ++R) {
          const regNumRaw = getCellStr(0, R); // Column A
          if (regNumRaw === '') continue;

          let strippedRegNum = regNumRaw;
          const match = regNumRaw.match(/^(.*?)-R(\d+)$/i);
          if (match) {
            strippedRegNum = match[1];
          }

          const scoreRaw = getCellStr(3, R); // Column D
          const valueRaw = getCellStr(4, R); // Column E
          
          let score = null;
          if (scoreRaw !== '') {
            if (!Number.isFinite(Number(scoreRaw))) throw new Error(`Invalid score on row ${R + 1} in ${file.name}.`);
            score = Number(scoreRaw);
          }

          const value = valueRaw !== '' ? valueRaw : null;

          rows.push({
            r: R, // Row index
            regNumRaw,
            strippedRegNum,
            score,
            value
          });

          allScores.push({
            rawRegNum: regNumRaw,
            strippedRegNum,
            score,
            value
          });
        }
        
        parsedFiles.push({
          file,
          originalBuffer: buffer,
          workbook,
          sheetName,
          rows
        });
      }


      
      // 2. Check and Upsert against DB
      const response = await api.post('/preview-scores', { 
        targetDate: modalData.date,
        scores: allScores,
        numFiles: files.length
      });

      if (!response.data.success) throw new Error(response.data.message);
      
      const unmatched = new Set(response.data.unmatchedNumbers);
      draft.prepare(response.data.draftId);

      // 3. Apply Strip Logic for Export
      for (const pFile of parsedFiles) {
        const sheet = pFile.workbook.Sheets[pFile.sheetName];
        for (const row of pFile.rows) {
          row.matched = !unmatched.has(row.regNumRaw);
          if (row.regNumRaw !== row.strippedRegNum) {
            // Modify cell to stripped ID
            const cellAddress = XLSX.utils.encode_cell({ c: 0, r: row.r });
            sheet[cellAddress] = { ...sheet[cellAddress], t: 's', v: row.strippedRegNum };
            delete sheet[cellAddress].w;
            delete sheet[cellAddress].f;
            row.wasModified = true;
          }
        }
      }

      setTransformedData(parsedFiles);
      setPreview(response.data);
      setIsScoresLoaded(true);

    } catch (error) {
      setExportMessage(error.response?.data?.message || error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportMessage('Please select where to save your files...');
    
    try {
      if (transformedData.length === 1) {
        const pFile = transformedData[0];
        let fileHandle;
        try {
          fileHandle = await createDownloadTarget({
            suggestedName: 'clean_' + pFile.file.name.replace(/\.[^/.]+$/, "") + '.xlsx',
            types: [{
              description: 'Excel Workbook',
              accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
            }]
          });
        } catch {
          setIsExporting(false);
          setExportMessage('');
          return;
        }
        
        setExportMessage('Generating file...');
        const buffer = await cleanScoreWorkbook(pFile);
        await draft.commit();
        const writable = await fileHandle.createWritable();
        await writable.write(buffer);
        await writable.close();
        
      } else {
        let fileHandle;
        try {
          fileHandle = await createDownloadTarget({
            suggestedName: `Scores_${modalData.displayDate.replace(/\s+/g, '_')}.zip`,
            types: [{
              description: 'ZIP Archive',
              accept: { 'application/zip': ['.zip'] }
            }]
          });
        } catch {
          setIsExporting(false);
          setExportMessage('');
          return;
        }

        setExportMessage('Zipping files...');
        const zip = new JSZip();
        
        for (const pFile of transformedData) {
          const buffer = await cleanScoreWorkbook(pFile);
          zip.file('clean_' + pFile.file.name.replace(/\.[^/.]+$/, "") + '.xlsx', buffer);
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        await draft.commit();
        const writable = await fileHandle.createWritable();
        await writable.write(zipBlob);
        await writable.close();
      }
      
      setExportMessage('');
      setSaved(true);
      
    } catch (error) {
      setExportMessage(draft.isSaved() ? 'Records are saved, but the download failed. Retry to download without saving twice.' : `Save or download could not be completed: ${error.response?.data?.message || error.message}. Retry with this preview to check safely.`);
    } finally {
      setIsExporting(false);
    }
  };

  const busy = isProcessing || isExporting;
  function discard() { if (draft.draftId && !draft.isSaved()) api.post('/discard-import', { draftId: draft.draftId }).catch(() => {}); }
  function close() { if (!busy) { discard(); onClose(); } }
  function replace() { discard(); draft.prepare(null); setIsScoresLoaded(false); setTransformedData([]); setPreview(null); setExportMessage(''); }
  const stage = saved ? 'saved' : isScoresLoaded ? 'review' : 'upload';
  const error = busy ? '' : exportMessage;
  return <ReviewDialog title="Check scores" eyebrow="RESULTS" date={modalData.date} dateLabel={modalData.displayDate} stage={stage} steps={['Upload results', 'Review matches', 'Save & download']} busy={busy} onClose={close}
    footer={<><span className="review-footer-note"><span aria-hidden="true">{draft.isSaved() ? '✓' : '○'}</span>{draft.isSaved() ? 'Scores saved · database keeps full attempt IDs' : 'Preview only · nothing saved yet'}</span><div className="review-footer-actions">{saved ? <button className="review-button review-button--primary" onClick={close}>Done</button> : <><button className="review-button review-button--secondary" disabled={busy} onClick={close}>Cancel</button>{isScoresLoaded && <button className="review-button review-button--primary" disabled={busy || !draft.draftId} onClick={handleExport}>{isExporting ? 'Saving & downloading…' : draft.isSaved() ? 'Retry download' : preview?.unmatchedCount ? `Save ${preview.matchedCount} matched & download` : 'Save scores & download'}<span aria-hidden="true">↓</span></button>}</>}</div></>}>
    {busy ? <ReviewBusy title={isProcessing ? 'Checking your score files' : draft.isSaved() ? 'Preparing your download' : 'Saving scores & preparing your file'}>{isProcessing ? 'Matching each full registration number to its exact test attempt.' : exportMessage || 'Keep this window open while the operation finishes.'}</ReviewBusy> : saved ? <ReviewSuccess title="Scores saved. Your file is ready.">{preview.matchedCount} matched results saved. The download uses cleaned registration numbers; the database keeps the full attempt IDs.{preview.unmatchedCount ? ` ${preview.unmatchedCount} unmatched rows were left unsaved.` : ''}</ReviewSuccess> : isScoresLoaded ? <>
      <div className="review-section-heading"><div><h3>Review matches and cleaned IDs</h3><p>The uploaded attempt ID is used for saving. The adjusted number is used only in your download.</p></div><button type="button" className="review-text-button" onClick={replace}>Choose different files</button></div>
      <p className="review-summary">{studentCount} students · {preview.matchedCount} matched · {changedCount} IDs cleaned</p>
      <ReviewNotice tone={preview.unmatchedCount ? 'warning' : 'info'}>{preview.unmatchedCount ? `${preview.unmatchedCount} registration number${preview.unmatchedCount === 1 ? ' was' : 's were'} not found. Only matched results will be saved; all uploaded rows remain in the download.` : 'All attempts matched. Amber rows show where a retake suffix is removed from the download only.'}</ReviewNotice>
      <ReviewFiles key={draft.draftId} files={reviewFiles} mode="scores" />
    </> : <>
      <ReviewUpload title="Bring in your exam results" description="Upload the score sheets for this exam day. We’ll match the full attempt IDs and preview the cleaned download." hint="Cambridge Group Report CSV and standard score workbooks are supported." inputLabel="Upload score files" onFiles={handleUploadScoresData} />

    </>}
    <ReviewError message={error} />
  </ReviewDialog>;
}
export default ScoresModal;
