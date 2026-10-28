import { randomUUID } from 'node:crypto';
import { prisma } from '../db/connect.js';
import { cloudDatabase } from '../services/runtimeStore.js';
// Serialize database-changing requests, including recovery. Waiting requests authenticate
// only after earlier writes finish, so a restore cannot be followed by a stale session write.
let tail = Promise.resolve();
const writes = new Set(['auth-login', 'auth-sso-login', 'auth-logout', 'admin-create-user', 'admin-edit-user', 'admin-delete-user', 'toggle-not-needed', 'log-frontend-action', 'commit-import', 'log-cept-table', 'log-login-pdfs', 'admin-restore-backup', 'preview-ids', 'preview-scores', 'upload-master-data', 'upload-master-data-chunk', 'discard-import', 'admin-preview-restore']);
async function cloudGate(req, res, next) {
  const key = 'lease:writer', owner = randomUUID();
  const until = () => new Date(Date.now() + 180000);
  try {
    let acquired = false;
    const deadline = Date.now() + 10000;
    while (!acquired && Date.now() < deadline) {
      try { await prisma.runtimeState.create({ data: { key, namespace: 'lease', payload: owner, expiresAt: until() } }); acquired = true; }
      catch (error) { if (error.code !== 'P2002') throw error; acquired = (await prisma.runtimeState.updateMany({ where: { key, expiresAt: { lt: new Date() } }, data: { payload: owner, expiresAt: until() } })).count === 1; }
      if (!acquired) await new Promise(resolve => setTimeout(resolve, 150));
    }
    if (!acquired) return res.status(409).json({ success: false, message: 'Another operation is finishing. Please retry shortly.' });
    const renewal = setInterval(() => { prisma.runtimeState.updateMany({ where: { key, payload: owner }, data: { expiresAt: until() } }).catch(() => {}); }, 30000); renewal.unref();
    let released = false;
    const release = async () => { if (released) return; released = true; clearInterval(renewal); await prisma.runtimeState.deleteMany({ where: { key, payload: owner } }); };
    req.releaseWrite = release;
    res.once('finish', () => { release().catch(() => {}); });
    res.once('close', () => { if (!req.operationStarted) release().catch(() => {}); });
    next();
  } catch (error) { next(error); }
}
export function writeGate(req, res, next) {
  if (!writes.has(req.path.slice(1))) return next();
  if (cloudDatabase()) return cloudGate(req, res, next);
  const previous = tail;
  let release;
  tail = new Promise(resolve => { release = resolve; });
  previous.then(() => {
    if (req.aborted || res.destroyed) { release(); return; }
    let done = false;
    const finish = () => { if (!done) { done = true; release(); } };
    req.releaseWrite = finish;
    res.once('finish', finish);
    res.once('close', () => { if (!req.operationStarted) finish(); });
    next();
  }).catch(next);
}
