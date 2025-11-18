# Database Schema Files

## Overview

This directory contains the database schema definitions for StrikePoint v4.5.

## Consolidated Schema

**`consolidated_schema.sql`** - This is the main reference file containing the complete database schema. It includes:

- All 11 tables in dependency order
- All indexes, triggers, and functions
- Row Level Security (RLS) policies
- Views and comments
- Data seeding for reference tables

### When to Use

- **Reference**: Understanding the database structure
- **Documentation**: See all tables, relationships, and constraints in one place
- **New Environments**: Setting up dev/staging databases
- **Recovery**: Recreating the database if needed

### Important Notes

- All statements use `IF NOT EXISTS`, so it's safe to run multiple times
- Tables are organized by dependency order
- This file is **idempotent** - running it multiple times won't cause errors

## Schema Organization

The consolidated schema file is the single source of truth for the database structure. All tables, relationships, and constraints are documented in one place for easy reference and maintenance.

## Setup Instructions

### For New Database Setup

1. Run `consolidated_schema.sql` in your Supabase SQL Editor
2. Run `npm run setup:stock-codes` to set up additional stock transaction codes

### For Existing Database

If your database is already set up, you don't need to run any of these files. They're kept for reference and documentation purposes.

## Table Dependencies

The consolidated schema is organized in sections:

1. **Foundation Tables** (no dependencies):
   - `transaction_codes`
   - `imports`
   - `futures_contract_specs`
   - `user_preferences`

2. **Core Trading Tables** (depend on foundation):
   - `strategies`
   - `positions`
   - `transactions`
   - `position_matches`

3. **Cash Management Tables**:
   - `cash_transactions`
   - `cash_balances`

4. **Journal and Analysis Tables**:
   - `journal_entries`

## Additional Setup

After running the schema, you may also need:

- **Stock Transaction Codes**: Run `npm run setup:stock-codes` (or see the data seeding section in `consolidated_schema.sql`)
- **AI Insights Table**: Created dynamically if using AI features
- **Portfolio Snapshots Table**: Created dynamically if using portfolio history features

## Questions?

See the main project documentation:
- [QUICK_START.md](../../QUICK_START.md) - Local development setup
- [DEPLOYMENT_GUIDE.md](../../DEPLOYMENT_GUIDE.md) - Production deployment

