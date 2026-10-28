import { randomBytes, createHash } from 'node:crypto';
import { runtimeStore } from '../services/runtimeStore.js';
import { prisma } from '../db/connect.js';

const sessions = runtimeStore('sessions');
const COOKIE = 'cept_session';
const TTL = 8 * 60 * 60 * 1000;
const digest = value => createHash('sha256').update(value).digest('hex');
export const publicUser = user => ({ username: user.username, role: user.role, email: user.email, avatarUrl: user.avatarUrl });
function cookieOptions() { return { httpOnly: true, sameSite: 'lax', secure: process.env.SESSION_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production', path: '/api' }; }
function tokenFrom(req) {
  const cookie = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`));
  return cookie?.slice(COOKIE.length + 1);
}
export async function endSession(req, res) {
  const token = tokenFrom(req);
  if (token) await sessions.delete(digest(token));
  res.clearCookie(COOKIE, cookieOptions());
}
export async function clearSessions(db) { await sessions.clear(db); }
export async function startSession(user, req, res) {
  const previous = tokenFrom(req);
  if (previous) await sessions.delete(digest(previous));
  const token = randomBytes(32).toString('hex');
  await sessions.set(digest(token), { userId: user.id, password: user.password, expiresAt: Date.now() + TTL });
  res.cookie(COOKIE, token, { ...cookieOptions(), maxAge: TTL });
}
export function allowedOrigin(req, origin) {
  const configured = (process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  const own = `${req.protocol}://${req.get('host')}`;
  return origin === own || configured.includes(origin) || (process.env.NODE_ENV !== 'production' && ['http://localhost:5174', 'http://127.0.0.1:5174'].includes(origin));
}
export async function protectApi(req, res, next) {
  try {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.get('X-CEPT-Request') !== '1' || (req.get('origin') && !allowedOrigin(req, req.get('origin')))) {
        return res.status(403).json({ success: false, message: 'This request did not come from the CEPT website.' });
      }
    }
    if (['/auth-login', '/auth-sso-login'].includes(req.path)) return next();
    const token = tokenFrom(req);
    const key = token && digest(token);
    const session = key && await sessions.get(key);
    if (!session || session.expiresAt <= Date.now()) {
      if (key) await sessions.delete(key);
      return res.status(401).json({ success: false, message: 'Please sign in again.' });
    }
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.isDeleted || user.password !== session.password) {
      await endSession(req, res);
      return res.status(401).json({ success: false, message: 'Your account changed. Please sign in again.' });
    }
    req.user = user;
    req.sessionKey = key;
    const adminOnly = /^\/admin-/.test(req.path) || ['/upload-master-data', '/upload-master-data-chunk', '/get-dashboard-details', '/get-dashboard-filters'].includes(req.path);
    if (adminOnly && user.role !== 'admin') return res.status(403).json({ success: false, message: 'Administrator access is required.' });
    // Identity always comes from the verified session, never from supplied names.
    if (req.body && !Array.isArray(req.body) && typeof req.body === 'object') {
      req.body.username = user.username;
      req.body.adminUsername = user.username;
    }
    next();
  } catch (error) { next(error); }
}

