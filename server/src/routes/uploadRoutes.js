import { Router } from 'express';
import * as XLSX from 'xlsx';
import { upload } from '../middlewares/upload.js';
import { registerAction } from './actions.js';
import { fingerprint } from '../services/backup.js';
import { studentState, previewMaster, stageMasterChunk, previewIds, previewScores, commitImport, discardImport } from '../services/imports.js';

const router = Router();
router.post('/upload-master-data', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Choose an Excel or CSV file.' });
    const book = XLSX.read(req.file.buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1 });
    res.json(await previewMaster(rows.slice(1), req.file.originalname, req));
  } catch (error) { next(error); }
});
registerAction(router, 'upload-master-data-chunk', stageMasterChunk);
registerAction(router, 'preview-ids', previewIds);
registerAction(router, 'preview-scores', previewScores);
registerAction(router, 'commit-import', commitImport);
registerAction(router, 'discard-import', discardImport);
registerAction(router, 'check-ids', async ({ regNums }) => {
  if (!Array.isArray(regNums) || !regNums.length || regNums.length > 100000 || regNums.some(value => typeof value !== 'string' || !value.trim() || value.length > 100)) {
    const error = new Error('Provide valid registration numbers.'); error.status = 400; throw error;
  }
  const state = await studentState();
  const wanted = new Set(regNums);
  const data = Object.fromEntries(state.filter(row => wanted.has(row.registrationNumber)).map(row => [row.registrationNumber, { hasGrade: row.score !== null, retake: 0 }]));
  return { success: true, data, revision: fingerprint(state) };
});
export default router;
