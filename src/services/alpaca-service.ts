/**
 * Alpaca Paper Trading Service
 *
 * Integrates with Alpaca's paper trading API for trading simulation
 */

const APCA_API_BASE_URL = process.env.ALPACA_API_BASE_URL || 'https://paper-api.alpaca.markets';
const APCA_API_KEY = process.env.ALPACA_API_KEY;
const APCA_API_SECRET = process.env.ALPACA_API_SECRET;

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  qty: number;
  limit_price?: number;
  stop_price?: number;
  status: 'pending' | 'filled' | 'partial' | 'cancelled' | 'rejected' | 'expired';
  filled_qty: number;
  filled_avg_price: number;
  filled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AlpacaPosition {
  symbol: string;
  qty: number;
  side: 'long' | 'short';
  market_value: number;
  cost_basis: number;
  unrealized_pl: number;
  unrealized_plpc: number;
  current_price: number;
}

export interface AlpacaAsset {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  asset_class: string;
  status: string;
  tradable: boolean;
}

export interface PlaceOrderParams {
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  type?: 'market' | 'limit' | 'stop' | 'stop_limit';
  limit_price?: number;
  stop_price?: number;
  time_in_force?: 'day' | 'gtc' | 'ioc' | 'fok';
}

class AlpacaService {
  private baseUrl: string;
  private keyId: string | undefined;
  private secretKey: string | undefined;

  constructor() {
    this.baseUrl = APCA_API_BASE_URL;
    this.keyId = APCA_API_KEY;
    this.secretKey = APCA_API_SECRET;
  }

  private getAuthHeaders(): HeadersInit {
    if (!this.keyId || !this.secretKey) {
      throw new Error('Alpaca API credentials not configured');
    }
    return {
      'APCA-API-KEY-ID': this.keyId,
      'APCA-API-SECRET-KEY': this.secretKey,
    };
  }

  async getAccount(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/v2/account`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getAsset(symbol: string): Promise<AlpacaAsset> {
    const response = await fetch(`${this.baseUrl}/v2/assets/${symbol}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getPosition(symbol: string): Promise<AlpacaPosition | null> {
    const response = await fetch(`${this.baseUrl}/v2/positions/${symbol}`, {
      headers: this.getAuthHeaders(),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getAllPositions(): Promise<AlpacaPosition[]> {
    const response = await fetch(`${this.baseUrl}/v2/positions`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.statusText}`);
    }

    return response.json();
  }

  async placeOrder(params: PlaceOrderParams): Promise<AlpacaOrder> {
    const body: any = {
      symbol: params.symbol.toUpperCase(),
      side: params.side,
      type: params.type || 'market',
      qty: params.qty,
      time_in_force: params.time_in_force || 'day',
    };

    if (params.limit_price && (params.type === 'limit' || params.type === 'stop_limit')) {
      body.limit_price = params.limit_price;
    }

    if (params.stop_price && (params.type === 'stop' || params.type === 'stop_limit')) {
      body.stop_price = params.stop_price;
    }

    const response = await fetch(`${this.baseUrl}/v2/orders`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Alpaca API error: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  async getOrder(orderId: string): Promise<AlpacaOrder> {
    const response = await fetch(`${this.baseUrl}/v2/orders/${orderId}`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.statusText}`);
    }

    return response.json();
  }

  async cancelOrder(orderId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v2/orders/${orderId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.statusText}`);
    }
  }

  async cancelAllOrders(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v2/orders`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.statusText}`);
    }
  }

  async getLatestTrade(symbol: string): Promise<{ price: number; timestamp: number }> {
    const response = await fetch(
      `${this.baseUrl}/v2/stocks/${symbol}/trades/latest`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      price: data.p || data.price,
      timestamp: data.t || data.timestamp,
    };
  }

  async getLatestQuote(symbol: string): Promise<{ bid: number; ask: number; timestamp: number }> {
    const response = await fetch(
      `${this.baseUrl}/v2/stocks/${symbol}/quotes/latest`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Alpaca API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      bid: data.bp || data.bid_price,
      ask: data.ap || data.ask_price,
      timestamp: data.t || data.timestamp,
    };
  }
}

// Singleton instance
export const alpacaService = new AlpacaService();
