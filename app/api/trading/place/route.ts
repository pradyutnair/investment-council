import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { alpacaService } from '@/src/services/alpaca-service';
import type {
  PlaceTradeRequest,
  PlaceTradeResponse,
  SimulatedTrade
} from '@/src/types/trading';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as PlaceTradeResponse,
        { status: 401 }
      );
    }

    const {
      sessionId,
      symbol,
      side,
      quantity,
      orderType = 'market',
      limitPrice,
      stopPrice,
      investmentThesis
    } = await req.json() as PlaceTradeRequest;

    // Validate input
    if (!sessionId || !symbol || !side || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' } as PlaceTradeResponse,
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be positive' } as PlaceTradeResponse,
        { status: 400 }
      );
    }

    if (!['buy', 'sell'].includes(side)) {
      return NextResponse.json(
        { success: false, error: 'Invalid side' } as PlaceTradeResponse,
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
        { success: false, error: 'Session not found' } as PlaceTradeResponse,
        { status: 404 }
      );
    }

    // Place order with Alpaca
    let alpacaOrder;
    try {
      alpacaOrder = await alpacaService.placeOrder({
        symbol,
        side,
        qty: quantity,
        type: orderType,
        limit_price: limitPrice,
        stop_price: stopPrice,
        time_in_force: 'day',
      });

      // For market orders, poll for fill status (up to 5 seconds)
      if (orderType === 'market' && alpacaOrder.status !== 'filled') {
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          alpacaOrder = await alpacaService.getOrder(alpacaOrder.id);
          if (alpacaOrder.status === 'filled' || alpacaOrder.status === 'partial') {
            break;
          }
        }
      }
    } catch (alpacaError) {
      return NextResponse.json(
        {
          success: false,
          error: alpacaError instanceof Error ? alpacaError.message : 'Failed to place order with Alpaca'
        } as PlaceTradeResponse,
        { status: 500 }
      );
    }

    // Get current price
    let currentPrice: number | undefined;
    try {
      const trade = await alpacaService.getLatestTrade(symbol);
      currentPrice = trade.price;
    } catch {
      // Ignore price fetch errors
    }

    // Insert trade record
    const { data: trade, error: tradeError } = await supabase
      .from('simulated_trades')
      .insert({
        session_id: sessionId,
        symbol: symbol.toUpperCase(),
        side,
        quantity,
        order_type: orderType,
        limit_price: limitPrice,
        stop_price: stopPrice,
        alpaca_order_id: alpacaOrder.id,
        alpaca_client_order_id: alpacaOrder.client_order_id,
        filled_price: alpacaOrder.filled_avg_price || undefined,
        filled_quantity: alpacaOrder.filled_qty || undefined,
        filled_at: alpacaOrder.filled_at || undefined,
        status: alpacaOrder.status === 'filled' ? 'filled' : 'pending',
        current_price: currentPrice,
        investment_thesis: investmentThesis,
      })
      .select()
      .single();

    if (tradeError || !trade) {
      return NextResponse.json(
        { success: false, error: 'Failed to save trade' } as PlaceTradeResponse,
        { status: 500 }
      );
    }

    revalidatePath(`/dashboard/research/${sessionId}`);

    return NextResponse.json({
      success: true,
      trade,
      message: alpacaOrder.status === 'filled'
        ? `Order filled at $${alpacaOrder.filled_avg_price}`
        : `Order placed successfully`,
    } as PlaceTradeResponse);

  } catch (error) {
    console.error('Place trade error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to place trade'
      } as PlaceTradeResponse,
      { status: 500 }
    );
  }
}
