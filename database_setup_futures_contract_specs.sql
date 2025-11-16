-- Futures Contract Specifications Table
-- Stores contract specifications for futures trading
-- This allows users to select pre-configured contracts with proper multipliers, tick sizes, etc.

CREATE TABLE IF NOT EXISTS futures_contract_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT UNIQUE NOT NULL,  -- ES, NQ, CL, GC, etc.
  name TEXT NOT NULL,            -- E-mini S&P 500, E-mini Nasdaq-100, etc.
  exchange TEXT,                 -- CME, CBOT, NYMEX, COMEX
  multiplier NUMERIC NOT NULL,   -- Contract size multiplier (e.g., 50 for ES, 20 for NQ)
  tick_size NUMERIC NOT NULL,    -- Minimum price movement (e.g., 0.25 for ES)
  tick_value NUMERIC NOT NULL,   -- Dollar value per tick (e.g., 12.50 for ES)
  initial_margin NUMERIC,        -- Typical initial margin requirement in USD
  maintenance_margin NUMERIC,    -- Typical maintenance margin requirement in USD
  contract_months TEXT[],        -- Valid contract months ['H', 'M', 'U', 'Z'] = Mar, Jun, Sep, Dec
  fees_per_contract NUMERIC DEFAULT 0,  -- Typical fees per contract
  is_active BOOLEAN DEFAULT true,       -- Whether contract is currently tradeable
  description TEXT,              -- Additional notes about the contract
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_futures_contract_specs_symbol ON futures_contract_specs(symbol);
CREATE INDEX IF NOT EXISTS idx_futures_contract_specs_active ON futures_contract_specs(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_futures_contract_specs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER futures_contract_specs_updated_at
  BEFORE UPDATE ON futures_contract_specs
  FOR EACH ROW
  EXECUTE FUNCTION update_futures_contract_specs_updated_at();

-- Seed common futures contracts
-- E-mini Equity Index Futures (CME)
INSERT INTO futures_contract_specs (symbol, name, exchange, multiplier, tick_size, tick_value, initial_margin, maintenance_margin, contract_months, fees_per_contract, description)
VALUES
  ('ES', 'E-mini S&P 500', 'CME', 50, 0.25, 12.50, 13200, 12000, ARRAY['H', 'M', 'U', 'Z'], 2.50, 'Most liquid equity index futures contract'),
  ('NQ', 'E-mini Nasdaq-100', 'CME', 20, 0.25, 5.00, 17600, 16000, ARRAY['H', 'M', 'U', 'Z'], 2.50, 'Tech-heavy index futures'),
  ('YM', 'E-mini Dow ($5)', 'CBOT', 5, 1.00, 5.00, 8800, 8000, ARRAY['H', 'M', 'U', 'Z'], 2.50, 'Dow Jones Industrial Average futures'),
  ('RTY', 'E-mini Russell 2000', 'CME', 50, 0.10, 5.00, 6600, 6000, ARRAY['H', 'M', 'U', 'Z'], 2.50, 'Small-cap index futures'),

  -- Micro E-mini Equity Index Futures (CME)
  ('MES', 'Micro E-mini S&P 500', 'CME', 5, 0.25, 1.25, 1320, 1200, ARRAY['H', 'M', 'U', 'Z'], 0.50, '1/10th size of ES contract'),
  ('MNQ', 'Micro E-mini Nasdaq-100', 'CME', 2, 0.25, 0.50, 1760, 1600, ARRAY['H', 'M', 'U', 'Z'], 0.50, '1/10th size of NQ contract'),
  ('MYM', 'Micro E-mini Dow', 'CBOT', 0.5, 1.00, 0.50, 880, 800, ARRAY['H', 'M', 'U', 'Z'], 0.50, '1/10th size of YM contract'),
  ('M2K', 'Micro E-mini Russell 2000', 'CME', 5, 0.10, 0.50, 660, 600, ARRAY['H', 'M', 'U', 'Z'], 0.50, '1/10th size of RTY contract'),

  -- Energy Futures (NYMEX)
  ('CL', 'Crude Oil', 'NYMEX', 1000, 0.01, 10.00, 6600, 6000, ARRAY['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'], 3.00, '1,000 barrels of WTI crude oil'),
  ('NG', 'Natural Gas', 'NYMEX', 10000, 0.001, 10.00, 3300, 3000, ARRAY['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'], 3.00, '10,000 MMBtu of natural gas'),
  ('RB', 'RBOB Gasoline', 'NYMEX', 42000, 0.0001, 4.20, 5280, 4800, ARRAY['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'], 3.00, '42,000 gallons of gasoline'),
  ('HO', 'Heating Oil', 'NYMEX', 42000, 0.0001, 4.20, 4620, 4200, ARRAY['F', 'G', 'H', 'J', 'K', 'M', 'N', 'Q', 'U', 'V', 'X', 'Z'], 3.00, '42,000 gallons of heating oil'),

  -- Metal Futures (COMEX)
  ('GC', 'Gold', 'COMEX', 100, 0.10, 10.00, 9900, 9000, ARRAY['G', 'J', 'M', 'Q', 'V', 'Z'], 3.00, '100 troy ounces of gold'),
  ('SI', 'Silver', 'COMEX', 5000, 0.005, 25.00, 14300, 13000, ARRAY['H', 'K', 'N', 'U', 'Z'], 3.00, '5,000 troy ounces of silver'),
  ('HG', 'Copper', 'COMEX', 25000, 0.0005, 12.50, 4400, 4000, ARRAY['H', 'K', 'N', 'U', 'Z'], 3.00, '25,000 pounds of copper'),

  -- Micro Metal Futures (COMEX)
  ('MGC', 'Micro Gold', 'COMEX', 10, 0.10, 1.00, 990, 900, ARRAY['G', 'J', 'M', 'Q', 'V', 'Z'], 0.50, '10 troy ounces of gold'),
  ('SIL', 'Micro Silver', 'COMEX', 1000, 0.005, 5.00, 2860, 2600, ARRAY['H', 'K', 'N', 'U', 'Z'], 0.50, '1,000 troy ounces of silver'),

  -- Treasury Futures (CBOT)
  ('ZB', '30-Year Treasury Bond', 'CBOT', 1000, 0.03125, 31.25, 4400, 4000, ARRAY['H', 'M', 'U', 'Z'], 2.00, '$100,000 face value 30-year T-bond'),
  ('ZN', '10-Year Treasury Note', 'CBOT', 1000, 0.015625, 15.625, 2200, 2000, ARRAY['H', 'M', 'U', 'Z'], 2.00, '$100,000 face value 10-year T-note'),
  ('ZF', '5-Year Treasury Note', 'CBOT', 1000, 0.0078125, 7.8125, 1540, 1400, ARRAY['H', 'M', 'U', 'Z'], 2.00, '$100,000 face value 5-year T-note'),
  ('ZT', '2-Year Treasury Note', 'CBOT', 2000, 0.00390625, 7.8125, 880, 800, ARRAY['H', 'M', 'U', 'Z'], 2.00, '$200,000 face value 2-year T-note'),

  -- Agricultural Futures (CBOT)
  ('ZC', 'Corn', 'CBOT', 50, 0.25, 12.50, 1980, 1800, ARRAY['H', 'K', 'N', 'U', 'Z'], 3.00, '5,000 bushels of corn'),
  ('ZS', 'Soybeans', 'CBOT', 50, 0.25, 12.50, 4400, 4000, ARRAY['F', 'H', 'K', 'N', 'Q', 'U', 'X'], 3.00, '5,000 bushels of soybeans'),
  ('ZW', 'Wheat', 'CBOT', 50, 0.25, 12.50, 3300, 3000, ARRAY['H', 'K', 'N', 'U', 'Z'], 3.00, '5,000 bushels of wheat'),

  -- Currency Futures (CME)
  ('6E', 'Euro FX', 'CME', 125000, 0.00005, 6.25, 2750, 2500, ARRAY['H', 'M', 'U', 'Z'], 2.00, '€125,000 EUR/USD'),
  ('6B', 'British Pound', 'CME', 62500, 0.0001, 6.25, 3300, 3000, ARRAY['H', 'M', 'U', 'Z'], 2.00, '£62,500 GBP/USD'),
  ('6J', 'Japanese Yen', 'CME', 12500000, 0.0000005, 6.25, 3850, 3500, ARRAY['H', 'M', 'U', 'Z'], 2.00, '¥12,500,000 JPY/USD'),
  ('6C', 'Canadian Dollar', 'CME', 100000, 0.00005, 5.00, 1650, 1500, ARRAY['H', 'M', 'U', 'Z'], 2.00, 'CAD$100,000 CAD/USD');

-- Notes about contract months:
-- F = January, G = February, H = March, J = April, K = May, M = June
-- N = July, Q = August, U = September, V = October, X = November, Z = December
-- Most liquid contracts trade quarterly: H (March), M (June), U (September), Z (December)

COMMENT ON TABLE futures_contract_specs IS 'Specifications for futures contracts including margin requirements, multipliers, and tick sizes';
COMMENT ON COLUMN futures_contract_specs.symbol IS 'Futures contract symbol (e.g., ES, NQ, CL)';
COMMENT ON COLUMN futures_contract_specs.multiplier IS 'Contract size multiplier - determines position value';
COMMENT ON COLUMN futures_contract_specs.tick_size IS 'Minimum price movement';
COMMENT ON COLUMN futures_contract_specs.tick_value IS 'Dollar value per minimum tick';
COMMENT ON COLUMN futures_contract_specs.contract_months IS 'Array of valid expiration months using CME letter codes';
COMMENT ON COLUMN futures_contract_specs.fees_per_contract IS 'Typical commission per contract (varies by broker)';
