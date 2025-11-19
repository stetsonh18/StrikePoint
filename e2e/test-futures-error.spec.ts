import { test, expect } from '@playwright/test';

test.describe('Futures Page Error Investigation', () => {
  test('navigate to futures page and capture errors', async ({ page }) => {
    const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:5173';
    const TEST_EMAIL = 'test@example.com';
    const TEST_PASSWORD = 'Newcrew01!';

    // Listen for console errors
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(text);
      }
    });

    // Listen for page errors
    const pageErrors: Error[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    // Listen for failed network requests
    const failedRequests: Array<{ url: string; method: string; error: string }> = [];
    page.on('requestfailed', (request) => {
      failedRequests.push({
        url: request.url(),
        method: request.method(),
        error: request.failure()?.errorText || 'Unknown error',
      });
    });

    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Wait for login form
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

    // Navigate to futures page
    console.log('Navigating to futures page...');
    await page.goto(`${BASE_URL}/futures`, { waitUntil: 'networkidle' });
    
    // Wait for the page to fully load and any async operations
    await page.waitForTimeout(5000);

    // Check for React error boundaries
    const errorBoundary = page.locator('text=/Something went wrong|Error|Failed to load/i');
    const hasErrorBoundary = await errorBoundary.count() > 0;

    // Take a screenshot
    await page.screenshot({ path: 'test-results/futures-error.png', fullPage: true });

    // Check if Futures heading is visible
    const futuresHeading = page.locator('h1:has-text("Futures"), text="Futures"').first();
    const isVisible = await futuresHeading.isVisible().catch(() => false);

    // Try to get React DevTools error if available
    let reactError = null;
    try {
      reactError = await page.evaluate(() => {
        // Check for React error overlay
        const errorOverlay = document.querySelector('[data-react-error-overlay]');
        if (errorOverlay) {
          return errorOverlay.textContent;
        }
        return null;
      });
    } catch (e) {
      // Ignore
    }

    // Log all errors
    console.log('\n=== Console Errors ===');
    if (consoleErrors.length === 0) {
      console.log('No console errors found');
    } else {
      consoleErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    console.log('\n=== Console Warnings ===');
    if (consoleWarnings.length === 0) {
      console.log('No console warnings found');
    } else {
      consoleWarnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning}`);
      });
    }

    console.log('\n=== Page Errors ===');
    if (pageErrors.length === 0) {
      console.log('No page errors found');
    } else {
      pageErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
      });
    }

    console.log('\n=== Failed Network Requests ===');
    if (failedRequests.length === 0) {
      console.log('No failed network requests (excluding Sentry)');
    } else {
      failedRequests
        .filter(req => !req.url.includes('sentry.io')) // Filter out Sentry errors
        .forEach((request, index) => {
          console.log(`${index + 1}. ${request.method} ${request.url}`);
          console.log(`   Error: ${request.error}`);
        });
    }

    // Check if the page loaded successfully
    const pageTitle = await page.title();
    console.log(`\n=== Page Title: ${pageTitle} ===`);
    console.log(`=== Futures Heading Visible: ${isVisible} ===`);
    console.log(`=== Error Boundary Triggered: ${hasErrorBoundary} ===`);
    if (reactError) {
      console.log(`=== React Error: ${reactError} ===`);
    }

    // Output errors to file for easier inspection
    const errorReport = {
      consoleErrors,
      consoleWarnings,
      pageErrors: pageErrors.map(e => ({
        message: e.message,
        stack: e.stack,
      })),
      failedRequests: failedRequests.filter(req => !req.url.includes('sentry.io')),
      pageTitle,
      futuresHeadingVisible: isVisible,
      errorBoundaryTriggered: hasErrorBoundary,
      reactError,
    };

    console.log('\n=== Full Error Report ===');
    console.log(JSON.stringify(errorReport, null, 2));

    // If there are errors, fail the test
    if (consoleErrors.length > 0 || pageErrors.length > 0 || hasErrorBoundary) {
      throw new Error('Errors detected on Futures page. Check the console output above.');
    }
  });
});

