import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { alpacaService } from '@/src/services/alpaca-service';
import type {
  SimulatedTrade,
  PositionSummary,
  GetTradesResponse
} from '@/src/types/trading';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Verify user owns the session
    const { data: session, error: sessionError } = await supabase
      .from('research_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Fetch all trades for this session
    const { data: trades, error: tradesError } = await supabase
      .from('simulated_trades')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (tradesError) {
      return NextResponse.json(
        { error: 'Failed to fetch trades' },
        { status: 500 }
      );
    }

    // Update current prices for all trades
    const tradesWithPrices = await Promise.all(
      (trades || []).map(async (trade: SimulatedTrade) => {
        try {
          const latestTrade = await alpacaService.getLatestTrade(trade.symbol);
          const currentPrice = latestTrade.price;

          // Update the trade with current price
          await supabase
            .from('simulated_trades')
            .update({
              current_price: currentPrice,
              updated_at: new Date().toISOString(),
            })
            .eq('id', trade.id);

          return {
            ...trade,
            current_price: currentPrice,
          };
        } catch {
          return trade;
        }
      })
    );

    // Calculate position summaries
    const positionMap = new Map<string, PositionSummary>();

    for (const trade of tradesWithPrices) {
      const symbol = trade.symbol;
      const existing = positionMap.get(symbol);

      if (!existing) {
        positionMap.set(symbol, {
          symbol,
          quantity: trade.side === 'buy' ? trade.filled_quantity || trade.quantity : -(trade.filled_quantity || trade.quantity),
          avg_cost: trade.filled_price || 0,
          current_price: trade.current_price || 0,
          market_value: 0,
          cost_basis: (trade.filled_price || 0) * (trade.filled_quantity || trade.quantity),
          unrealized_pnl: trade.unrealized_pnl || 0,
          unrealized_pnl_pct: 0,
          trades: [trade],
        });
      } else {
        existing.trades.push(trade);
        // Update position metrics
        const qty = trade.filled_quantity || trade.quantity;
        if (trade.side === 'buy') {
          existing.quantity += qty;
          existing.cost_basis += (trade.filled_price || 0) * qty;
        } else {
          existing.quantity -= qty;
          existing.cost_basis -= (trade.filled_price || 0) * qty;
        }

        if (existing.quantity !== 0) {
          existing.avg_cost = existing.cost_basis / Math.abs(existing.quantity);
        }
        existing.current_price = trade.current_price || existing.current_price;
        existing.market_value = existing.quantity * existing.current_price;
        existing.unrealized_pnl = existing.market_value - existing.cost_basis;
        existing.unrealized_pnl_pct = existing.cost_basis !== 0
          ? (existing.unrealized_pnl / existing.cost_basis) * 100
          : 0;
      }
    }

    const positions = Array.from(positionMap.values())
      .filter(p => p.quantity !== 0)
      .sort((a, b) => b.market_value - a.market_value);

    return NextResponse.json({
      trades: tradesWithPrices,
      positions,
    } as GetTradesResponse);

  } catch (error) {
    console.error('Fetch trades error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}
