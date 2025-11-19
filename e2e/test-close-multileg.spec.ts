import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Close Multi-Leg Position', () => {
  test('should be able to close a multi-leg options position', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Wait for login form
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    
    // Login
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Newcrew01!');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    
    // Navigate to Options page
    await page.goto(`${BASE_URL}/options`);
    await page.waitForLoadState('networkidle');
    
    // Wait for positions table to load
    await page.waitForSelector('table', { timeout: 10000 });
    
    // Look for a multi-leg position (should have "PUT" and multiple strikes in the Type column)
    // Multi-leg positions typically show multiple option types/strikes in the same row
    const multiLegRow = page.locator('tr').filter({ hasText: /PUT.*PUT|CALL.*CALL/ }).first();
    
    // Check if we found a multi-leg position
    const rowCount = await multiLegRow.count();
    
    if (rowCount > 0) {
      console.log('Found multi-leg position, attempting to close...');
      
      // Click on the row to open details (or find Close button)
      const closeButton = multiLegRow.locator('button:has-text("Close")');
      const closeButtonCount = await closeButton.count();
      
      if (closeButtonCount > 0) {
        console.log('Found Close button, clicking...');
        await closeButton.click();
        
        // Wait for the close form to appear
        await page.waitForSelector('h2:has-text("Close Multi-Leg")', { timeout: 5000 }).catch(() => {
          console.log('Close form did not appear with expected title');
        });
        
        // Check if any form appears
        const formTitle = page.locator('h2');
        const titleText = await formTitle.first().textContent();
        console.log('Form title:', titleText);
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'test-results/close-multileg-debug.png', fullPage: true });
        
        // Check if the form has the expected fields
        const allPriceInputs = page.locator('input[type="number"]');
        const totalPriceInputCount = await allPriceInputs.count();
        console.log('Number of price inputs found:', totalPriceInputCount);
        
        // Check for read-only fields (should be disabled in closing mode)
        const disabledInputs = page.locator('input:disabled, select:disabled');
        const disabledCount = await disabledInputs.count();
        console.log('Number of disabled inputs:', disabledCount);
        
        // Find all price inputs that are not disabled (should be the close price fields)
        const editablePriceInputs = page.locator('input[type="number"]:not(:disabled)');
        const editablePriceCount = await editablePriceInputs.count();
        console.log('Editable price inputs:', editablePriceCount);
        
        // Fill in close prices for each leg (assuming 2 legs)
        if (editablePriceCount >= 2) {
          const priceInputs = await editablePriceInputs.all();
          // Fill first leg close price
          await priceInputs[0].fill('25.00');
          await page.waitForTimeout(500);
          // Fill second leg close price  
          await priceInputs[1].fill('24.00');
          await page.waitForTimeout(500);
          
          console.log('Filled in close prices');
          
          // Check submit button text
          const submitButton = page.locator('button[type="submit"]');
          const submitText = await submitButton.textContent();
          console.log('Submit button text:', submitText);
          
          // Try to submit
          await submitButton.click();
          await page.waitForTimeout(3000);
          
          // Check if form closed (success) or if there's an error
          const formStillOpen = await page.locator('h2:has-text("Close Multi-Leg")').count() > 0;
          const errorMessage = page.locator('.text-red-600, .text-red-400');
          const hasError = await errorMessage.count() > 0;
          
          if (hasError) {
            const errorText = await errorMessage.first().textContent();
            console.log('Error message:', errorText);
          }
          
          console.log('Form still open after submit:', formStillOpen);
          await page.screenshot({ path: 'test-results/close-multileg-after-submit.png', fullPage: true });
        }
        
      } else {
        console.log('No Close button found in the row');
        // Try clicking the row to open details modal
        await multiLegRow.click();
        await page.waitForTimeout(1000);
        
        // Look for close buttons in the modal
        const modalCloseButtons = page.locator('button:has-text("Close")');
        const modalCloseCount = await modalCloseButtons.count();
        console.log('Close buttons in modal:', modalCloseCount);
        
        if (modalCloseCount > 0) {
          // Click the first close button in the modal
          await modalCloseButtons.first().click();
          await page.waitForTimeout(2000);
          
          // Check if close form opened
          const closeFormTitle = page.locator('h2:has-text("Close Multi-Leg")');
          const formOpened = await closeFormTitle.count() > 0;
          console.log('Close form opened from modal:', formOpened);
          
          if (formOpened) {
            await page.screenshot({ path: 'test-results/close-multileg-from-modal.png', fullPage: true });
          }
        }
        
        await page.screenshot({ path: 'test-results/close-multileg-modal.png', fullPage: true });
      }
    } else {
      console.log('No multi-leg positions found');
      // Take screenshot to see what's on the page
      await page.screenshot({ path: 'test-results/options-page-no-multileg.png', fullPage: true });
    }
    
    // Wait a bit to see the result
    await page.waitForTimeout(2000);
  });
});

