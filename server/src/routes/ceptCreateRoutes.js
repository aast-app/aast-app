import { Router } from 'express';
import { prisma } from '../db/connect.js';
import { registerAction } from './actions.js';
const router = Router();
function count(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1000000) { const error = new Error('Invalid document count.'); error.status = 400; throw error; }
  return value;
}
async function recordCreation(body, req, kind) {
  const username = req.user.username;
  const locations = kind === 'table' ? count(body.locationsCount) : count(body.successCount);
  const totalStudents = count(kind === 'table' ? body.totalProcessed : body.totalStudents);
  const metadata = kind === 'table' ? { locationsCount: locations, totalProcessed: totalStudents, unmatchedCount: count(body.unmatchedCount), unmatchedRegNums: body.unmatchedRegNums } : { totalStudents, successCount: locations };
  await prisma.$transaction(async tx => {
    await tx.log.create({ data: { username, action: kind === 'table' ? 'Table Created' : 'Documents Generated', details: kind === 'table' ? `Generated CEPT tables/PDFs for ${locations} locations. Processed ${totalStudents} students.` : `Generated ${locations} PDF login files.`, metadata: JSON.stringify(metadata) } });
    const activityDate = new Date().toLocaleDateString('en-CA');
    const meta = await tx.dailyMetaData.upsert({ where: { activityDate }, update: {}, create: { activityDate } });
    let current;
    try { current = JSON.parse(meta.ceptCreate); } catch { current = null; }
    if (!current || Array.isArray(current) || !Array.isArray(current.contributors)) current = { tablesGenerated: 0, loginPdfsGenerated: 0, contributors: [] };
    const field = kind === 'table' ? 'tablesGenerated' : 'loginPdfsGenerated';
    current[field] = (current[field] || 0) + locations;
    if (!current.contributors.includes(username)) current.contributors.push(username);
    await tx.dailyMetaData.update({ where: { activityDate }, data: { ceptCreate: JSON.stringify(current) } });
  });
  return { success: true, message: 'Document activity saved.' };
}
registerAction(router, 'log-cept-table', (body, req) => recordCreation(body, req, 'table'));
registerAction(router, 'log-login-pdfs', (body, req) => recordCreation(body, req, 'pdf'));
export default router;
