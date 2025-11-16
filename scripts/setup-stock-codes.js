/**
 * Setup Stock Transaction Codes
 * 
 * This script inserts stock buy/sell transaction codes into the transaction_codes table.
 * Run with: node scripts/setup-stock-codes.js
 * 
 * Requires environment variables (set in .env file or environment):
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY for raw SQL)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env file if it exists
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Transaction codes to insert
const transactionCodes = [
  {
    trans_code: 'BUY',
    category: 'Stock Trade',
    description: 'Stock purchase transaction',
    in_your_file: true,
  },
  {
    trans_code: 'SELL',
    category: 'Stock Trade',
    description: 'Stock sale transaction',
    in_your_file: true,
  },
  {
    trans_code: 'Buy',
    category: 'Stock Trade',
    description: 'Stock purchase transaction (lowercase variant)',
    in_your_file: true,
  },
  {
    trans_code: 'Sell',
    category: 'Stock Trade',
    description: 'Stock sale transaction (lowercase variant)',
    in_your_file: true,
  },
  {
    trans_code: 'BOT',
    category: 'Stock Trade',
    description: 'Stock bought (broker abbreviation)',
    in_your_file: true,
  },
  {
    trans_code: 'SLD',
    category: 'Stock Trade',
    description: 'Stock sold (broker abbreviation)',
    in_your_file: true,
  },
];

async function setupStockCodes() {
  console.log('🚀 Setting up stock transaction codes...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const code of transactionCodes) {
    try {
      // Use upsert to handle conflicts
      const { data, error } = await supabase
        .from('transaction_codes')
        .upsert(code, {
          onConflict: 'trans_code',
        })
        .select();

      if (error) {
        console.error(`❌ Error inserting ${code.trans_code}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ ${code.trans_code} - ${code.description}`);
        successCount++;
      }
    } catch (error) {
      console.error(`❌ Unexpected error for ${code.trans_code}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Successfully inserted/updated: ${successCount}`);
  if (errorCount > 0) {
    console.log(`❌ Errors: ${errorCount}`);
  }

  // Verify the inserts
  console.log('\n📋 Verifying inserted codes...\n');
  const { data: codes, error: verifyError } = await supabase
    .from('transaction_codes')
    .select('trans_code, category, description')
    .eq('category', 'Stock Trade')
    .order('trans_code');

  if (verifyError) {
    console.error('❌ Error verifying codes:', verifyError.message);
  } else {
    console.log('Stock Trade transaction codes:');
    codes.forEach((code) => {
      console.log(`  ${code.trans_code.padEnd(6)} | ${code.category.padEnd(12)} | ${code.description}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Setup complete!');
}

// Run the setup
setupStockCodes().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

