import { app, BrowserWindow } from 'electron'
import { connectDB } from './db/connect.js'
import { createWindow } from './window.js'
import { registerIpcHandlers } from './ipc/index.js'
import { executeSilentBackup } from './ipc/adminHandlers.js'
import { forceReleaseLocalLock } from './ipc/lockHandlers.js'

import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In production, the built main.js is inside dist-electron/
// We need to resolve the path to the dist folder
process.env.DIST = path.join(__dirname, '../dist');
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL 
  ? path.join(__dirname, '../public') 
  : process.env.DIST;

app.whenReady().then(() => {
  // Connect to MongoDB
  connectDB();

  // Create the Main Window
  createWindow();

  // Register all IPC Handlers (Auth, Data, CeptCreate, etc.)
  registerIpcHandlers();

  // Setup the Timed Loop (Every 2 hours)
  const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
  setInterval(async () => {
    console.log("Running timed background backup...");
    await executeSilentBackup('TimedLoop');
  }, TWO_HOURS_MS);
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    console.log("App closing. Running final MongoDB backup...");
    await executeSilentBackup('AppClose');
    await forceReleaseLocalLock(); // Safely clear any stranded lock
    console.log("Backup complete. Shutting down.");
    app.quit()
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
});
