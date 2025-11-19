# Futures Contract Specifications Usage Analysis

## Overview

The `futures_contract_specs` table is **actively used** throughout the application for futures trading functionality. It stores contract-specific details that are essential for position creation, margin calculations, P/L calculations, and UI display.

---

## Table Purpose

Stores specifications for futures contracts including:
- **Contract details**: Symbol, name, exchange
- **Pricing mechanics**: Multiplier, tick size, tick value
- **Margin requirements**: Initial margin, maintenance margin
- **Trading details**: Contract months, fees per contract
- **User customization**: Each user can have their own specs (via `user_id`)

---

## Usage Patterns

### 1. **Position Creation** (`PositionMatchingService`)

**File:** `src/infrastructure/services/positionMatchingService.ts`

**Usage:**
```typescript
// When creating a futures position from a transaction
const contractSpec = await FuturesContractSpecRepository.getBySymbol(baseSymbol, tx.user_id);
if (contractSpec) {
  multiplier = contractSpec.multiplier;        // Used for position value calculations
  tickSize = contractSpec.tick_size;            // Minimum price movement
  tickValue = contractSpec.tick_value;          // Dollar value per tick
  marginRequirement = contractSpec.initial_margin; // Margin needed per contract
}
```

**Purpose:**
- Populates position fields: `multiplier`, `tick_size`, `tick_value`, `margin_requirement`
- These values are stored in the `positions` table for each futures position
- Enables accurate P/L calculations and margin tracking

---

### 2. **Margin Management** (`FuturesCashIntegrationService`)

**File:** `src/infrastructure/services/futuresCashIntegrationService.ts`

#### Opening a Position:
```typescript
// Get contract spec to determine margin requirement
const contractSpec = await FuturesContractSpecRepository.getBySymbol(contractSymbol.symbol, transaction.user_id);
const marginPerContract = contractSpec.initial_margin || 0;
const totalMarginRequired = quantity * marginPerContract;

// Creates cash transaction for margin reservation (debit)
```

**Purpose:**
- Calculates total margin required when opening a futures position
- Creates cash transaction to reserve margin
- Updates cash balance accordingly

#### Closing a Position:
```typescript
// Get contract spec for margin release and P/L calculation
const contractSpec = await FuturesContractSpecRepository.getBySymbol(contractSymbol.symbol, transaction.user_id);
const marginPerContract = contractSpec.initial_margin || 0;
const totalMarginReleased = quantity * marginPerContract;

// Uses multiplier for P/L calculation
const multiplier = contractSpec.multiplier;
const realizedPL = priceDiff * Math.abs(entryQuantity) * multiplier;
```

**Purpose:**
- Releases margin when closing position (credit)
- Calculates realized P/L using contract multiplier
- Creates cash transactions for margin release and P/L

---

### 3. **UI Transaction Form** (`FuturesTransactionForm`)

**File:** `src/presentation/components/FuturesTransactionForm.tsx`

**Usage:**
```typescript
// Fetch active contract specs for dropdown
const { data: contractSpecs = [] } = useActiveFuturesContractSpecs(userId);

// Calculate contract details in real-time
const notionalValue = calculateFuturesValue(price, quantity, selectedContract.multiplier);
const marginRequired = calculateMarginRequirement(quantity, selectedContract.initial_margin);
const leverage = marginRequired ? notionalValue / marginRequired : null;
```

**Purpose:**
- Displays available contracts in dropdown
- Shows real-time calculations:
  - Notional value (price × quantity × multiplier)
  - Margin required
  - Total fees
  - Leverage ratio
- Helps users understand position size and risk before submitting

---

### 4. **Futures Page** (`Futures.tsx`)

**File:** `src/presentation/pages/Futures.tsx`

**Usage:**
```typescript
// Fetch contract specs for contract ID lookup
const { data: contractSpecs = [] } = useActiveFuturesContractSpecs(userId);

// Used to match positions with contract details
// Display contract information in position lists
```

**Purpose:**
- Displays contract information alongside positions
- Helps identify which contract each position represents
- Provides context for position details

---

### 5. **Contract Management UI** (`FuturesContractManager`)

**File:** `src/presentation/components/FuturesContractManager.tsx`

**Usage:**
```typescript
// Fetch all contract specs for management
const { data: allContracts = [] } = useFuturesContractSpecs(userId);

// CRUD operations:
- View all contracts
- Activate/deactivate contracts
- Edit contract details
- Create new contracts
```

**Purpose:**
- Admin/User interface for managing contract specifications
- Allows users to customize margin requirements per broker
- Enables adding new contracts or updating existing ones

---

### 6. **Contract Spec Form** (`ContractSpecForm`)

**File:** `src/presentation/components/ContractSpecForm.tsx`

