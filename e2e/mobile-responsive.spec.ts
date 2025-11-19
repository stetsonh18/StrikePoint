import { test, expect, devices } from '@playwright/test';

// Test mobile responsiveness across different device sizes
const mobileDevices = [
  { name: 'iPhone 12 Pro', viewport: { width: 390, height: 844 } },
  { name: 'iPhone SE', viewport: { width: 375, height: 667 } },
  { name: 'Samsung Galaxy S21', viewport: { width: 360, height: 800 } },
  { name: 'iPad Mini', viewport: { width: 768, height: 1024 } },
];

test.describe('Mobile Responsiveness Tests', () => {
  for (const device of mobileDevices) {
    test.describe(`${device.name} (${device.viewport.width}x${device.viewport.height})`, () => {
      test.use({
        viewport: device.viewport,
      });

      test('should display login page correctly on mobile', async ({ page }) => {
        const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:5173';
        
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');
        
        // Check that login form is visible and properly sized
        const emailInput = page.locator('input[name="email"]');
        await expect(emailInput).toBeVisible();
        
        // Check that form elements are not cut off
        const form = page.locator('form');
        const formBox = await form.boundingBox();
        expect(formBox?.width).toBeLessThanOrEqual(device.viewport.width);
        
        // Take screenshot for visual verification
        await page.screenshot({ 
          path: `test-results/mobile-login-${device.name.replace(/\s+/g, '-')}.png`,
          fullPage: true 
        });
      });

      test('should handle sidebar on mobile after login', async ({ page }) => {
        const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:5173';
        const TEST_EMAIL = 'test@example.com';
        const TEST_PASSWORD = 'Newcrew01!';

        // Login
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');
        await page.fill('input[name="email"]', TEST_EMAIL);
        await page.fill('input[name="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');
        
        // Wait for dashboard
        await page.waitForSelector('text=Dashboard', { timeout: 10000 });
        await page.waitForLoadState('networkidle');
        
        // On mobile, sidebar should be hidden or accessible via menu
        // Check if sidebar exists and is either hidden or in drawer mode
        const sidebar = page.locator('aside');
        
        if (device.viewport.width < 768) {
          // On small screens, sidebar should be hidden or in drawer
          const sidebarBox = await sidebar.boundingBox();
          // Sidebar should either be hidden (null) or off-screen (negative x)
          if (sidebarBox) {
            expect(sidebarBox.x).toBeLessThan(0);
          }
        }
        
        // Check header is visible and responsive
        const header = page.locator('header');
        await expect(header).toBeVisible();
        const headerBox = await header.boundingBox();
        expect(headerBox?.width).toBeLessThanOrEqual(device.viewport.width);
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-results/mobile-dashboard-${device.name.replace(/\s+/g, '-')}.png`,
          fullPage: true 
        });
      });

      test('should display dashboard content correctly on mobile', async ({ page }) => {
        const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:5173';
        const TEST_EMAIL = 'test@example.com';
        const TEST_PASSWORD = 'Newcrew01!';

        // Login
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');
        await page.fill('input[name="email"]', TEST_EMAIL);
        await page.fill('input[name="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');
        
        await page.waitForSelector('text=Dashboard', { timeout: 10000 });
        await page.waitForLoadState('networkidle');
        
        // Check main content area
        const mainContent = page.locator('main');
        await expect(mainContent).toBeVisible();
        
        const mainBox = await mainContent.boundingBox();
        expect(mainBox?.width).toBeLessThanOrEqual(device.viewport.width);
        
        // Check that content doesn't overflow
        const body = page.locator('body');
        const bodyBox = await body.boundingBox();
        expect(bodyBox?.width).toBeLessThanOrEqual(device.viewport.width);
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-results/mobile-content-${device.name.replace(/\s+/g, '-')}.png`,
          fullPage: true 
        });
      });

      test('should handle navigation on mobile', async ({ page }) => {
        const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:5173';
        const TEST_EMAIL = 'test@example.com';
        const TEST_PASSWORD = 'Newcrew01!';

        // Login
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');
        await page.fill('input[name="email"]', TEST_EMAIL);
        await page.fill('input[name="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');
        
        await page.waitForSelector('text=Dashboard', { timeout: 10000 });
        await page.waitForLoadState('networkidle');
        
        // Try to navigate to different pages
        const pages = ['/stocks', '/options', '/settings'];
        
        for (const pagePath of pages) {
          await page.goto(`${BASE_URL}${pagePath}`);
          await page.waitForLoadState('networkidle');
          
          // Check that page loads without horizontal scroll
          const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
          const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
          expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10); // Allow small margin
        }
      });

      test('should handle forms on mobile', async ({ page }) => {
        const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:5173';
        const TEST_EMAIL = 'test@example.com';
        const TEST_PASSWORD = 'Newcrew01!';

        // Login
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');
        await page.fill('input[name="email"]', TEST_EMAIL);
        await page.fill('input[name="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');
        
        await page.waitForSelector('text=Dashboard', { timeout: 10000 });
        await page.waitForLoadState('networkidle');
        
        // Navigate to stocks page
        await page.goto(`${BASE_URL}/stocks`);
        await page.waitForLoadState('networkidle');
        
        // Try to open add trade form
        const addTradeButton = page.locator('button:has-text("Add Trade")');
        if (await addTradeButton.isVisible()) {
          await addTradeButton.click();
          await page.waitForTimeout(1000);
          
          // Check form is visible and fits on screen
          const form = page.locator('form').first();
          if (await form.isVisible()) {
            const formBox = await form.boundingBox();
            if (formBox) {
              expect(formBox.width).toBeLessThanOrEqual(device.viewport.width);
              expect(formBox.x).toBeGreaterThanOrEqual(0);
            }
          }
        }
      });
    });
  }
});

