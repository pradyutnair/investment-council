import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { alpacaService } from '@/src/services/alpaca-service';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tradeId } = await req.json();

    if (!tradeId) {
      return NextResponse.json(
        { error: 'Trade ID is required' },
        { status: 400 }
      );
    }

    // Fetch the trade
    const { data: trade, error: tradeError } = await supabase
      .from('simulated_trades')
      .select('*, research_sessions!inner(user_id)')
      .eq('id', tradeId)
      .single();

    if (tradeError || !trade) {
      return NextResponse.json(
        { error: 'Trade not found' },
        { status: 404 }
      );
    }

    // Verify user owns the trade
    if (trade.research_sessions?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // If no Alpaca order ID, can't sync
    if (!trade.alpaca_order_id) {
      return NextResponse.json(
        { error: 'No Alpaca order ID associated with this trade' },
        { status: 400 }
      );
    }

    // Get latest order status from Alpaca
    const alpacaOrder = await alpacaService.getOrder(trade.alpaca_order_id);

    // Get current price
    let currentPrice: number | undefined;
    try {
      const latestTrade = await alpacaService.getLatestTrade(trade.symbol);
      currentPrice = latestTrade.price;
    } catch {
      // Ignore price fetch errors
    }

    // Update trade record
    const { data: updatedTrade, error: updateError } = await supabase
      .from('simulated_trades')
      .update({
        status: alpacaOrder.status === 'filled' ? 'filled' : alpacaOrder.status,
        filled_price: alpacaOrder.filled_avg_price || trade.filled_price,
        filled_quantity: alpacaOrder.filled_qty || trade.filled_quantity,
        filled_at: alpacaOrder.filled_at || trade.filled_at,
        current_price: currentPrice,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tradeId)
      .select()
      .single();

    if (updateError || !updatedTrade) {
      return NextResponse.json(
        { error: 'Failed to update trade' },
        { status: 500 }
      );
    }

    revalidatePath(`/dashboard/research/${trade.session_id}`);

    return NextResponse.json({
      success: true,
      trade: updatedTrade,
      message: alpacaOrder.status === 'filled'
        ? `Order filled at $${alpacaOrder.filled_avg_price}`
        : `Order updated: ${alpacaOrder.status}`,
    });

  } catch (error) {
    console.error('Sync trade error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to sync trade'
      },
      { status: 500 }
    );
  }
}
