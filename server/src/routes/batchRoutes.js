import { Router } from 'express';
import * as XLSX from 'xlsx';
import { prisma } from '../db/connect.js';
import { registerAction } from './actions.js';
const router = Router();
function id(value) {
  if (!Number.isSafeInteger(value) || value < 1) { const error = new Error('Choose a valid batch.'); error.status = 400; throw error; }
  return value;
}
async function getBatch(batchId) {
  const batch = await prisma.registrationBatch.findUnique({ where: { id: id(batchId) } });
  if (!batch) { const error = new Error('This batch no longer exists.'); error.status = 404; throw error; }
  return { ...batch, files: JSON.parse(batch.files) };
}
registerAction(router, 'list-batches', async ({ page = 1 }) => {
  if (!Number.isSafeInteger(page) || page < 1) { const error = new Error('Invalid batch page.'); error.status = 400; throw error; }
  const [batches, total] = await prisma.$transaction([
    prisma.registrationBatch.findMany({ skip: (page - 1) * 20, take: 20, orderBy: { id: 'desc' }, select: { id: true, name: true, testDate: true, createdAt: true, createdBy: true, fileCount: true, studentCount: true } }),
    prisma.registrationBatch.count(),
  ]);
  return { success: true, batches, total, totalPages: Math.max(1, Math.ceil(total / 20)) };
});
registerAction(router, 'get-batch', async ({ batchId }) => ({ success: true, batch: await getBatch(batchId) }));
router.post('/batch-upload', async (req, res, next) => {
  try {
    const batch = await getBatch(req.body.batchId);
    const numbers = batch.files.flatMap(file => file.students.map(student => [student.registrationNumber]));
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(numbers);
    for (let row = 0; row < numbers.length; row++) sheet[`A${row + 1}`].z = '@';
    XLSX.utils.book_append_sheet(workbook, sheet, 'upload');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="upload.xlsx"');
    res.send(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  } catch (error) { next(error); }
});
export default router;
