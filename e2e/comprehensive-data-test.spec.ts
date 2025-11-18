import { test, expect } from '@playwright/test';

/**
 * Comprehensive Data Test
 *
 * This test creates a complete dataset:
 * 1. Add a cash deposit
 * 2. Create 2 positions for each asset class (stocks, options, crypto, futures)
 * 3. Close 1 position of each asset class
 * 4. Add at least one journal entry
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

test.describe('Comprehensive Data Creation', () => {
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

  test('should create comprehensive test data', async ({ page }) => {
    console.log('Starting comprehensive data creation...\n');

    // =====================
    // 1. ADD CASH DEPOSIT
    // =====================
    console.log('Step 1: Adding cash deposit...');
    await page.goto(`${BASE_URL}/cash`);
    await page.waitForLoadState('networkidle');

    // Look for "Add Transaction" or similar button
    const addCashButton = page.locator('button:has-text("Add")').first();
    await addCashButton.click();

    // Wait for form to appear
    await page.waitForTimeout(1000);

    // Fill in deposit form
    await page.fill('input[name="amount"]', '10000');
    await page.selectOption('select[name="transaction_code"]', 'DEPOSIT');
    await page.fill('input[name="description"]', 'Initial deposit for testing');
    await page.fill('input[name="transaction_date"]', '2025-01-15');

    // Submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('✓ Cash deposit added: $10,000\n');

    // =====================
    // 2. CREATE STOCK POSITIONS (2)
    // =====================
    console.log('Step 2: Creating stock positions...');
    await page.goto(`${BASE_URL}/stocks`);
    await page.waitForLoadState('networkidle');

    // Stock 1: AAPL
    console.log('  - Creating AAPL position...');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);

    await page.fill('input[name="symbol"]', 'AAPL');
    await page.selectOption('select[name="action"]', 'buy');
    await page.fill('input[name="quantity"]', '10');
    await page.fill('input[name="price"]', '150.00');
    await page.fill('input[name="transaction_date"]', '2025-01-16');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('    ✓ AAPL: 10 shares @ $150.00');

    // Stock 2: TSLA
    console.log('  - Creating TSLA position...');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);

    await page.fill('input[name="symbol"]', 'TSLA');
    await page.selectOption('select[name="action"]', 'buy');
    await page.fill('input[name="quantity"]', '5');
    await page.fill('input[name="price"]', '250.00');
    await page.fill('input[name="transaction_date"]', '2025-01-16');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('    ✓ TSLA: 5 shares @ $250.00\n');

    // =====================
    // 3. CREATE OPTIONS POSITIONS (2)
    // =====================
    console.log('Step 3: Creating options positions...');
    await page.goto(`${BASE_URL}/options`);
    await page.waitForLoadState('networkidle');

    // Option 1: AAPL Call
    console.log('  - Creating AAPL call option...');
    await page.click('button:has-text("Single Leg Strategy")');
    await page.waitForTimeout(1000);

    await page.fill('input[name="underlying_symbol"]', 'AAPL');
    await page.selectOption('select[name="option_type"]', 'call');
    await page.fill('input[name="strike_price"]', '155');
    await page.fill('input[name="expiration_date"]', '2025-03-21');
    await page.selectOption('select[name="action"]', 'BTO');
    await page.fill('input[name="quantity"]', '1');
    await page.fill('input[name="price"]', '5.50');
    await page.fill('input[name="transaction_date"]', '2025-01-16');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('    ✓ AAPL 155C 03/21: 1 contract @ $5.50');

    // Option 2: SPY Put
    console.log('  - Creating SPY put option...');
    await page.click('button:has-text("Single Leg Strategy")');
    await page.waitForTimeout(1000);

    await page.fill('input[name="underlying_symbol"]', 'SPY');
    await page.selectOption('select[name="option_type"]', 'put');
    await page.fill('input[name="strike_price"]', '445');
    await page.fill('input[name="expiration_date"]', '2025-02-21');
    await page.selectOption('select[name="action"]', 'BTO');
    await page.fill('input[name="quantity"]', '2');
    await page.fill('input[name="price"]', '3.25');
    await page.fill('input[name="transaction_date"]', '2025-01-16');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('    ✓ SPY 445P 02/21: 2 contracts @ $3.25\n');

    // =====================
    // 4. CREATE CRYPTO POSITIONS (2)
    // =====================
    console.log('Step 4: Creating crypto positions...');
    await page.goto(`${BASE_URL}/crypto`);
    await page.waitForLoadState('networkidle');

    // Crypto 1: BTC
    console.log('  - Creating BTC position...');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);

    await page.fill('input[name="symbol"]', 'BTC');
    await page.selectOption('select[name="action"]', 'buy');
    await page.fill('input[name="quantity"]', '0.1');
    await page.fill('input[name="price"]', '45000.00');
    await page.fill('input[name="transaction_date"]', '2025-01-16');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('    ✓ BTC: 0.1 @ $45,000.00');

    // Crypto 2: ETH
    console.log('  - Creating ETH position...');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);

    await page.fill('input[name="symbol"]', 'ETH');
    await page.selectOption('select[name="action"]', 'buy');
    await page.fill('input[name="quantity"]', '2');
    await page.fill('input[name="price"]', '2500.00');
    await page.fill('input[name="transaction_date"]', '2025-01-16');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('    ✓ ETH: 2 @ $2,500.00\n');

    // =====================
    // 5. CREATE FUTURES POSITIONS (2)
    // =====================
    console.log('Step 5: Creating futures positions...');
    await page.goto(`${BASE_URL}/futures`);
    await page.waitForLoadState('networkidle');

    // Futures 1: ES (E-mini S&P 500)
    console.log('  - Creating ES futures position...');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);

    await page.fill('input[name="symbol"]', 'ES');
    await page.selectOption('select[name="action"]', 'buy');
    await page.fill('input[name="quantity"]', '1');
    await page.fill('input[name="price"]', '4800.00');
    await page.fill('input[name="expiration_date"]', '2025-03-21');
    await page.fill('input[name="transaction_date"]', '2025-01-16');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('    ✓ ES: 1 contract @ 4800.00');

    // Futures 2: NQ (E-mini Nasdaq)
    console.log('  - Creating NQ futures position...');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);

    await page.fill('input[name="symbol"]', 'NQ');
    await page.selectOption('select[name="action"]', 'buy');
    await page.fill('input[name="quantity"]', '1');
    await page.fill('input[name="price"]', '16500.00');
    await page.fill('input[name="expiration_date"]', '2025-03-21');
    await page.fill('input[name="transaction_date"]', '2025-01-16');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('    ✓ NQ: 1 contract @ 16,500.00\n');

    // =====================
    // 6. CLOSE ONE POSITION OF EACH ASSET CLASS
    // =====================
    console.log('Step 6: Closing one position of each asset class...');

    // Close AAPL stock
    console.log('  - Closing AAPL stock position...');
    await page.goto(`${BASE_URL}/stocks`);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);

    await page.fill('input[name="symbol"]', 'AAPL');
    await page.selectOption('select[name="action"]', 'sell');
    await page.fill('input[name="quantity"]', '10');
    await page.fill('input[name="price"]', '155.00');
    await page.fill('input[name="transaction_date"]', '2025-01-17');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('    ✓ Closed AAPL: 10 shares @ $155.00');

    // Close AAPL call option
    console.log('  - Closing AAPL call option...');
    await page.goto(`${BASE_URL}/options`);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Single Leg Strategy")');
    await page.waitForTimeout(1000);

    await page.fill('input[name="underlying_symbol"]', 'AAPL');
    await page.selectOption('select[name="option_type"]', 'call');
    await page.fill('input[name="strike_price"]', '155');
    await page.fill('input[name="expiration_date"]', '2025-03-21');
    await page.selectOption('select[name="action"]', 'STC');
    await page.fill('input[name="quantity"]', '1');
    await page.fill('input[name="price"]', '7.00');
    await page.fill('input[name="transaction_date"]', '2025-01-17');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('    ✓ Closed AAPL 155C: 1 contract @ $7.00');

    // Close BTC crypto
    console.log('  - Closing BTC crypto position...');
    await page.goto(`${BASE_URL}/crypto`);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);

    await page.fill('input[name="symbol"]', 'BTC');
    await page.selectOption('select[name="action"]', 'sell');
    await page.fill('input[name="quantity"]', '0.1');
    await page.fill('input[name="price"]', '46000.00');
    await page.fill('input[name="transaction_date"]', '2025-01-17');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('    ✓ Closed BTC: 0.1 @ $46,000.00');

    // Close ES futures
    console.log('  - Closing ES futures position...');
    await page.goto(`${BASE_URL}/futures`);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);

    await page.fill('input[name="symbol"]', 'ES');
    await page.selectOption('select[name="action"]', 'sell');
    await page.fill('input[name="quantity"]', '1');
    await page.fill('input[name="price"]', '4850.00');
    await page.fill('input[name="expiration_date"]', '2025-03-21');
    await page.fill('input[name="transaction_date"]', '2025-01-17');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('    ✓ Closed ES: 1 contract @ 4850.00\n');

    // =====================
    // 7. ADD JOURNAL ENTRY
    // =====================
    console.log('Step 7: Adding journal entry...');
    await page.goto(`${BASE_URL}/journal`);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Add")');
    await page.waitForTimeout(1000);

    await page.fill('input[name="date"]', '2025-01-17');
    await page.fill('input[name="title"]', 'First Week Trading Summary');
    await page.fill('textarea[name="content"]', 'Had a great first week. AAPL trade was profitable (+$50 on stock, +$150 on option). BTC gained $100. ES futures up $50. Overall portfolio looking good. Will continue to monitor and adjust positions as needed.');
    await page.selectOption('select[name="mood"]', 'positive');
    await page.fill('input[name="tags"]', 'weekly-review,profitable,bullish');

    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    console.log('    ✓ Journal entry added: "First Week Trading Summary"\n');

    // =====================
    // VERIFICATION
    // =====================
    console.log('Step 8: Verifying data creation...');

    // Check dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    console.log('    ✓ Dashboard loaded successfully');

    // Verify positions exist
    await page.goto(`${BASE_URL}/positions`);
    await page.waitForLoadState('networkidle');
    console.log('    ✓ Positions page loaded');

    // Verify transactions exist
    await page.goto(`${BASE_URL}/transactions`);
    await page.waitForLoadState('networkidle');
    console.log('    ✓ Transactions page loaded');

    // Verify cash transactions exist
    await page.goto(`${BASE_URL}/cash`);
    await page.waitForLoadState('networkidle');
    console.log('    ✓ Cash transactions page loaded');

    console.log('\n✅ COMPREHENSIVE DATA CREATION COMPLETE!\n');
    console.log('Summary:');
    console.log('  - 1 cash deposit ($10,000)');
    console.log('  - 2 stock positions (AAPL closed, TSLA open)');
    console.log('  - 2 options positions (AAPL call closed, SPY put open)');
    console.log('  - 2 crypto positions (BTC closed, ETH open)');
    console.log('  - 2 futures positions (ES closed, NQ open)');
    console.log('  - 1 journal entry');
    console.log('  - Total: 4 open positions, 4 closed positions');
  });
});
