import { ipcMain, dialog, app } from 'electron';
import bcrypt from 'bcryptjs';
import { User, Log, DailyOperation } from '../db/models.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function executeSilentBackup(triggerSource = 'System') {
  try {
    const users = await User.find({}, { password: 0 }).lean();
    const logs = await Log.find({}).lean();
    const ops = await DailyOperation.find({}).lean();

    const dbDump = JSON.stringify({
      exportDate: new Date().toISOString(),
      exportedBy: triggerSource,
      collections: { users, logs, dailyOperations: ops }
    }, null, 2);

    const primaryBase = path.join(os.homedir(), 'OneDrive - Arab Academy for Science and Technology', 'AAST App Database');
    const secondaryBase = path.join(os.homedir(), 'OneDrive - Arab Academy for Science and Technology', "Youssef Wael Atia's files - AAST App Database");
    
    let baseDir = primaryBase;
    if (!fs.existsSync(primaryBase) && fs.existsSync(secondaryBase)) {
      baseDir = secondaryBase;
    }

    const backupsDir = path.join(baseDir, 'Backups', 'DB');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const savePath = path.join(backupsDir, `backup_${timestamp}.json`);

    let existingFiles = fs.readdirSync(backupsDir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(backupsDir, f),
        time: fs.statSync(path.join(backupsDir, f)).mtime.getTime()
      }))
      .sort((a, b) => a.time - b.time); // Oldest first

    if (existingFiles.length >= 20) {
      const filesToDelete = existingFiles.length - 19;
      for (let i = 0; i < filesToDelete; i++) {
        fs.unlinkSync(existingFiles[i].path);
      }
    }

    fs.writeFileSync(savePath, dbDump, 'utf8');
    return { success: true, message: `Backup saved to ${savePath}` };
  } catch (error) {
    console.error("Silent Backup Error:", error);
    return { success: false, message: error.message };
  }
}

