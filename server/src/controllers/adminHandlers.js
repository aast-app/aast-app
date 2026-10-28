import { registerAction } from '../routes/actions.js';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/connect.js';

import { buildBackup, encryptBackup, executeSilentBackup, listBackups, previewRestore, restoreBackup } from '../services/backup.js';

export function registerAdminHandlers(router) {
  registerAction(router, 'admin-list-backups', async () => ({ success: true, backups: await listBackups() }));
  registerAction(router, 'admin-preview-backup', previewRestore);
  registerAction(router, 'admin-restore-backup', restoreBackup);
  // 1. Get all users
  registerAction(router, 'admin-get-users', async ({ adminUsername }) => {
    try {
      const admin = await prisma.user.findUnique({ where: { username: adminUsername } });
      if (!admin || admin.role !== 'admin') {
        return { success: false, message: 'Unauthorized. Admin access required.' };
      }

      const users = await prisma.user.findMany({ 
        where: { isDeleted: false }, 
        select: { id: true, username: true, role: true },
        orderBy: { createdAt: 'desc' }
      });
      return { success: true, users: users.map(u => ({ id: u.id.toString(), username: u.username, role: u.role })) };
    } catch (error) {
      console.error("Fetch Users Error:", error);
      return { success: false, message: 'Failed to fetch users.' };
    }
  });

  // 2. Create new user
  registerAction(router, 'admin-create-user', async ({ adminUsername, newUsername, newPassword, newRole }) => {
    try {
      const admin = await prisma.user.findUnique({ where: { username: adminUsername } });
      if (!admin || admin.role !== 'admin') {
        return { success: false, message: 'Unauthorized. Admin access required.' };
      }

      if (typeof newUsername !== 'string' || typeof newPassword !== 'string' || !newUsername.trim() || newUsername.length > 200 || newPassword.length < 8 || newPassword.length > 1024 || !['admin', 'user'].includes(newRole)) {
        return { success: false, message: 'Username, password, and role are required.' };
      }

      const existingUser = await prisma.user.findUnique({ where: { username: newUsername } });
      if (existingUser) {
        return { success: false, message: 'Username already exists.' };
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.user.create({
        data: {
          username: newUsername,
          password: hashedPassword,
          role: newRole
        }
      });

      await prisma.log.create({
        data: {
          username: adminUsername,
          action: 'Create User',
          details: `Created new ${newRole} account: ${newUsername}`
        }
      });

      return { success: true, message: `Successfully created ${newRole} account for ${newUsername}.` };
    } catch (error) {
      console.error("Create User Error:", error);
      return { success: false, message: 'Failed to create user.' };
    }
  });

  // 3. Edit existing user
  registerAction(router, 'admin-edit-user', async ({ adminUsername, targetUsername, newUsername, newPassword, newRole }) => {
    try {
      const admin = await prisma.user.findUnique({ where: { username: adminUsername } });
      if (!admin || admin.role !== 'admin') {
        return { success: false, message: 'Unauthorized. Admin access required.' };
      }

      const targetUser = await prisma.user.findUnique({ where: { username: targetUsername } });
      if (!targetUser) {
        return { success: false, message: 'Target user not found.' };
      }

      if (targetUser.role === 'admin' && adminUsername !== targetUsername) {
        return { success: false, message: 'Permission denied: Cannot edit another admin.' };
      }

      const updates = {};
      
      if (newPassword && newPassword.trim() !== '') {
        updates.password = await bcrypt.hash(newPassword, 10);
      }

      if (newRole && ['admin', 'user'].includes(newRole)) {
        if (adminUsername === targetUsername && newRole !== 'admin') {
           return { success: false, message: 'You cannot remove your own admin privileges.' };
        }
        updates.role = newRole;
      }

      if (newUsername && newUsername.trim() !== '' && newUsername !== targetUsername) {
        const existingUser = await prisma.user.findUnique({ where: { username: newUsername.trim() } });
        if (existingUser) {
          return { success: false, message: 'Username already taken.' };
        }
        updates.username = newUsername.trim();
      }

      if (Object.keys(updates).length === 0) {
        return { success: false, message: 'No changes provided.' };
      }

      await prisma.user.update({ where: { username: targetUsername }, data: updates });

      await prisma.log.create({
        data: {
          username: adminUsername,
          action: 'Edit User',
          details: `Modified account: ${targetUsername}${updates.username ? ` (Renamed to ${updates.username})` : ''}`
        }
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
  registerAction(router, 'admin-delete-user', async ({ adminUsername, targetUsername }) => {
    try {
      const admin = await prisma.user.findUnique({ where: { username: adminUsername } });
      if (!admin || admin.role !== 'admin') {
        return { success: false, message: 'Unauthorized. Admin access required.' };
      }

      if (adminUsername === targetUsername) {
        return { success: false, message: 'Permission denied: Cannot delete your own account.' };
      }

      const targetUser = await prisma.user.findUnique({ where: { username: targetUsername } });
      if (!targetUser || targetUser.isDeleted) {
        return { success: false, message: 'Target user not found or already deleted.' };
      }

      if (targetUser.role === 'admin') {
        return { success: false, message: 'Permission denied: Cannot delete another admin account.' };
      }

      await prisma.user.update({ where: { username: targetUsername }, data: { isDeleted: true } });

      await prisma.log.create({
        data: {
          username: adminUsername,
          action: 'Delete User',
          details: `Soft deleted account: ${targetUsername}`
        }
      });

      return { success: true, message: `Successfully deleted user ${targetUsername}.` };
    } catch (error) {
      console.error("Delete User Error:", error);
      return { success: false, message: 'Failed to delete user.' };
    }
  });

  // 5. Get Log Filters
  registerAction(router, 'admin-get-log-filters', async ({ adminUsername }) => {
    try {
      const admin = await prisma.user.findUnique({ where: { username: adminUsername } });
      if (!admin || admin.role !== 'admin') {
        return { success: false, message: 'Unauthorized.' };
      }
      
      const distinctUsers = await prisma.log.groupBy({ by: ['username'] });
      const userNames = distinctUsers.map(u => u.username);
      
      const users = await prisma.user.findMany({ 
        where: { username: { in: userNames } }, 
        select: { id: true, username: true, role: true } 
      });
      
      const distinctActions = await prisma.log.groupBy({ by: ['action'] });
      const actions = distinctActions.map(a => a.action);
      
      return { success: true, users: users.map(u => ({ id: u.id.toString(), username: u.username, role: u.role })), actions };
    } catch (error) {
      console.error("Fetch Log Filters Error:", error);
      return { success: false, message: 'Failed to fetch filters.' };
    }
  });

  // 6. Get Logs (Aggregated)
  registerAction(router, 'admin-get-logs', async ({ adminUsername, filterUser, filterAction, filterType, filterDate, page = 1, limit = 25 }) => {
    try {
      const admin = await prisma.user.findUnique({ where: { username: adminUsername } });
      if (!admin || admin.role !== 'admin') {
        return { success: false, message: 'Unauthorized.' };
      }

      const where = {};
      if (filterUser && filterUser !== 'All Users') where.username = filterUser;
      if (filterAction && filterAction !== 'All Actions') where.action = filterAction;
      if (filterType === 'Errors Only') where.action = 'Error';
      if (filterType === 'Normal Only') where.action = { not: 'Error' };
      if (filterDate) {
        const start = new Date(filterDate);
        start.setHours(0,0,0,0);
        const end = new Date(filterDate);
        end.setHours(23,59,59,999);
        where.timestamp = { gte: start, lte: end };
      }

      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.log.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip,
          take: limit
        }),
        prisma.log.count({ where })
      ]);

      // Manually join User to get role
      const usernames = [...new Set(logs.map(l => l.username))];
      const users = await prisma.user.findMany({ where: { username: { in: usernames } } });
      const userMap = {};
      users.forEach(u => userMap[u.username] = u);

      const data = logs.map(l => ({
        _id: l.id,
        username: l.username,
        action: l.action,
        details: l.details,
        metadata: l.metadata ? JSON.parse(l.metadata) : {},
        timestamp: l.timestamp,
        userId: userMap[l.username] ? userMap[l.username].id : null,
        role: userMap[l.username] ? userMap[l.username].role : 'unknown'
      }));

      return { success: true, logs: data, total, page, limit };
    } catch (error) {
      console.error("Fetch Logs Error:", error);
      return { success: false, message: 'Failed to fetch logs.' };
    }
  });

  // 7. Get Dashboard Stats
  registerAction(router, 'get-dashboard-stats', async ({ targetMonth } = {}) => {
    try {
      let datePrefix = targetMonth;
      if (!datePrefix) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        datePrefix = `${year}-${month}`; // e.g., '2026-08'
      }

      const metaDocs = await prisma.dailyMetaData.findMany({
        where: { activityDate: { startsWith: datePrefix } }
      });

      let monthlyIdFiles = 0;
      let monthlyScoreFiles = 0;
      let monthlyTablesGenerated = 0;
      let monthlyPdfsGenerated = 0;

      metaDocs.forEach(meta => {
        if (meta.ceptCreate) {
          const ceptCreate = JSON.parse(meta.ceptCreate);
          monthlyTablesGenerated += ceptCreate.tablesGenerated || 0;
          monthlyPdfsGenerated += ceptCreate.loginPdfsGenerated || 0;
        }
        if (meta.ceptData) {
          const ceptData = JSON.parse(meta.ceptData);
          if (ceptData.length > 0) {
            ceptData.forEach(record => {
              monthlyIdFiles += record.maxIdFiles || 0;
              monthlyScoreFiles += record.maxScoreFiles || 0;
            });
          }
        }
      });

      return { success: true, monthlyIdFiles, monthlyScoreFiles, monthlyTablesGenerated, monthlyPdfsGenerated };
    } catch (error) {
      console.error("Dashboard Stats Error:", error);
      return { success: false, monthlyIdFiles: 0, monthlyScoreFiles: 0 };
    }
  });

  // 7.5 Get Detailed Dashboard Stats (Table)
  registerAction(router, 'get-dashboard-details', async ({ filterMonth, filterDay, filterUser } = {}) => {
    try {
      const where = {};
      if (filterDay && filterDay !== '') {
        where.activityDate = filterDay;
      } else if (filterMonth && filterMonth !== 'All Months') {
        where.activityDate = { startsWith: filterMonth };
      }

      const metaDocs = await prisma.dailyMetaData.findMany({ where, orderBy: { activityDate: 'desc' } });
      
      let detailedData = metaDocs.map(meta => {
        let dailyIds = 0;
        let dailyScores = 0;
        let ceptCreate = meta.ceptCreate ? JSON.parse(meta.ceptCreate) : {};
        let ceptData = meta.ceptData ? JSON.parse(meta.ceptData) : [];
        let dailyTables = ceptCreate.tablesGenerated || 0;
        let dailyPdfs = ceptCreate.loginPdfsGenerated || 0;
        let contributorsSet = new Set();

        if (ceptData.length > 0) {
          ceptData.forEach(record => {
            dailyIds += record.maxIdFiles || 0;
            dailyScores += record.maxScoreFiles || 0;
            if (record.contributors && record.contributors.length > 0) {
              record.contributors.forEach(c => contributorsSet.add(c));
            }
          });
        }

        if (ceptCreate.contributors) {
          ceptCreate.contributors.forEach(c => contributorsSet.add(c));
        }

        return {
          date: meta.activityDate,
          ids: dailyIds,
          scores: dailyScores,
          tables: dailyTables,
          pdfs: dailyPdfs,
          contributors: Array.from(contributorsSet)
        };
      });

      if (filterUser && filterUser !== 'All Users') {
        detailedData = detailedData.filter(day => day.contributors.includes(filterUser));
      }

      return { success: true, details: detailedData };
    } catch (error) {
      console.error("Dashboard Details Error:", error);
      return { success: false, details: [] };
    }
  });

  // 7.6 Get Dashboard Filters
  registerAction(router, 'get-dashboard-filters', async () => {
    try {
      const metaDocs = await prisma.dailyMetaData.findMany({
        select: { activityDate: true, ceptData: true, ceptCreate: true }
      });
      
      const monthsSet = new Set();
      const daysSet = new Set();
      const usersSet = new Set();

      metaDocs.forEach(meta => {
        if (meta.activityDate) {
          const parts = meta.activityDate.split('-');
          if (parts.length === 3) {
            monthsSet.add(`${parts[0]}-${parts[1]}`); // YYYY-MM
            daysSet.add(parts[2]); // DD
          }
        }

        if (meta.ceptData) {
          const ceptData = JSON.parse(meta.ceptData);
          ceptData.forEach(record => {
            if (record.contributors) record.contributors.forEach(c => usersSet.add(c));
          });
        }
        if (meta.ceptCreate) {
          const ceptCreate = JSON.parse(meta.ceptCreate);
          if (ceptCreate.contributors) {
            ceptCreate.contributors.forEach(c => usersSet.add(c));
          }
        }
      });

      const months = Array.from(monthsSet).sort().reverse();
      const days = Array.from(daysSet).sort();
      const users = Array.from(usersSet).sort();

      return { success: true, months, days, users };
    } catch (error) {
      console.error("Dashboard Filters Error:", error);
      return { success: false, months: [], days: [], users: [] };
    }
  });

  // 8. Export Database
  registerAction(router, 'admin-export-db', async ({ adminUsername, mode, passphrase }) => {
    try {
      if (mode === 'silent') {
        return await executeSilentBackup(adminUsername);
      }

      const admin = await prisma.user.findUnique({ where: { username: adminUsername } });
      if (!admin || admin.role !== 'admin') {
        return { success: false, message: 'Unauthorized. Admin access required.' };
      }

      if (typeof passphrase !== 'string' || passphrase.length < 12) return { success: false, message: 'Choose a backup passphrase of at least 12 characters.' };
      const backup = await encryptBackup(await buildBackup(adminUsername), passphrase);
      return { success: true, message: 'Backup ready for download.', fileName: `CEPT_Full_Backup_${new Date().toISOString().slice(0, 10)}.json`, backup };

    } catch (error) {
      console.error("DB Export Error:", error);
      return { success: false, message: `Failed to export database: ${error.message}` };
    }
  });
}
