import { ipcMain } from 'electron';
import { chromium } from 'playwright';

export function registerPlaywrightHandlers() {
  ipcMain.handle('test-automation', async () => {
    let browser = null;
    try {
      console.log("Launching Playwright test...");
      
      // Launch browser visibly with a 2-second delay on every action for debugging
      browser = await chromium.launch({
        headless: false,
        slowMo: 2000
      });

      const context = await browser.newContext();
      const page = await context.newPage();

      // Go directly to the Staff Portal to avoid Google's bot detection
      await page.goto('https://staffportal.aast.edu/');

      // Wait for the portal page to finish loading
      await page.waitForLoadState('networkidle');

      // Fill in the Employee Number (finds the first text/user input)
      const empInput = page.locator('input[name*="user"], input[name*="emp"], input[type="text"]').first();
      await empInput.fill('141556');

      // Fill in the Password
      const passInput = page.locator('input[type="password"]').first();
      await passInput.fill('testing');

      // Find and click the login/submit button
      // We look for input[type="submit"] or any button and click the first one
      const loginBtn = page.locator('input[type="submit"], button, .loginBtn, #loginBtn').first();
      await loginBtn.click();

      // Wait a few seconds so the user can see the result before it closes
      await page.waitForTimeout(4000);

      await browser.close();
      return { success: true, message: 'Test completed successfully.' };

    } catch (error) {
      console.error("Playwright Error:", error);
      if (browser) await browser.close();
      return { success: false, message: error.message };
    }
  });
}
