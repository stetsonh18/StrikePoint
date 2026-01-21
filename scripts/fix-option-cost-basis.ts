/**
 * Script to fix total_cost_basis for option positions
 *
 * This script recalculates and updates the total_cost_basis for option positions
 * that have it set to 0 or null, using the formula:
 * total_cost_basis = opening_quantity * average_opening_price * multiplier
 *
 * Run with: npx tsx scripts/fix-option-cost-basis.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
    const env: Record<string, string> = {};
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
      }
    });
    return env;
  } catch (error) {
    return {};
  }
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Position {
  id: string;
  symbol: string;
  asset_type: string;
  status: string;
  opening_quantity: number;
  average_opening_price: number;
  multiplier: number;
  total_cost_basis: number;
  side: 'long' | 'short';
}

async function fixOptionCostBasis() {
  console.log('🔍 Fetching option positions with zero or null total_cost_basis...\n');

  // Get all option positions where total_cost_basis is 0 or null
  const { data: positions, error } = await supabase
    .from('positions')
    .select('id, symbol, asset_type, status, opening_quantity, average_opening_price, multiplier, total_cost_basis, side')
    .eq('asset_type', 'option')
    .or('total_cost_basis.is.null,total_cost_basis.eq.0');

  if (error) {
    console.error('❌ Error fetching positions:', error);
    return;
  }

  if (!positions || positions.length === 0) {
    console.log('✅ No option positions found with zero or null total_cost_basis');
    return;
  }

  console.log(`📊 Found ${positions.length} option positions to fix\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const position of positions as Position[]) {
    const multiplier = position.multiplier || 100;

    // Calculate the correct total_cost_basis
    // For options: cost_basis = opening_quantity * opening_price * multiplier
    // Sign convention:
    // - Long positions (buy): negative (debit paid)
    // - Short positions (sell): positive (credit received)
    const calculatedCostBasis = position.opening_quantity * position.average_opening_price * multiplier;
    const signedCostBasis = position.side === 'short' ? calculatedCostBasis : -calculatedCostBasis;

    console.log(`Fixing position ${position.id}:`);
    console.log(`  Symbol: ${position.symbol}`);
    console.log(`  Side: ${position.side}`);
    console.log(`  Status: ${position.status}`);
    console.log(`  Opening Quantity: ${position.opening_quantity}`);
    console.log(`  Opening Price: $${position.average_opening_price}`);
    console.log(`  Multiplier: ${multiplier}`);
    console.log(`  Old Cost Basis: ${position.total_cost_basis}`);
    console.log(`  New Cost Basis: ${signedCostBasis}`);

    // Update the position
    const { error: updateError } = await supabase
      .from('positions')
      .update({ total_cost_basis: signedCostBasis })
      .eq('id', position.id);

    if (updateError) {
      console.error(`  ❌ Error updating position: ${updateError.message}\n`);
      errorCount++;
    } else {
      console.log(`  ✅ Updated successfully\n`);
      successCount++;
    }
  }

  console.log('\n📈 Summary:');
  console.log(`  ✅ Successfully updated: ${successCount}`);
  console.log(`  ❌ Failed: ${errorCount}`);
  console.log(`  📊 Total processed: ${positions.length}`);
}

// Run the script
fixOptionCostBasis()
  .then(() => {
    console.log('\n✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
