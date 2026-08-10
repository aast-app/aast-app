import { app, ipcMain } from 'electron';
import bcrypt from 'bcryptjs';
import { User, Log, AppSettings } from '../db/models.js';
import https from 'https';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

export function registerAuthHandlers() {
  ipcMain.handle('auth-login', async (event, { username, password }) => {
    try {
      if (!username || !password) {
        return { success: false, message: 'Username and password are required.' };
      }

      // Find user by username, ensuring they are not soft-deleted
      const user = await User.findOne({ username, isDeleted: { $ne: true } });
      if (!user) {
        // Return a generic error so attackers don't know if the username exists
        return { success: false, message: 'Invalid username or password.' };
      }

      // Compare the provided password with the hashed password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return { success: false, message: 'Invalid username or password.' };
      }

      // Automatically log that the user just logged in
      await Log.create({
        username: user.username,
        action: 'Login',
        details: 'User successfully logged in.'
      });

      // Never return the hashed password to the frontend, only safe data
      return {
        success: true,
        user: {
          username: user.username,
          role: user.role
        }
      };
    } catch (error) {
      console.error("Login Error:", error);
      return { success: false, message: 'Connection error. Please ensure you have internet access.' };
    }
  });

  ipcMain.handle('check-app-version', async () => {
    try {
      const localVersion = app.getVersion();
      let settings = await AppSettings.findOne();
      
      if (!settings) {
        settings = await AppSettings.create({ latestAppVersion: '0.1.0' });
      } else if (!settings.downloadUrl) {
        settings.downloadUrl = 'https://github.com/aast-app/aast-app/releases/download/v0.1.0/IEC.AAST.App.Setup.0.1.0.exe';
        await settings.save();
      }
      
      return { 
        success: true, 
        localVersion, 
        latestVersion: settings.latestAppVersion,
        isOutdated: localVersion !== settings.latestAppVersion,
        downloadUrl: settings.downloadUrl
      };
    } catch (error) {
      console.error("Version check error:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('download-update', async (event, { url }) => {
    return new Promise((resolve, reject) => {
      try {
        const destPath = path.join(os.tmpdir(), 'AAST_App_Update.exe');
        const fileStream = fs.createWriteStream(destPath);

        const download = (currentUrl) => {
          https.get(currentUrl, (response) => {
            // Handle redirects (GitHub uses 302 to redirect to S3)
            if (response.statusCode === 301 || response.statusCode === 302) {
              return download(response.headers.location);
            }

            if (response.statusCode !== 200) {
              return resolve({ success: false, message: `Failed to download. Status code: ${response.statusCode}` });
            }

            const totalBytes = parseInt(response.headers['content-length'], 10);
            let downloadedBytes = 0;

            response.on('data', (chunk) => {
              downloadedBytes += chunk.length;
              if (totalBytes) {
                const percentage = Math.round((downloadedBytes / totalBytes) * 100);
                event.sender.send('download-progress', { percentage });
              }
            });

            response.pipe(fileStream);

            fileStream.on('finish', () => {
              fileStream.close(() => {
                // Launch the downloaded installer detached
                try {
                  const child = spawn(destPath, [], {
                    detached: true,
                    stdio: 'ignore',
                    shell: true
                  });
                  child.unref(); // Allows the main process to exit independently

                  // Safely quit the Electron app immediately so files can be overwritten
                  app.quit();
                  resolve({ success: true });
                } catch (spawnErr) {
                  console.error("Failed to spawn installer:", spawnErr);
                  resolve({ success: false, message: "Failed to launch installer." });
                }
              });
            });
          }).on('error', (err) => {
            fs.unlink(destPath, () => {});
            console.error("Download stream error:", err);
            resolve({ success: false, message: err.message });
          });
        };

        download(url);
      } catch (err) {
        console.error("General download error:", err);
        resolve({ success: false, message: err.message });
      }
    });
  });
}