**Usage:**
```typescript
// Create or update contract specifications
const createMutation = useCreateFuturesContractSpec();
const updateMutation = useUpdateFuturesContractSpec();
```

**Purpose:**
- Form for creating/editing contract specs
- Validates input data
- Saves to database via repository

---

## Key Data Flow

### When Creating a Futures Position:

1. **Transaction Import/Entry** → Futures transaction created
2. **Position Matching Service** → Looks up contract spec by symbol
3. **Contract Spec Retrieved** → Gets multiplier, tick size, tick value, margin
4. **Position Created** → Stores contract details in position record
5. **Cash Integration Service** → Uses margin requirement to reserve margin
6. **Cash Balance Updated** → Margin deducted from available cash

### When Closing a Futures Position:

1. **Closing Transaction** → Futures sell transaction created
2. **Position Matching** → Matches with open position
3. **Contract Spec Retrieved** → Gets multiplier for P/L calculation
4. **P/L Calculated** → Uses multiplier: `(exit - entry) × quantity × multiplier`
5. **Margin Released** → Uses initial_margin to calculate release amount
6. **Cash Transactions Created** → Margin release + P/L + fees

---

## Fields Used and Their Purpose

| Field | Used In | Purpose |
|-------|---------|---------|
| `symbol` | All services | Identifies the contract (ES, NQ, CL, etc.) |
| `name` | UI display | Human-readable contract name |
| `multiplier` | Position creation, P/L calc | Contract size multiplier for value calculations |
| `tick_size` | Position creation | Minimum price movement |
| `tick_value` | Position creation | Dollar value per tick |
| `initial_margin` | Margin management | Margin required per contract |
| `maintenance_margin` | Future use | Maintenance margin (not currently used) |
| `contract_months` | UI display | Valid expiration months |
| `fees_per_contract` | UI display | Typical fees (not currently used in calculations) |
| `is_active` | UI filtering | Shows only active contracts |
| `user_id` | User-specific specs | Allows per-user margin requirements |

---

## User-Specific vs System Defaults

The table supports both:
- **System defaults**: `user_id = NULL` (28 rows currently)
- **User-specific**: `user_id = <user_id>` (custom specs per user)

**Why user-specific?**
- Different brokers have different margin requirements
- Users may want to customize contract details
- Allows flexibility for various trading scenarios

**Lookup Logic:**
- Code first checks for user-specific spec
- Falls back to system default if not found
- Repository methods support both patterns

---

## Current Data

- **28 system default contracts** (ES, NQ, YM, RTY, CL, GC, etc.)
- **0 user-specific contracts** (users can create their own)
- **All contracts are active** (`is_active = true`)

---

## Dependencies

### Tables That Reference It:
- None (it's a reference table)

### Code That Uses It:
- ✅ `FuturesContractSpecRepository` - Full CRUD operations
- ✅ `PositionMatchingService` - Position creation
- ✅ `FuturesCashIntegrationService` - Margin and P/L calculations
- ✅ `FuturesTransactionForm` - UI calculations
- ✅ `Futures.tsx` - Display and lookup
- ✅ `FuturesContractManager` - Management UI
- ✅ `ContractSpecForm` - Create/Edit form
- ✅ React hooks: `useFuturesContractSpecs`, `useActiveFuturesContractSpecs`, etc.

---

## Critical Usage Points

### 1. **Position Creation** (Critical)
- If contract spec is missing, position creation may fail or use defaults
- Error handling: Falls back to null values if spec not found

### 2. **Margin Calculations** (Critical)
- Margin reservation/release depends on `initial_margin`
- Missing spec = no margin tracking = incorrect cash balance

### 3. **P/L Calculations** (Critical)
- Realized P/L uses `multiplier` from contract spec
- Missing spec = incorrect P/L calculations

### 4. **UI Display** (Important)
- Transaction form needs specs for calculations
- Missing specs = users can't see margin/leverage info

---

## Recommendations

### ✅ Keep the Table
The table is **essential** for futures trading functionality.

### 🔧 Potential Improvements

1. **Add validation** when contract spec is missing:
   - Currently logs error but continues
   - Could throw error or use system defaults more gracefully

2. **Use `fees_per_contract`** in calculations:
   - Currently stored but not used in fee calculations
   - Could auto-populate fees based on contract spec

3. **Use `maintenance_margin`**:
   - Currently stored but not used
   - Could track maintenance margin calls

4. **Add contract spec validation**:
   - Ensure required fields are present
   - Validate multiplier, tick_size, tick_value relationships

---

## Summary

**Status:** ✅ **ACTIVELY USED** - Essential for futures trading

**Usage Frequency:** High
- Every futures position creation
- Every futures transaction (open/close)
- Every margin calculation
- Every P/L calculation
- UI display and management

**Dependencies:** None (standalone reference table)

**Recommendation:** **Keep and maintain** - This table is critical for futures functionality.

