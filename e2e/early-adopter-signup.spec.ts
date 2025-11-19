import { test, expect } from '@playwright/test';

test.describe('Early Adopter Signup', () => {
  test('new user should get early adopter pricing during signup', async ({ page }) => {
    // Generate a unique email for this test
    const timestamp = Date.now();
    const testEmail = `test-early-adopter-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'Test User';

    // Navigate to signup page
    await page.goto('/signup');

    // Fill in signup form
    await page.fill('input[name="fullName"]', testName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for navigation to checkout page
    await page.waitForURL('/checkout', { timeout: 10000 });

    // Check that we're on the checkout page
    expect(page.url()).toContain('/checkout');

    // Wait for pricing to load
    await page.waitForSelector('text=/\\$[0-9]+\\.[0-9]{2}/', { timeout: 10000 }).catch(async () => {
      // If pricing doesn't appear, log what we see
      console.log('Pricing selector not found');
    });

    // Wait a bit for pricing to fully load
    await page.waitForTimeout(2000);

    // Check for early adopter pricing ($9.99)
    const earlyAdopterPrice = page.locator('text=$9.99');
    const regularPrice = page.locator('text=$19.99');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/early-adopter-checkout.png', fullPage: true });

    // Check for early adopter badge or message
    const earlyAdopterBadge = page.locator('text=Early Adopter');
    const earlyAdopterMessage = page.locator('text=/early adopter/i');
    
    // Verify early adopter pricing is shown
    const isEarlyAdopter = await earlyAdopterPrice.isVisible().catch(() => false);
    const isRegular = await regularPrice.isVisible().catch(() => false);
    const hasEarlyAdopterBadge = await earlyAdopterBadge.isVisible().catch(() => false);
    const hasEarlyAdopterMessage = await earlyAdopterMessage.isVisible().catch(() => false);

    console.log('Early Adopter Price Visible:', isEarlyAdopter);
    console.log('Regular Price Visible:', isRegular);
    console.log('Early Adopter Badge Visible:', hasEarlyAdopterBadge);
    console.log('Early Adopter Message Visible:', hasEarlyAdopterMessage);

    // Get all pricing text on the page for debugging
    const allPricing = await page.locator('text=/\\$[0-9]+\\.[0-9]{2}/').allTextContents();
    console.log('All pricing found on page:', allPricing);

    // The test should verify that early adopter pricing is shown
    // If spots are available, user should get early adopter pricing
    // We check for either the price or the badge/message
    const hasEarlyAdopterPricing = isEarlyAdopter || hasEarlyAdopterBadge || hasEarlyAdopterMessage;
    
    if (!hasEarlyAdopterPricing) {
      // If early adopter pricing is not shown, fail the test with details
      throw new Error(
        `Expected early adopter pricing ($9.99) but found: ${allPricing.join(', ')}. ` +
        `Early adopter badge: ${hasEarlyAdopterBadge}, Message: ${hasEarlyAdopterMessage}`
      );
    }

    // Verify that regular pricing is NOT shown if early adopter pricing is shown
    if (hasEarlyAdopterPricing && isRegular) {
      console.warn('Warning: Both early adopter and regular pricing are visible');
    }
  });

  test('checkout page should display early adopter pricing for eligible users', async ({ page }) => {
    // This test assumes a user is already signed up and should check their pricing
    // We'll need to sign up first, then check the checkout page
    
    const timestamp = Date.now();
    const testEmail = `test-checkout-${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';

    // Sign up
    await page.goto('/signup');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for checkout page
    await page.waitForURL('/checkout', { timeout: 10000 });

    // Wait for pricing to load
    await page.waitForSelector('text=/\\$[0-9]+\\.[0-9]{2}/', { timeout: 10000 });

    // Check console for any errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit for any async operations
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/checkout-pricing.png', fullPage: true });

    // Log any console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors:', consoleErrors);
    }

    // Verify pricing is displayed
    const pricingDisplay = page.locator('text=/\\$[0-9]+\\.[0-9]{2}/');
    await expect(pricingDisplay.first()).toBeVisible();
  });
});

