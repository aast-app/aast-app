import { ipcMain } from 'electron';
import bcrypt from 'bcryptjs';
import { User, Log } from '../db/models.js';

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
}
