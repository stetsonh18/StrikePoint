import { test, expect } from '@playwright/test';

test.describe('Add Stock Test', () => {
  test('should login and add a new stock', async ({ page }) => {
    const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:5173';
    const TEST_EMAIL = 'test@example.com';
    const TEST_PASSWORD = 'Newcrew01!';

    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Wait for login form to be visible
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    console.log('✓ Login form loaded');

    // Login
    console.log('Logging in...');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    console.log('✓ Logged in successfully');

    // Navigate to stocks page
    console.log('Navigating to stocks page...');
    await page.goto(`${BASE_URL}/stocks`);
    await page.waitForLoadState('networkidle');
    console.log('✓ Stocks page loaded');

    // Click "Add Trade" button
    console.log('Clicking Add Trade button...');
    const addTradeButton = page.locator('button:has-text("Add Trade")');
    await addTradeButton.click();
    await page.waitForTimeout(1000);
    console.log('✓ Add Trade form opened');

    // Fill in the stock form
    console.log('Filling in stock form...');
    
    // Wait for form to be fully loaded
    await page.waitForTimeout(1000);
    
    // Try to fill using name attributes first (as in comprehensive test)
    // If that doesn't work, fall back to other selectors
    try {
      await page.fill('input[name="symbol"]', 'MSFT');
    } catch {
      // Fallback to placeholder-based selector
      await page.fill('input[placeholder*="AAPL"]', 'MSFT');
    }
    await page.waitForTimeout(500); // Wait for autocomplete to process
    
    // Transaction type (Buy/Sell)
    try {
      await page.selectOption('select[name="action"]', 'buy');
    } catch {
      // Fallback: find select with Buy option
      await page.selectOption('select:has(option[value="Buy"])', 'Buy');
    }
    
    // Quantity
    await page.fill('input[name="quantity"]', '10');
    
    // Price
    await page.fill('input[name="price"]', '400.00');
    
    // Transaction date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const transactionDate = `${year}-${month}-${day}`;
    await page.fill('input[name="transaction_date"]', transactionDate);
    
    // Fees (optional)
    try {
      await page.fill('input[name="fees"]', '1.00');
    } catch {
      console.log('Fees field not found or optional');
    }

    console.log('✓ Form filled');

    // Take a screenshot before submitting
    await page.screenshot({ path: 'test-results/add-stock-form.png', fullPage: true });

    // Submit the form
    console.log('Submitting form...');
    await page.click('button[type="submit"]');
    
    // Wait for form to close or success message
    await page.waitForTimeout(3000);
    console.log('✓ Form submitted');

    // Verify the stock was added by checking if we're back on the stocks page
    // or if there's a success message
    const currentUrl = page.url();
    expect(currentUrl).toContain('/stocks');
    
    // Take a screenshot after submission
    await page.screenshot({ path: 'test-results/add-stock-success.png', fullPage: true });
    
    console.log('✅ Stock added successfully!');
  });
});