export function registerAdminHandlers() {
  // 1. Get all users
  ipcMain.handle('admin-get-users', async (event, { adminUsername }) => {
    try {
      // Verify requester is admin
      const admin = await User.findOne({ username: adminUsername });
      if (!admin || admin.role !== 'admin') {
        return { success: false, message: 'Unauthorized. Admin access required.' };
      }

      // Fetch all users but exclude passwords and soft-deleted users
      const users = await User.find({ isDeleted: { $ne: true } }, { password: 0 }).sort({ createdAt: -1 });
      return { success: true, users: users.map(u => ({ id: u._id.toString(), username: u.username, role: u.role })) };
    } catch (error) {
      console.error("Fetch Users Error:", error);
      return { success: false, message: 'Failed to fetch users.' };
    }
  });

  // 2. Create new user
  ipcMain.handle('admin-create-user', async (event, { adminUsername, newUsername, newPassword, newRole }) => {
    try {
      const admin = await User.findOne({ username: adminUsername });
      if (!admin || admin.role !== 'admin') {
        return { success: false, message: 'Unauthorized. Admin access required.' };
      }

      if (!newUsername || !newPassword || !newRole) {
        return { success: false, message: 'Username, password, and role are required.' };
      }

      const existingUser = await User.findOne({ username: newUsername });
      if (existingUser) {
        return { success: false, message: 'Username already exists.' };
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await User.create({
        username: newUsername,
        password: hashedPassword,
        role: newRole
      });

      await Log.create({
        username: adminUsername,
        action: 'Create User',
        details: `Created new ${newRole} account: ${newUsername}`
      });

      return { success: true, message: `Successfully created ${newRole} account for ${newUsername}.` };
    } catch (error) {
      console.error("Create User Error:", error);
      return { success: false, message: 'Failed to create user.' };
    }
  });

  // 3. Edit existing user
  ipcMain.handle('admin-edit-user', async (event, { adminUsername, targetUsername, newUsername, newPassword, newRole }) => {
    try {
      const admin = await User.findOne({ username: adminUsername });
      if (!admin || admin.role !== 'admin') {
        return { success: false, message: 'Unauthorized. Admin access required.' };
      }

      const targetUser = await User.findOne({ username: targetUsername });
      if (!targetUser) {
        return { success: false, message: 'Target user not found.' };
      }

      // PERMISSION CHECK: 
      // Admin can edit themselves.
      // Admin can edit a 'user'.
      // Admin CANNOT edit another 'admin'.
      if (targetUser.role === 'admin' && adminUsername !== targetUsername) {
        return { success: false, message: 'Permission denied: Cannot edit another admin.' };
      }

      const updates = {};
      
      // Update password if provided
      if (newPassword && newPassword.trim() !== '') {
        updates.password = await bcrypt.hash(newPassword, 10);
      }

      // Update role if provided (and if the target isn't changing their own role to 'user' which could lock them out)
      if (newRole && ['admin', 'user'].includes(newRole)) {
        if (adminUsername === targetUsername && newRole !== 'admin') {
           return { success: false, message: 'You cannot remove your own admin privileges.' };
        }
        updates.role = newRole;
      }

      // Update username if provided
      if (newUsername && newUsername.trim() !== '' && newUsername !== targetUsername) {
        const existingUser = await User.findOne({ username: newUsername.trim() });
        if (existingUser) {
          return { success: false, message: 'Username already taken.' };
        }
        updates.username = newUsername.trim();
      }

      if (Object.keys(updates).length === 0) {
        return { success: false, message: 'No changes provided.' };
      }

      await User.updateOne({ username: targetUsername }, { $set: updates });

      await Log.create({
        username: adminUsername,
        action: 'Edit User',
        details: `Modified account: ${targetUsername}${updates.username ? ` (Renamed to ${updates.username})` : ''}`
      });

      return { 
        success: true, 
        message: `Successfully updated user ${updates.username ? updates.username : targetUsername}.`,
        newUsername: updates.username || targetUsername
      };
    } catch (error) {
      console.error("Edit User Error:", error);
      return { success: false, message: 'Failed to edit user.' };
    }
  });

  // 4. Soft Delete user
  ipcMain.handle('admin-delete-user', async (event, { adminUsername, targetUsername }) => {
    try {
      const admin = await User.findOne({ username: adminUsername });
      if (!admin || admin.role !== 'admin') {
        return { success: false, message: 'Unauthorized. Admin access required.' };
      }

      if (adminUsername === targetUsername) {
        return { success: false, message: 'Permission denied: Cannot delete your own account.' };
      }

      const targetUser = await User.findOne({ username: targetUsername, isDeleted: { $ne: true } });
      if (!targetUser) {
        return { success: false, message: 'Target user not found or already deleted.' };
      }

      if (targetUser.role === 'admin') {
        return { success: false, message: 'Permission denied: Cannot delete another admin account.' };
      }

      // Perform soft delete
      targetUser.isDeleted = true;
      await targetUser.save();

      await Log.create({
        username: adminUsername,
        action: 'Delete User',
        details: `Soft deleted account: ${targetUsername}`
      });

      return { success: true, message: `Successfully deleted user ${targetUsername}.` };
    } catch (error) {
      console.error("Delete User Error:", error);
      return { success: false, message: 'Failed to delete user.' };
    }
  });
  // 5. Get Log Filters
  ipcMain.handle('admin-get-log-filters', async (event, { adminUsername }) => {
    try {
      const admin = await User.findOne({ username: adminUsername });
      if (!admin || admin.role !== 'admin') {
        return { success: false, message: 'Unauthorized.' };
      }
      
      const distinctUsers = await Log.distinct('username');
      const users = await User.find({ username: { $in: distinctUsers } }, { _id: 1, username: 1, role: 1 });
      const actions = await Log.distinct('action');
      
      return { success: true, users: users.map(u => ({ id: u._id.toString(), username: u.username, role: u.role })), actions };
    } catch (error) {
      console.error("Fetch Log Filters Error:", error);
      return { success: false, message: 'Failed to fetch filters.' };
    }
  });

  // 6. Get Logs (Aggregated)
  ipcMain.handle('admin-get-logs', async (event, { adminUsername, filterUser, filterAction, filterType, filterDate, page = 1, limit = 25 }) => {
    try {
      const admin = await User.findOne({ username: adminUsername });
      if (!admin || admin.role !== 'admin') {
        return { success: false, message: 'Unauthorized.' };
      }

      const matchStage = {};
      if (filterUser && filterUser !== 'All Users') matchStage.username = filterUser;
      if (filterAction && filterAction !== 'All Actions') matchStage.action = filterAction;
      if (filterType === 'Errors Only') matchStage.action = 'Error';
      if (filterType === 'Normal Only') matchStage.action = { $ne: 'Error' };
      if (filterDate) {
        const start = new Date(filterDate);
        start.setHours(0,0,0,0);
        const end = new Date(filterDate);
        end.setHours(23,59,59,999);
        matchStage.timestamp = { $gte: start, $lte: end };
      }

      const skip = (page - 1) * limit;

      const pipeline = [
        { $match: matchStage },
        { $sort: { timestamp: -1 } },
        {
          $lookup: {
            from: 'users',
            localField: 'username',
            foreignField: 'username',
            as: 'userInfo'
          }
        },
        {
          $unwind: {
            path: '$userInfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            username: 1,
            action: 1,
            details: 1,
            metadata: 1,
            timestamp: 1,
            userId: '$userInfo._id',
            role: '$userInfo.role'
          }
        },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [{ $skip: skip }, { $limit: limit }]
          }
        }
      ];

      const result = await Log.aggregate(pipeline);
      const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;
      const data = result[0].data;

      return { success: true, logs: data, total, page, limit };
    } catch (error) {
      console.error("Fetch Logs Error:", error);
      return { success: false, message: 'Failed to fetch logs.' };
    }
  });

  // 7. Get Dashboard Stats
  ipcMain.handle('get-dashboard-stats', async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);

      const logs = await Log.find({
        action: { $in: ['ID Export', 'Scores Export'] },
        timestamp: { $gte: startOfMonth }
      });

      let filesProcessed = 0;
      logs.forEach(log => {
        if (log.action === 'ID Export' && log.metadata && log.metadata.fileCount) {
          filesProcessed += log.metadata.fileCount;
        } else if (log.action === 'Scores Export') {
          filesProcessed += 1;
        }
      });

      return { success: true, filesProcessed };
    } catch (error) {
      console.error("Dashboard Stats Error:", error);
      return { success: false, filesProcessed: 0 };
    }
  });

  // 8. Export Database
  ipcMain.handle('admin-export-db', async (event, { adminUsername, mode }) => {
    try {
      // If silent, just use the decoupled function (no admin auth required)
      if (mode === 'silent') {
        return await executeSilentBackup(adminUsername);
      }

      // If manual export, MUST verify admin role
      const admin = await User.findOne({ username: adminUsername });
      if (!admin || admin.role !== 'admin') {
        return { success: false, message: 'Unauthorized. Admin access required.' };
      }

      const users = await User.find({}, { password: 0 }).lean(); 
      const logs = await Log.find({}).lean();
      const ops = await DailyOperation.find({}).lean();

      const dbDump = JSON.stringify({
        exportDate: new Date().toISOString(),
        exportedBy: adminUsername,
        collections: { users, logs, dailyOperations: ops }
      }, null, 2);

      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export Database Backup',
        defaultPath: `AAST_DB_Backup_${new Date().toISOString().split('T')[0]}.json`,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
      });
      
      if (canceled || !filePath) {
        return { success: false, message: 'Export canceled by user.' };
      }
      
      fs.writeFileSync(filePath, dbDump, 'utf8');
      return { success: true, message: `Backup saved to ${filePath}` };

    } catch (error) {
      console.error("DB Export Error:", error);
      return { success: false, message: `Failed to export database: ${error.message}` };
    }
  });
}
