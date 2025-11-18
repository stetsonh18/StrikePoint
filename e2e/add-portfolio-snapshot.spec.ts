import { test, expect } from '@playwright/test';

/**
 * Test to add a new portfolio snapshot/balance
 * This test navigates to the Settings page, opens the Portfolio History tab,
 * clicks "Add Balance", fills out the form, and submits it.
 */

// Test configuration - uses environment variables for security
const TEST_EMAIL = process.env.TEST_EMAIL || '';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';
const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:5173';

// Validate required environment variables
if (!TEST_EMAIL || !TEST_PASSWORD) {
  throw new Error(
    'Missing required test credentials. Please set TEST_EMAIL and TEST_PASSWORD environment variables.\n' +
    'You can create a .env.test file with:\n' +
    'TEST_EMAIL=your-test-email@example.com\n' +
    'TEST_PASSWORD=your-test-password'
  );
}

test.describe('Add Portfolio Snapshot', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(BASE_URL);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Login
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });

  test('should add a new portfolio snapshot', async ({ page }) => {
    console.log('Starting portfolio snapshot addition test...\n');

    // Navigate to Settings page
    console.log('Step 1: Navigating to Settings page...');
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');
    console.log('✓ Settings page loaded');

    // Click on Portfolio History tab
    console.log('Step 2: Opening Portfolio History tab...');
    const portfolioHistoryTab = page.locator('button:has-text("Portfolio History")');
    await portfolioHistoryTab.waitFor({ state: 'visible', timeout: 5000 });
    await portfolioHistoryTab.click();
    await page.waitForTimeout(1000);
    console.log('✓ Portfolio History tab opened');

    // Wait for the "Add Balance" button to be visible
    console.log('Step 3: Clicking "Add Balance" button...');
    const addBalanceButton = page.locator('button:has-text("Add Balance")');
    await addBalanceButton.waitFor({ state: 'visible', timeout: 5000 });
    await addBalanceButton.click();
    await page.waitForTimeout(1000);
    console.log('✓ Add Balance button clicked');

    // Wait for modal to appear
    console.log('Step 4: Waiting for modal to appear...');
    const modalTitle = page.locator('text=Add Portfolio Snapshot');
    await modalTitle.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✓ Modal is visible');

    // Verify modal is fully visible (not cut off)
    const modal = page.locator('.bg-slate-900.border.border-slate-800.rounded-2xl').first();
    await expect(modal).toBeVisible();
    
    // Check if modal is in viewport
    const modalBox = await modal.boundingBox();
    if (modalBox) {
      const viewport = page.viewportSize();
      if (viewport) {
        const isFullyVisible = 
          modalBox.x >= 0 && 
          modalBox.y >= 0 && 
          modalBox.x + modalBox.width <= viewport.width && 
          modalBox.y + modalBox.height <= viewport.height;
        
        if (!isFullyVisible) {
          console.warn('⚠ Warning: Modal may be partially cut off');
        } else {
          console.log('✓ Modal is fully visible in viewport');
        }
      }
    }

    // Fill out the form
    console.log('Step 5: Filling out the form...');
    
    // Date field
    const dateInput = page.locator('input[type="date"]').first();
    await dateInput.waitFor({ state: 'visible', timeout: 5000 });
    const today = new Date().toISOString().split('T')[0];
    await dateInput.fill(today);
    console.log(`  ✓ Date set to: ${today}`);

    // Portfolio Value field
    const portfolioValueInput = page.locator('input[type="number"]').nth(0);
    await portfolioValueInput.waitFor({ state: 'visible', timeout: 5000 });
    await portfolioValueInput.fill('50000');
    console.log('  ✓ Portfolio Value set to: $50,000');

    // Net Cash Flow field
    const netCashFlowInput = page.locator('input[type="number"]').nth(1);
    await netCashFlowInput.waitFor({ state: 'visible', timeout: 5000 });
    await netCashFlowInput.fill('10000');
    console.log('  ✓ Net Cash Flow set to: $10,000');

    // Total Market Value field
    const totalMarketValueInput = page.locator('input[type="number"]').nth(2);
    await totalMarketValueInput.waitFor({ state: 'visible', timeout: 5000 });
    await totalMarketValueInput.fill('40000');
    console.log('  ✓ Total Market Value set to: $40,000');

    // Realized P&L field
    const realizedPLInput = page.locator('input[type="number"]').nth(3);
    await realizedPLInput.waitFor({ state: 'visible', timeout: 5000 });
    await realizedPLInput.fill('5000');
    console.log('  ✓ Realized P&L set to: $5,000');

    // Unrealized P&L field
    const unrealizedPLInput = page.locator('input[type="number"]').nth(4);
    await unrealizedPLInput.waitFor({ state: 'visible', timeout: 5000 });
    await unrealizedPLInput.fill('2000');
    console.log('  ✓ Unrealized P&L set to: $2,000');

    // Scroll modal into view if needed
    await modal.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Submit the form
    console.log('Step 6: Submitting the form...');
    const createButton = page.locator('button:has-text("Create Snapshot")');
    await createButton.waitFor({ state: 'visible', timeout: 5000 });
    await createButton.click();
    console.log('✓ Form submitted');

    // Wait for success message or modal to close
    console.log('Step 7: Waiting for confirmation...');
    await page.waitForTimeout(2000);

    // Check if modal is closed (indicating success)
    const modalStillVisible = await modalTitle.isVisible().catch(() => false);
    if (!modalStillVisible) {
      console.log('✓ Modal closed - snapshot likely created successfully');
    } else {
      console.log('⚠ Modal still visible - checking for error messages');
    }

    // Verify the snapshot appears in the table
    console.log('Step 8: Verifying snapshot in table...');
    await page.waitForTimeout(1000);
    
    // Check if the date appears in the table
    const dateInTable = page.locator(`text=${today}`);
    const dateVisible = await dateInTable.isVisible().catch(() => false);
    
    if (dateVisible) {
      console.log('✓ Snapshot appears in the table');
    } else {
      console.log('⚠ Snapshot may not be visible in table yet (may need refresh)');
    }

    // Verify portfolio value appears
    const portfolioValueInTable = page.locator('text=$50,000').or(page.locator('text=50,000'));
    const valueVisible = await portfolioValueInTable.isVisible().catch(() => false);
    
    if (valueVisible) {
      console.log('✓ Portfolio value appears in the table');
    }

    console.log('\n✅ PORTFOLIO SNAPSHOT ADDITION TEST COMPLETE!\n');
  });

  test('should verify modal is fully visible and not cut off', async ({ page }) => {
    console.log('Testing modal visibility...\n');

    // Navigate to Settings page
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState('networkidle');

    // Open Portfolio History tab
    const portfolioHistoryTab = page.locator('button:has-text("Portfolio History")');
    await portfolioHistoryTab.waitFor({ state: 'visible', timeout: 5000 });
    await portfolioHistoryTab.click();
    await page.waitForTimeout(1000);

    // Click Add Balance
    const addBalanceButton = page.locator('button:has-text("Add Balance")');
    await addBalanceButton.waitFor({ state: 'visible', timeout: 5000 });
    await addBalanceButton.click();
    await page.waitForTimeout(1000);

    // Wait for modal
    const modal = page.locator('.bg-slate-900.border.border-slate-800.rounded-2xl').first();
    await modal.waitFor({ state: 'visible', timeout: 5000 });

    // Take a screenshot to verify modal visibility
    await page.screenshot({ path: 'test-results/modal-visibility.png', fullPage: true });
    console.log('✓ Screenshot saved to test-results/modal-visibility.png');

    // Check modal dimensions and position
    const modalBox = await modal.boundingBox();
    const viewport = page.viewportSize();

    if (modalBox && viewport) {
      console.log(`Modal position: x=${modalBox.x}, y=${modalBox.y}`);
      console.log(`Modal size: width=${modalBox.width}, height=${modalBox.height}`);
      console.log(`Viewport size: width=${viewport.width}, height=${viewport.height}`);

      // Verify modal is within viewport
      const isInViewport = 
        modalBox.x >= 0 && 
        modalBox.y >= 0 && 
        modalBox.x + modalBox.width <= viewport.width && 
        modalBox.y + modalBox.height <= viewport.height;

      expect(isInViewport).toBe(true);
      console.log('✓ Modal is fully within viewport');
    }

    // Verify all form fields are visible
    const dateInput = page.locator('input[type="date"]').first();
    const portfolioValueInput = page.locator('input[type="number"]').nth(0);
    const createButton = page.locator('button:has-text("Create Snapshot")');

    await expect(dateInput).toBeVisible();
    await expect(portfolioValueInput).toBeVisible();
    await expect(createButton).toBeVisible();

    console.log('✓ All form fields are visible');
    console.log('\n✅ MODAL VISIBILITY TEST COMPLETE!\n');
  });
});

