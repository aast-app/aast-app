import { runtimeStore } from '../services/runtimeStore.js';
import { startSession, endSession, publicUser } from '../middlewares/session.js';
import { executeSilentBackup } from '../services/backup.js';
import rateLimit from 'express-rate-limit';
import { registerAction } from '../routes/actions.js';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/connect.js';
import jwt from 'jsonwebtoken';

const usedTokens = runtimeStore('sso');

export function registerAuthHandlers(router) {
  router.use(['/auth-login', '/auth-sso-login'], rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { success: false, message: 'Too many login attempts. Try again later.' } }));
  registerAction(router, 'auth-session', async (_body, req) => ({ success: true, user: publicUser(req.user) }));
  registerAction(router, 'auth-logout', async (_body, req, res) => {
    let backupSaved = true;
    try { await executeSilentBackup(req.user.username); } catch { backupSaved = false; }
    await endSession(req, res);
    return { success: true, backupSaved };
  });
  registerAction(router, 'auth-login', async ({ username, password }, req, res) => {
    try {
      if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password || username.length > 200 || password.length > 1024) return { success: false, message: 'Username and password are required.' };
      
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user || user.isDeleted) return { success: false, message: 'Invalid username or password.' };
      
      if (!user.password) {
        return { success: false, message: 'This account was created via SSO. Please log in via the AAST Portal.' };
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return { success: false, message: 'Invalid username or password.' };
      
      await prisma.log.create({ data: { username: user.username, action: 'Login', details: 'User successfully logged in.' } });
      await startSession(user, req, res);
      return { success: true, user: publicUser(user) };
    } catch (error) {
      console.error("Login Error:", error);
      return { success: false, message: 'Connection error.' };
    }
  });

  registerAction(router, 'auth-sso-login', async ({ token }, req, res) => {
    try {
      if (!token) return { success: false, message: 'Token missing.' };

      const SSO_SECRET = process.env.SSO_JWT_SECRET;
      if (!SSO_SECRET) return { success: false, message: 'Portal login is not configured on this server.' };
      let payload;
      try {
        payload = jwt.verify(token, SSO_SECRET, { algorithms: ['HS256'] });
      } catch {
        return { success: false, message: 'Invalid or expired SSO link. Please launch from the portal again.' };
      }

      if (typeof payload.username !== 'string' || !payload.username.trim() || typeof payload.jti !== 'string' || !payload.jti || !Number.isFinite(payload.exp)) return { success: false, message: 'Invalid portal login details.' };
      if (await usedTokens.get(payload.jti)) {
        return { success: false, message: 'SSO link already used. Please launch from the portal again.' };
      }
      await usedTokens.set(payload.jti, { expires: payload.exp * 1000 });

      let user = await prisma.user.findUnique({ where: { username: payload.username } });
      const incomingRole = payload.role === 'admin' ? 'admin' : 'user';
      const incomingEmail = payload.email || null;
      const incomingAvatarUrl = payload.avatarUrl || null;
      
      if (!user) {
        user = await prisma.user.create({
          data: {
            username: payload.username,
            password: null,
            role: incomingRole,
            email: incomingEmail,
            avatarUrl: incomingAvatarUrl
          }
        });
      } else {
        if (user.isDeleted) {
           return { success: false, message: 'Account is deleted.' };
        }
        // Sync role, email, avatar if it changed from the SSO Portal
        if (user.role !== incomingRole || user.email !== incomingEmail || user.avatarUrl !== incomingAvatarUrl) {
          user = await prisma.user.update({
            where: { username: payload.username },
            data: {
              role: incomingRole,
              email: incomingEmail,
              avatarUrl: incomingAvatarUrl
            }
          });
        }
      }

      await prisma.log.create({ data: { username: user.username, action: 'Login', details: 'User successfully logged in via SSO.' } });
      await startSession(user, req, res);
      return { success: true, user: publicUser(user) };
    } catch (error) {
      console.error("SSO Login Error:", error);
      return { success: false, message: 'SSO authentication failed.' };
    }
  });
}
