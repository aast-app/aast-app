import { registerAction } from '../routes/actions.js';
import { chromium } from 'playwright';

let automationRunning = false;

export function registerPlaywrightHandlers(router) {
  registerAction(router, 'test-automation', async (data) => {
    if (process.env.VERCEL) return { success: false, message: 'Direct enrollment needs a local browser for portal sign-in. Use the local application for this helper; hosted document creation is available here.' };
    let browser = null;
    let failedNumbers = [];
    let successfulNumbers = [];
    
    const targetRegNums = data?.numbers;
    if (!Array.isArray(targetRegNums) || !targetRegNums.length || targetRegNums.some(number => typeof number !== 'string' || !number.trim())) return { success: false, message: 'Provide registration numbers to enroll.' };
    if (automationRunning) return { success: false, message: 'An enrollment run is already in progress.' };
    automationRunning = true;

    try {
      console.log("Launching Playwright test...");
      
      browser = await chromium.launch({
        headless: false,
        channel: process.env.AUTOMATION_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined),
      });

      const context = await browser.newContext();
      const page = await context.newPage();

      // Go directly to the AAST Identity Login Portal
      await page.goto('https://aastmtic.aast.edu/Identity/Account/Login?ReturnUrl=%2FIdentity%2Fconnect%2Fauthorize%2Fcallback%3Fclient_id%3DAdmissionAdminUI%26redirect_uri%3Dhttps%253A%252F%252Faastmtic.aast.edu%252Fadmission%252Fadmin%252Fui%252Fauthentication%252Flogin-callback%252F%26response_type%3Dcode%26scope%3Dopenid%2520profile%2520openid%2520profile%2520AdmissionAdminUI%26state%3D1fe3165380c442acb01fdaa4a36ed172%26code_challenge%3Do1uLgRc4D6yP1JLKyqcK1m1THiCtKS_dTTRzqDmkvbM%26code_challenge_method%3DS256%26response_mode%3Dquery');

      // Wait for manual login and the appearance of the specific header
      console.log("Waiting for user to manually log in and reach AASTMT Admission...");
      await page.getByText('AASTMT Admission', { exact: false }).first().waitFor({ timeout: 300000 });
      console.log("Login detected! Taking over automation...");

      // 1- in the side bar click on English Exam
      await page.getByText('English Exam', { exact: false }).first().click({ timeout: 300000 });
      await page.waitForTimeout(2000); // 1 sec interval

      // 2- from the drop down click on Exam sessions
      await page.getByText('Exam sessions', { exact: false }).first().click();
      
      // 3- wait for right content to fully load (wait for network to be idle)
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000); // extra safety wait

      // We will loop through the registration numbers
      for (const regNum of targetRegNums) {
        
        // 4 & 5 - target the row with Session Capacity 61 and click Direct enroll
        // We look for a row that contains '61' and then find the 'Direct enroll' button inside it
        const targetRow = page.locator('tr').filter({ hasText: '61' }).first();
        await targetRow.getByRole('button', { name: /Direct enroll/i }).click();
        await page.waitForTimeout(2000);

        // 6 & 7 - in the input box for RegNum
        const regInput = page.locator('input:visible').first();
        await regInput.waitFor({ state: 'visible', timeout: 60000 });
        await page.waitForTimeout(2000); // Wait 2 seconds before interacting
        
        await regInput.click();
        await page.waitForTimeout(2000);
        
        await regInput.fill(''); // clear
        await page.waitForTimeout(2000);
        
        // Type it out slowly like a human (100ms per character) instead of instantly pasting
        await regInput.type(String(regNum), { delay: 100 });
        await page.waitForTimeout(2000);

        // 8 - trigger search by clicking the input's label to avoid closing the modal by clicking the background
        await page.locator('label').first().click();
        await page.waitForTimeout(2000);
        
        console.log(`Checking number ${regNum}...`);
        
        const errorLocator = page.getByText('Error', { exact: false }).first();
        const successLocator = page.getByText('Student Found', { exact: false }).first(); 

        try {
          await Promise.race([
            errorLocator.waitFor({ state: 'visible', timeout: 10000 }),
            successLocator.waitFor({ state: 'visible', timeout: 10000 })
          ]);
        } catch {
          console.log(`Timeout waiting for popup for ${regNum}`);
        }

        const isError = await errorLocator.isVisible();
        
        if (isError) {
          console.log(`${regNum} not found/Error.`);
          failedNumbers.push(regNum);
          
          // Click OK on the error popup safely
          await page.getByRole('button', { name: /^OK$/i }).filter({ visible: true }).first().click();
          await page.waitForTimeout(2000);
          
          // Close the main modal so the loop can safely click "Direct enroll" again for the next student
          await page.getByRole('button', { name: /^Close$|^Cancel$|^X$/i }).filter({ visible: true }).first().click().catch(() => {});
          await page.waitForTimeout(2000);
          
          continue; 
        } else {
          console.log(`${regNum} found successfully!`);

          
          // 9 - click OK to close the confirmation popup
          await page.getByRole('button', { name: /^OK$/i }).filter({ visible: true }).first().click();
          await page.waitForTimeout(2000);
          
          // Click Confirm Enrollment on the main modal
          // Safely using getByText in case it's not a formal <button> element
          await page.getByText('Confirm Enrollment', { exact: false }).filter({ visible: true }).first().click();
          await page.waitForTimeout(2000);
          
          // Click Confirm on the new popup
          await page.getByText('Confirm', { exact: true }).filter({ visible: true }).first().click();
          await page.waitForTimeout(2000);
          
          // Click OK on the final success popup
          await page.getByRole('button', { name: /^OK$/i }).filter({ visible: true }).first().click();
          await page.waitForTimeout(2000);
          
          successfulNumbers.push(regNum);

          // Modal should be completely closed here, ready to loop and click Direct Enroll again.
        }
      }

      return { success: true, failedNumbers, successfulNumbers };

    } catch (error) {
      console.error("Playwright Error:", error);
      // If we crashed, any number that wasn't successfully processed should be marked as failed
      for (const num of targetRegNums) {
        if (!successfulNumbers.includes(num) && !failedNumbers.includes(num)) {
          failedNumbers.push(num);
        }
      }
      return { success: false, message: error.message, failedNumbers, successfulNumbers };
    } finally {
      automationRunning = false;
      if (browser) await browser.close().catch(() => {});
    }
  });
}
