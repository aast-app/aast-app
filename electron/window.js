import { BrowserWindow } from 'electron';
import { join } from 'node:path';

let mainWindow;

export function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    title: 'IEC AAST App',
    icon: join(process.env.PUBLIC, 'logo2.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // In development, load the Vite server URL. In production, load the built HTML file.
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(join(process.env.DIST, 'index.html'));
  }

  return mainWindow;
}

export function getMainWindow() {
  return mainWindow;
}
