'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  X,
  Plus,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type SimulatedTrade,
  type PositionSummary,
  type PlaceTradeRequest,
  type TradeSide,
  type OrderType,
} from '@/src/types/trading';
import { cn } from '@/lib/utils';

interface SimulateTabProps {
  sessionId: string;
}

export function SimulateTab({ sessionId }: SimulateTabProps) {
  const [trades, setTrades] = useState<SimulatedTrade[]>([]);
  const [positions, setPositions] = useState<PositionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [syncingTradeId, setSyncingTradeId] = useState<string | null>(null);

  // Form state
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<TradeSide>('buy');
  const [quantity, setQuantity] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [investmentThesis, setInvestmentThesis] = useState('');

  // Show trade form
  const [showTradeForm, setShowTradeForm] = useState(false);

  useEffect(() => {
    fetchTrades();
  }, [sessionId]);

  const fetchTrades = async () => {
    try {
      const response = await fetch(`/api/trading/trades?sessionId=${sessionId}`);
      if (!response.ok) throw new Error('Failed to fetch trades');
      const data = await response.json();
      setTrades(data.trades || []);
      setPositions(data.positions || []);
    } catch (error) {
      console.error('Fetch trades error:', error);
      toast.error('Failed to load trades');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchTrades();
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPlacingOrder(true);

    const request: PlaceTradeRequest = {
      sessionId,
      symbol: symbol.toUpperCase(),
      side,
      quantity: parseInt(quantity, 10),
      orderType,
      limitPrice: limitPrice ? parseFloat(limitPrice) : undefined,
      stopPrice: stopPrice ? parseFloat(stopPrice) : undefined,
      investmentThesis: investmentThesis || undefined,
    };

    try {
      const response = await fetch('/api/trading/place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to place order');
      }

      toast.success(data.message || 'Order placed successfully');

      // Reset form
      setSymbol('');
      setSide('buy');
      setQuantity('');
      setOrderType('market');
      setLimitPrice('');
      setStopPrice('');
      setInvestmentThesis('');
      setShowTradeForm(false);

      // Refresh trades
      await fetchTrades();
    } catch (error) {
      console.error('Place order error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleCancelTrade = async (tradeId: string) => {
    try {
      const response = await fetch('/api/trading/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel trade');
      }

      toast.success(data.message || 'Trade cancelled');
      await fetchTrades();
    } catch (error) {
      console.error('Cancel trade error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel trade');
    }
  };

  const handleSyncTrade = async (tradeId: string) => {
    setSyncingTradeId(tradeId);
    try {
      const response = await fetch('/api/trading/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync trade');
      }

      toast.success(data.message || 'Trade synced');
      await fetchTrades();
    } catch (error) {
      console.error('Sync trade error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sync trade');
    } finally {
      setSyncingTradeId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      filled: { label: 'Filled', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" /> },
      pending: { label: 'Pending', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      cancelled: { label: 'Cancelled', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20', icon: <X className="w-3 h-3" /> },
      partial: { label: 'Partial', className: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: <AlertCircle className="w-3 h-3" /> },
      rejected: { label: 'Rejected', className: 'bg-red-500/10 text-red-600 border-red-500/20', icon: <X className="w-3 h-3" /> },
      expired: { label: 'Expired', className: 'bg-gray-500/10 text-gray-600 border-gray-500/20', icon: <X className="w-3 h-3" /> },
    };

    const { label, className, icon } = config[status] || config.pending;
    return (
      <Badge variant="outline" className={cn("text-xs gap-1", className)}>
        {icon}
        {label}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Loading trades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Left side: Trade Form */}
      <div className="w-96 border-r shrink-0 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Place Trade</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Execute trades based on your research
          </p>
        </div>

        <ScrollArea className="flex-1 p-4">
          {!showTradeForm ? (
            <Button onClick={() => setShowTradeForm(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              New Trade
            </Button>
          ) : (
            <form onSubmit={handlePlaceOrder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  required
                  disabled={isPlacingOrder}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="side">Side</Label>
                <Select value={side} onValueChange={(v) => setSide(v as TradeSide)} disabled={isPlacingOrder}>
                  <SelectTrigger id="side">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  placeholder="100"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  disabled={isPlacingOrder}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orderType">Order Type</Label>
                <Select value={orderType} onValueChange={(v) => setOrderType(v as OrderType)} disabled={isPlacingOrder}>
                  <SelectTrigger id="orderType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market</SelectItem>
                    <SelectItem value="limit">Limit</SelectItem>
                    <SelectItem value="stop">Stop</SelectItem>
                    <SelectItem value="stop_limit">Stop Limit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(orderType === 'limit' || orderType === 'stop_limit') && (
                <div className="space-y-2">
                  <Label htmlFor="limitPrice">Limit Price</Label>
                  <Input
                    id="limitPrice"
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    required={orderType === 'limit' || orderType === 'stop_limit'}
                    disabled={isPlacingOrder}
                  />
                </div>
              )}

              {(orderType === 'stop' || orderType === 'stop_limit') && (
                <div className="space-y-2">
                  <Label htmlFor="stopPrice">Stop Price</Label>
                  <Input
                    id="stopPrice"
                    type="number"
                    step="0.01"
                    placeholder="145.00"
                    value={stopPrice}
                    onChange={(e) => setStopPrice(e.target.value)}
                    required={orderType === 'stop' || orderType === 'stop_limit'}
                    disabled={isPlacingOrder}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="thesis">Investment Thesis (Optional)</Label>
                <Textarea
                  id="thesis"
                  placeholder="Why are you making this trade?"
                  value={investmentThesis}
                  onChange={(e) => setInvestmentThesis(e.target.value)}
                  rows={3}
                  disabled={isPlacingOrder}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isPlacingOrder} className="flex-1">
                  {isPlacingOrder ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Place Order
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowTradeForm(false)}
                  disabled={isPlacingOrder}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </ScrollArea>
      </div>

      {/* Right side: Positions and Trades */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Positions Summary */}
        {positions.length > 0 && (
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-semibold mb-3">Open Positions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {positions.map((position) => (
                <Card key={position.symbol}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{position.symbol}</CardTitle>
                      <Badge variant={position.unrealized_pnl >= 0 ? "default" : "destructive"} className="gap-1">
                        {position.unrealized_pnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {position.unrealized_pnl_pct.toFixed(2)}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity</span>
                      <span className="font-medium">{position.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Cost</span>
                      <span className="font-medium">{formatCurrency(position.avg_cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current</span>
                      <span className="font-medium">{formatCurrency(position.current_price)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">P&L</span>
                      <span className={cn("font-medium", position.unrealized_pnl >= 0 ? "text-emerald-600" : "text-red-600")}>
                        {formatCurrency(position.unrealized_pnl)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Market Value</span>
                      <span className="font-medium">{formatCurrency(position.market_value)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Trade History */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Trade History</h3>
            <p className="text-sm text-muted-foreground">
              All trades placed for this research session
            </p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {trades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No trades yet</p>
                  <p className="text-sm">Place your first trade to get started</p>
                </div>
              ) : (
                trades.map((trade) => (
                  <Card key={trade.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'} className="gap-1">
                            {trade.side === 'buy' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {trade.side.toUpperCase()}
                          </Badge>
                          <span className="font-semibold text-lg">{trade.symbol}</span>
                          <span className="text-muted-foreground">{trade.quantity} shares</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(trade.status)}
                          {trade.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleSyncTrade(trade.id)}
                                disabled={syncingTradeId === trade.id}
                                title="Sync with Alpaca"
                              >
                                {syncingTradeId === trade.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCancelTrade(trade.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Order Type</p>
                          <p className="font-medium">{trade.order_type.toUpperCase()}</p>
                        </div>
                        {trade.filled_price && (
                          <div>
                            <p className="text-muted-foreground">Filled Price</p>
                            <p className="font-medium">{formatCurrency(trade.filled_price)}</p>
                          </div>
                        )}
                        {trade.limit_price && (
                          <div>
                            <p className="text-muted-foreground">Limit Price</p>
                            <p className="font-medium">{formatCurrency(trade.limit_price)}</p>
                          </div>
                        )}
                        {trade.stop_price && (
                          <div>
                            <p className="text-muted-foreground">Stop Price</p>
                            <p className="font-medium">{formatCurrency(trade.stop_price)}</p>
                          </div>
                        )}
                      </div>

                      {trade.current_price && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Current Price</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatCurrency(trade.current_price)}</span>
                              {trade.unrealized_pnl !== undefined && trade.unrealized_pnl !== null && (
                                <Badge variant={trade.unrealized_pnl >= 0 ? 'default' : 'destructive'} className="gap-1">
                                  {trade.unrealized_pnl >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                  {formatCurrency(trade.unrealized_pnl)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {trade.investment_thesis && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-muted-foreground mb-1">Investment Thesis</p>
                          <p className="text-sm">{trade.investment_thesis}</p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-3">
                        {new Date(trade.created_at).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
