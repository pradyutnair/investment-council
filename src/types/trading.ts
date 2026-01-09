/**
 * Trading Types
 *
 * Types for simulated trades and positions
 */

export type TradeSide = 'buy' | 'sell';
export type TradeStatus = 'pending' | 'filled' | 'partial' | 'cancelled' | 'rejected' | 'expired';
export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit';
export type TimeInForce = 'day' | 'gtc' | 'ioc' | 'fok';

export interface SimulatedTrade {
  id: string;
  session_id: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  order_type: OrderType;
  limit_price?: number;
  stop_price?: number;
  alpaca_order_id?: string;
  alpaca_client_order_id?: string;
  filled_price?: number;
  filled_quantity?: number;
  filled_at?: string;
  status: TradeStatus;
  current_price?: number;
  unrealized_pnl?: number;
  realized_pnl?: number;
  investment_thesis?: string;
  created_at: string;
  updated_at: string;
}

export interface PositionSummary {
  symbol: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  market_value: number;
  cost_basis: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  trades: SimulatedTrade[];
}

export interface PlaceTradeRequest {
  sessionId: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  orderType?: OrderType;
  limitPrice?: number;
  stopPrice?: number;
  investmentThesis?: string;
}

export interface PlaceTradeResponse {
  success: boolean;
  trade?: SimulatedTrade;
  error?: string;
  message?: string;
}

export interface UpdateTradePricesRequest {
  tradeId: string;
  currentPrice: number;
}

export interface UpdateTradePricesResponse {
  success: boolean;
  error?: string;
}

export interface GetTradesResponse {
  trades: SimulatedTrade[];
  positions: PositionSummary[];
}

export interface CancelTradeRequest {
  tradeId: string;
}

export interface CancelTradeResponse {
  success: boolean;
  error?: string;
  message?: string;
}
