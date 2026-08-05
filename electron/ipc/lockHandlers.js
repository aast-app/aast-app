import { ipcMain } from 'electron';
import { FileLock } from '../db/models.js';

const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

let currentLocalLockUsername = null;

export async function forceReleaseLocalLock() {
  if (!currentLocalLockUsername) return;
  try {
    const lock = await FileLock.findOne({ lockId: 'masterData' });
    if (lock && lock.lockedBy === currentLocalLockUsername) {
      lock.isLocked = false;
      lock.lockedBy = null;
      lock.lockedAt = null;
      lock.lockExpiresAt = null;
      await lock.save();
    }
  } catch (e) {
    console.error("Failed to force release lock on quit:", e);
  }
}

export function registerLockHandlers() {
  ipcMain.handle('acquire-lock', async (event, payload) => {
    const { username } = payload;
    try {
      // Find or create the masterData lock
      let lock = await FileLock.findOne({ lockId: 'masterData' });
      if (!lock) {
        lock = new FileLock({ lockId: 'masterData' });
      }

      const now = new Date();

      // Check if it's already locked and the lock hasn't expired
      if (lock.isLocked && lock.lockExpiresAt && lock.lockExpiresAt > now) {
        if (lock.lockedBy === username) {
          // It's already locked by this exact same user. Just refresh their timer.
          lock.lockedAt = now;
          lock.lockExpiresAt = new Date(now.getTime() + LOCK_DURATION_MS);
          await lock.save();
          return { success: true, message: 'Lock refreshed' };
        }
        
        // Someone else holds the lock
        return { 
          success: false, 
          message: `Cannot proceed. ${lock.lockedBy} is currently editing the database.` 
        };
      }

      // Lock is free, or it expired. Acquire it.
      lock.isLocked = true;
      lock.lockedBy = username;
      lock.lockedAt = now;
      lock.lockExpiresAt = new Date(now.getTime() + LOCK_DURATION_MS);
      
      await lock.save();
      currentLocalLockUsername = username;
      
      return { success: true, message: 'Lock acquired' };
    } catch (error) {
      console.error("Acquire lock failed:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('release-lock', async (event, payload) => {
    const { username } = payload;
    try {
      const lock = await FileLock.findOne({ lockId: 'masterData' });
      if (!lock) return { success: true };

      // Only release if the person asking to release is the one who holds it, 
      // or if it's already expired anyway
      if (lock.lockedBy === username || (lock.lockExpiresAt && lock.lockExpiresAt <= new Date())) {
        lock.isLocked = false;
        lock.lockedBy = null;
        lock.lockedAt = null;
        lock.lockExpiresAt = null;
        await lock.save();
        if (lock.lockedBy === currentLocalLockUsername) {
          currentLocalLockUsername = null;
        }
      }

      return { success: true };
    } catch (error) {
      console.error("Release lock failed:", error);
      return { success: false, message: error.message };
    }
  });
}
