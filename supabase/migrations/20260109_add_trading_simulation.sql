-- Migration: Trading Simulation
-- Adds support for paper trading simulation with Alpaca API

-- ============================================================================
-- 1. Create simulated_trades table
-- ============================================================================

CREATE TABLE IF NOT EXISTS simulated_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES research_sessions(id) ON DELETE CASCADE,

  -- Trade details
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity INTEGER NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'market' CHECK (order_type IN ('market', 'limit', 'stop', 'stop_limit')),
  limit_price NUMERIC(12, 4),
  stop_price NUMERIC(12, 4),

  -- Alpaca order tracking
  alpaca_order_id TEXT,
  alpaca_client_order_id TEXT,

  -- Execution details
  filled_price NUMERIC(12, 4),
  filled_quantity INTEGER,
  filled_at TIMESTAMP WITH TIME ZONE,

  -- Trade status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Order submitted, waiting to be filled
    'filled',       -- Order filled successfully
    'partial',      -- Partially filled
    'cancelled',    -- Order cancelled
    'rejected',     -- Order rejected
    'expired'       -- Order expired
  )),

  -- Performance tracking
  current_price NUMERIC(12, 4),
  unrealized_pnl NUMERIC(12, 4),
  realized_pnl NUMERIC(12, 4) DEFAULT 0,

  -- Research context
  investment_thesis TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for simulated_trades
CREATE INDEX IF NOT EXISTS idx_simulated_trades_session_id ON simulated_trades(session_id);
CREATE INDEX IF NOT EXISTS idx_simulated_trades_symbol ON simulated_trades(symbol);
CREATE INDEX IF NOT EXISTS idx_simulated_trades_status ON simulated_trades(status);
CREATE INDEX IF NOT EXISTS idx_simulated_trades_side ON simulated_trades(side);

-- Enable RLS for simulated_trades
ALTER TABLE simulated_trades ENABLE ROW LEVEL SECURITY;

-- RLS Policies for simulated_trades
CREATE POLICY "Users can view trades from own sessions" ON simulated_trades
  FOR SELECT USING (session_id IN (SELECT id FROM research_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can create trades in own sessions" ON simulated_trades
  FOR INSERT WITH CHECK (session_id IN (SELECT id FROM research_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can update trades in own sessions" ON simulated_trades
  FOR UPDATE USING (session_id IN (SELECT id FROM research_sessions WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete trades in own sessions" ON simulated_trades
  FOR DELETE USING (session_id IN (SELECT id FROM research_sessions WHERE user_id = auth.uid()));

-- Trigger to auto-update simulated_trades updated_at
CREATE TRIGGER update_simulated_trades_updated_at
  BEFORE UPDATE ON simulated_trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. Create function to update trade prices and PnL
-- ============================================================================

CREATE OR REPLACE FUNCTION update_trade_prices_and_pnl()
RETURNS TRIGGER AS $$
DECLARE
  v_buy_cost NUMERIC;
  v_sell_value NUMERIC;
BEGIN
  -- For buy orders, unrealized PnL = (current_price - filled_price) * quantity
  -- For sell orders, unrealized PnL = (filled_price - current_price) * quantity
  IF NEW.side = 'buy' AND NEW.filled_price IS NOT NULL AND NEW.current_price IS NOT NULL THEN
    NEW.unrealized_pnl := (NEW.current_price - NEW.filled_price) * NEW.filled_quantity;
  ELSIF NEW.side = 'sell' AND NEW.filled_price IS NOT NULL AND NEW.current_price IS NOT NULL THEN
    NEW.unrealized_pnl := (NEW.filled_price - NEW.current_price) * NEW.filled_quantity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_trade_pnl
  BEFORE UPDATE OF current_price ON simulated_trades
  FOR EACH ROW
  EXECUTE FUNCTION update_trade_prices_and_pnl();
