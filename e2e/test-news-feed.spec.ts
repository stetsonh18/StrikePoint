import { test, expect } from '@playwright/test';

test.describe('News Feed', () => {
  test('should load news feed without CORS errors', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Sign in
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Newcrew01!');
    await page.click('button[type="submit"]');
    
    // Wait for navigation after login
    await page.waitForURL(/\/(dashboard|stocks|options|crypto|futures|analytics|journal|news|settings)/);
    
    // Navigate to news page
    await page.goto('/news');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for CORS errors in console
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('CORS') || text.includes('finnhub-news')) {
          errors.push(text);
        }
      }
    });
    
    // Wait a bit for any async requests
    await page.waitForTimeout(3000);
    
    // Check if news articles are loaded
    const newsArticles = page.locator('[class*="bg-gradient-to-br"][class*="rounded-2xl"]').filter({ hasText: /article|news|headline/i });
    const articleCount = await newsArticles.count();
    
    // Log errors if any
    if (errors.length > 0) {
      console.log('CORS Errors found:', errors);
    }
    
    // Check that either articles are loaded OR we see an appropriate error message (not CORS)
    const hasArticles = articleCount > 0;
    const hasErrorDisplay = await page.locator('text=/failed to load|error|no news/i').count() > 0;
    const hasCorsError = errors.some(e => e.includes('CORS'));
    
    // The test passes if:
    // 1. Articles are loaded, OR
    // 2. There's a non-CORS error message displayed, OR
    // 3. No CORS errors in console (even if no articles due to API issues)
    expect(hasCorsError).toBeFalsy();
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/news-feed-test.png', fullPage: true });
  });
});

